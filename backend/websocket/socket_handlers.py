import socketio
import logging
from services.matching_service import matching_queue
from services.auth_service import AuthService
from services.db_service import get_users_collection, get_guests_collection, get_blocked_users_collection, get_messages_collection, get_matches_collection
from services.game_service import feud_service, truth_or_dare_service
from services.moderation_service import content_moderator
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

async def register_socket_handlers(sio: socketio.AsyncServer):
    """Register all Socket.IO event handlers"""
    
    @sio.event
    async def connect(sid, environ):
        """Handle client connection"""
        logger.info(f"Client connected: {sid}")
        await sio.emit('connected', {'sid': sid}, room=sid)
    
    @sio.event
    async def disconnect(sid):
        """Handle client disconnection"""
        logger.info(f"Client disconnected: {sid}")
        
        # Get user_id from session (if authenticated)
        async with sio.session(sid) as session:
            user_id = session.get('user_id')
            if user_id:
                # Remove from queue if waiting
                matching_queue.remove_from_queue(user_id)
                
                # Notify partner if in active session
                partner_socket = matching_queue.get_partner_socket(user_id)
                if partner_socket:
                    await sio.emit('partner_disconnected', room=partner_socket)
                
                # End session
                result = matching_queue.end_session(user_id)
                if result:
                    # Store match end in DB
                    matches = get_matches_collection()
                    await matches.update_one(
                        {'session_id': result['session_id']},
                        {'$set': {
                            'ended_at': datetime.now(timezone.utc).isoformat(),
                            'duration_seconds': (datetime.now(timezone.utc) - datetime.fromisoformat(result['session']['created_at'])).seconds
                        }}
                    )
    
    @sio.event
    async def authenticate(sid, data):
        """Authenticate user with JWT token"""
        try:
            token = data.get('token')
            if not token:
                await sio.emit('error', {'message': 'No token provided'}, room=sid)
                return
            
            payload = AuthService.decode_token(token)
            if not payload:
                await sio.emit('error', {'message': 'Invalid token'}, room=sid)
                return
            
            user_id = payload['user_id']
            is_guest = payload.get('is_guest', False)
            
            # Store user_id in session
            async with sio.session(sid) as session:
                session['user_id'] = user_id
                session['is_guest'] = is_guest
            
            # Get user data
            if is_guest:
                guests = get_guests_collection()
                user_data = await guests.find_one({'guest_id': user_id}, {'_id': 0})
            else:
                users = get_users_collection()
                user_data = await users.find_one({'user_id': user_id}, {'_id': 0})
            
            await sio.emit('authenticated', {
                'user_id': user_id,
                'username': user_data.get('username'),
                'is_guest': is_guest
            }, room=sid)
            
            logger.info(f"User {user_id} authenticated on socket {sid}")
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            await sio.emit('error', {'message': 'Authentication failed'}, room=sid)
    
    @sio.event
    async def join_queue(sid, data):
        """Add user to matching queue"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
                    return
                
                is_guest = session.get('is_guest', False)
            
            # Get user data
            if is_guest:
                guests = get_guests_collection()
                user_data = await guests.find_one({'guest_id': user_id}, {'_id': 0})
            else:
                users = get_users_collection()
                user_data = await users.find_one({'user_id': user_id}, {'_id': 0})
            
            if not user_data:
                await sio.emit('error', {'message': 'User not found'}, room=sid)
                return
            
            # Add socket ID to user data
            user_data['socket_id'] = sid
            user_data['premium'] = user_data.get('premium_status', False)
            
            gender_filter = data.get('gender_filter', 'any')
            country_filter = data.get('country_filter', 'ANY')
            
            # Try to match
            match = matching_queue.add_to_queue(user_id, user_data, gender_filter, country_filter)
            
            if match:
                # Match found immediately!
                session_id = match['session_id']
                
                # Store match in DB
                matches = get_matches_collection()
                await matches.insert_one({
                    'session_id': session_id,
                    'user1_id': match['user1']['user_id'],
                    'user2_id': match['user2']['user_id'],
                    'created_at': match['created_at'],
                    'ended_at': None
                })
                
                # Notify both users
                user1_socket = match['user1']['socket_id']
                user2_socket = match['user2']['socket_id']
                
                await sio.emit('match_found', {
                    'session_id': session_id,
                    'partner': match['user2']
                }, room=user1_socket)
                
                await sio.emit('match_found', {
                    'session_id': session_id,
                    'partner': match['user1']
                }, room=user2_socket)
                
                logger.info(f"Match created: {match['user1']['user_id']} <-> {match['user2']['user_id']}")
            else:
                # Added to queue, waiting
                position = matching_queue.get_queue_position(user_id)
                await sio.emit('queue_joined', {
                    'position': position,
                    'message': 'Searching for a match...'
                }, room=sid)
        
        except Exception as e:
            logger.error(f"Error joining queue: {e}")
            await sio.emit('error', {'message': 'Failed to join queue'}, room=sid)
    
    @sio.event
    async def leave_queue(sid):
        """Remove user from queue"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if user_id:
                    matching_queue.remove_from_queue(user_id)
                    await sio.emit('queue_left', {'message': 'Left queue'}, room=sid)
        except Exception as e:
            logger.error(f"Error leaving queue: {e}")
    
    @sio.event
    async def send_message(sid, data):
        """Send message to partner"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            content = data.get('content', '').strip()
            if not content:
                return
            
            # Moderate content
            moderation_result = await content_moderator.moderate(content, user_id, use_ai=True)
            
            if moderation_result.is_flagged:
                if moderation_result.action == "block":
                    await sio.emit('message_blocked', {
                        'reason': moderation_result.reason,
                        'message': 'Your message was blocked due to policy violation.'
                    }, room=sid)
                    logger.warning(f"Message blocked from {user_id}: {moderation_result.reason}")
                    return
                elif moderation_result.action == "warn":
                    await sio.emit('message_warning', {
                        'reason': moderation_result.reason,
                        'message': 'Please be mindful of our community guidelines.'
                    }, room=sid)
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('error', {'message': 'No active session'}, room=sid)
                return
            
            # Get sender info
            if session_data['user1']['user_id'] == user_id:
                sender = session_data['user1']
            else:
                sender = session_data['user2']
            
            # Create message
            message_id = str(uuid.uuid4())
            message = {
                'message_id': message_id,
                'sender_id': user_id,
                'sender_username': sender['username'],
                'content': content,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'premium': sender['premium'],
                'moderated': moderation_result.is_flagged
            }
            
            # Store message in session
            session_data['messages'].append(message)
            
            # Store in DB
            messages = get_messages_collection()
            await messages.insert_one({
                'message_id': message_id,
                'session_id': session_data['session_id'],
                'sender_id': user_id,
                'content': content,
                'timestamp': message['timestamp'],
                'moderation': moderation_result.to_dict() if moderation_result.is_flagged else None
            })
            
            # Send to both users
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('receive_message', message, room=partner_socket)
            await sio.emit('receive_message', message, room=sid)
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
    
    @sio.event
    async def typing_start(sid):
        """Notify partner that user is typing"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('partner_typing', room=partner_socket)
        except Exception as e:
            logger.error(f"Error in typing_start: {e}")
    
    @sio.event
    async def typing_stop(sid):
        """Notify partner that user stopped typing"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('partner_stopped_typing', room=partner_socket)
        except Exception as e:
            logger.error(f"Error in typing_stop: {e}")
    
    @sio.event
    async def skip_match(sid):
        """Skip current match"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            partner_socket = matching_queue.get_partner_socket(user_id)
            result = matching_queue.end_session(user_id)
            
            if result:
                # Notify both users
                await sio.emit('match_ended', {'reason': 'skipped'}, room=sid)
                if partner_socket:
                    await sio.emit('match_ended', {'reason': 'partner_skipped'}, room=partner_socket)
                
                # Store match end in DB
                matches = get_matches_collection()
                await matches.update_one(
                    {'session_id': result['session_id']},
                    {'$set': {
                        'ended_at': datetime.now(timezone.utc).isoformat(),
                        'end_reason': 'skipped'
                    }}
                )
                
                logger.info(f"Match skipped by {user_id}")
        
        except Exception as e:
            logger.error(f"Error skipping match: {e}")
    
    @sio.event
    async def block_user(sid, data):
        """Block a user"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            blocked_id = data.get('blocked_id')
            if not blocked_id:
                return
            
            # Store in DB
            blocked_users = get_blocked_users_collection()
            await blocked_users.insert_one({
                'blocker_id': user_id,
                'blocked_id': blocked_id,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'reason': 'User blocked'
            })
            
            # End session
            partner_socket = matching_queue.get_partner_socket(user_id)
            result = matching_queue.end_session(user_id)
            
            if result:
                await sio.emit('match_ended', {'reason': 'blocked'}, room=sid)
                if partner_socket:
                    await sio.emit('match_ended', {'reason': 'partner_left'}, room=partner_socket)
            
            await sio.emit('user_blocked', {'blocked_id': blocked_id}, room=sid)
            logger.info(f"User {user_id} blocked {blocked_id}")
        
        except Exception as e:
            logger.error(f"Error blocking user: {e}")

    # ============================================
    # RACCOON FEUD GAME HANDLERS
    # ============================================
    
    @sio.event
    async def start_feud_game(sid):
        """Start a Raccoon Feud game"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('error', {'message': 'No active match session'}, room=sid)
                return
            
            session_id = session_data['session_id']
            player1_id = session_data['user1']['user_id']
            player2_id = session_data['user2']['user_id']
            
            # Create game
            game = feud_service.create_game(session_id, player1_id, player2_id)
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('feud_game_started', {'game_state': game}, room=player1_socket)
            await sio.emit('feud_game_started', {'game_state': game}, room=player2_socket)
            
            logger.info(f"Feud game started for session {session_id}")
        
        except Exception as e:
            logger.error(f"Error starting Feud game: {e}")
            await sio.emit('error', {'message': 'Failed to start game'}, room=sid)
    
    @sio.event
    async def feud_guess(sid, data):
        """Submit a guess in Raccoon Feud"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            guess = data.get('guess', '')
            
            result = feud_service.submit_guess(session_id, user_id, guess)
            
            if 'error' in result:
                await sio.emit('error', {'message': result['error']}, room=sid)
                return
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('feud_guess_result', result, room=player1_socket)
            await sio.emit('feud_guess_result', result, room=player2_socket)
            
            # Check if game ended
            if result['game_state']['status'] == 'finished':
                await sio.emit('feud_game_ended', result, room=player1_socket)
                await sio.emit('feud_game_ended', result, room=player2_socket)
        
        except Exception as e:
            logger.error(f"Error in Feud guess: {e}")

    # ============================================
    # TRUTH OR DARE GAME HANDLERS
    # ============================================
    
    @sio.event
    async def start_tod_game(sid):
        """Start a Truth or Dare game"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('error', {'message': 'No active match session'}, room=sid)
                return
            
            session_id = session_data['session_id']
            player1_id = session_data['user1']['user_id']
            player2_id = session_data['user2']['user_id']
            
            # Create game
            game = truth_or_dare_service.create_game(session_id, player1_id, player2_id)
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('tod_game_started', {'game_state': game}, room=player1_socket)
            await sio.emit('tod_game_started', {'game_state': game}, room=player2_socket)
            
            logger.info(f"Truth or Dare game started for session {session_id}")
        
        except Exception as e:
            logger.error(f"Error starting ToD game: {e}")
            await sio.emit('error', {'message': 'Failed to start game'}, room=sid)
    
    @sio.event
    async def tod_spin_bottle(sid):
        """Spin the bottle in Truth or Dare"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            result = truth_or_dare_service.spin_bottle(session_id, user_id)
            
            if 'error' in result:
                await sio.emit('error', {'message': result['error']}, room=sid)
                return
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('tod_spin_result', result, room=player1_socket)
            await sio.emit('tod_spin_result', result, room=player2_socket)
        
        except Exception as e:
            logger.error(f"Error in ToD spin: {e}")
    
    @sio.event
    async def tod_choose(sid, data):
        """Choose truth or dare"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            choice = data.get('choice')
            
            result = truth_or_dare_service.choose_truth_or_dare(session_id, user_id, choice)
            
            if 'error' in result:
                await sio.emit('error', {'message': result['error']}, room=sid)
                return
            
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('tod_choice_made', result, room=player1_socket)
            await sio.emit('tod_choice_made', result, room=player2_socket)
        
        except Exception as e:
            logger.error(f"Error in ToD choice: {e}")
    
    @sio.event
    async def tod_submit_question(sid, data):
        """Submit truth/dare question"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            question = data.get('question')
            
            result = truth_or_dare_service.submit_question(session_id, user_id, question)
            
            if 'error' in result:
                await sio.emit('error', {'message': result['error']}, room=sid)
                return
            
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('tod_question_submitted', result, room=player1_socket)
            await sio.emit('tod_question_submitted', result, room=player2_socket)
        
        except Exception as e:
            logger.error(f"Error in ToD question: {e}")
    
    @sio.event
    async def tod_complete_round(sid):
        """Complete current round"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            result = truth_or_dare_service.complete_round(session_id, user_id)
            
            if 'error' in result:
                await sio.emit('error', {'message': result['error']}, room=sid)
                return
            
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('tod_round_complete', result, room=player1_socket)
            await sio.emit('tod_round_complete', result, room=player2_socket)
        
        except Exception as e:
            logger.error(f"Error in ToD round complete: {e}")

    # ============================================
    # WEBRTC SIGNALING HANDLERS
    # ============================================
    
    @sio.event
    async def webrtc_offer(sid, data):
        """Handle WebRTC offer"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            # Forward offer to partner
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('webrtc_offer', {
                    'offer': data.get('offer'),
                    'from_user': user_id
                }, room=partner_socket)
                logger.info(f"WebRTC offer forwarded from {user_id}")
        
        except Exception as e:
            logger.error(f"Error in webrtc_offer: {e}")
    
    @sio.event
    async def webrtc_answer(sid, data):
        """Handle WebRTC answer"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            # Forward answer to partner
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('webrtc_answer', {
                    'answer': data.get('answer'),
                    'from_user': user_id
                }, room=partner_socket)
                logger.info(f"WebRTC answer forwarded from {user_id}")
        
        except Exception as e:
            logger.error(f"Error in webrtc_answer: {e}")
    
    @sio.event
    async def webrtc_ice_candidate(sid, data):
        """Handle WebRTC ICE candidate"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            # Forward ICE candidate to partner
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('webrtc_ice_candidate', {
                    'candidate': data.get('candidate'),
                    'from_user': user_id
                }, room=partner_socket)
        
        except Exception as e:
            logger.error(f"Error in webrtc_ice_candidate: {e}")
    
    @sio.event
    async def webrtc_end_call(sid, data):
        """Handle WebRTC call end"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            # Notify partner that call ended
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('webrtc_end_call', {
                    'from_user': user_id
                }, room=partner_socket)
                logger.info(f"WebRTC call ended by {user_id}")
        
        except Exception as e:
            logger.error(f"Error in webrtc_end_call: {e}")

