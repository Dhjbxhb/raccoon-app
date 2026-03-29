"""
Socket.IO Event Handlers for the Raccoon App

Handles all real-time communication including:
- Authentication
- Matching queue management
- Chat messaging with moderation
- WebRTC signaling
- Game events (Raccoon Feud, Truth or Dare)
- Premium feature enforcement
"""

import socketio
import logging
from datetime import datetime, timezone
import uuid
from services.matching_service import matching_queue
from services.auth_service import AuthService
from services.ban_service import ban_service
from services.premium_service import premium_service
from middleware.premium_guard import premium_guard, PremiumFeature
from services.db_service import (
    get_users_collection, 
    get_guests_collection, 
    get_blocked_users_collection, 
    get_messages_collection,
    get_sessions_collection
)
from services.game_service import feud_service, truth_or_dare_service
from services.moderation_service import content_moderator
from services.chat_moderation import filter_message, is_message_allowed

logger = logging.getLogger(__name__)


async def register_socket_handlers(sio: socketio.AsyncServer):
    """Register all Socket.IO event handlers"""
    
    # ============================================
    # CONNECTION HANDLERS
    # ============================================
    
    @sio.event
    async def connect(sid, environ):
        """Handle client connection"""
        logger.info(f"Client connected: {sid}")
        await sio.emit('connected', {'sid': sid}, room=sid)
    
    @sio.event
    async def disconnect(sid):
        """Handle client disconnection - clean up queue and sessions"""
        logger.info(f"Client disconnected: {sid}")
        
        # Get user_id from session
        async with sio.session(sid) as session:
            user_id = session.get('user_id')
            if not user_id:
                return
        
        # Remove from queue if waiting
        matching_queue.remove_from_queue(user_id)
        
        # Check if in active session
        if matching_queue.is_user_in_session(user_id):
            # Get partner socket before ending session
            partner_socket = matching_queue.get_partner_socket(user_id)
            
            # End session with disconnect reason
            result = matching_queue.end_session(user_id, reason='disconnected')
            
            if result:
                # Notify partner
                if partner_socket:
                    await sio.emit('partner_disconnected', {
                        'reason': 'partner_disconnected'
                    }, room=partner_socket)
                
                # Store session end in DB
                sessions = get_sessions_collection()
                await sessions.update_one(
                    {'session_id': result['session_id']},
                    {'$set': {
                        'status': 'ended',
                        'end_time': datetime.now(timezone.utc).isoformat(),
                        'ended_by': user_id,
                        'end_reason': 'disconnected',
                        'duration_seconds': result['duration_seconds'],
                        'message_count': result['message_count']
                    }}
                )
                
                logger.info(f"Session {result['session_id']} ended due to disconnect")
    
    # ============================================
    # AUTHENTICATION
    # ============================================
    
    @sio.event
    async def authenticate(sid, data):
        """Authenticate user with JWT token and check ban status"""
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
            
            # CHECK BAN STATUS - This is critical enforcement
            is_banned, ban_reason, ban_expires = await ban_service.check_ban_status(user_id, is_guest)
            if is_banned:
                await sio.emit('user_banned', {
                    'reason': ban_reason or 'Your account has been banned',
                    'expires_at': ban_expires
                }, room=sid)
                logger.warning(f"Banned user {user_id} attempted to authenticate")
                return
            
            # Store user_id in socket session
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
                
                # Also check and enforce premium expiry
                if user_data:
                    is_premium, tier, expires = await premium_service.check_premium_status(user_id)
                    user_data['premium_status'] = is_premium
                    user_data['premium_tier'] = tier
            
            await sio.emit('authenticated', {
                'user_id': user_id,
                'username': user_data.get('username') if user_data else 'User',
                'is_guest': is_guest,
                'premium_status': user_data.get('premium_status', False) if user_data else False
            }, room=sid)
            
            logger.info(f"User {user_id} authenticated on socket {sid}")
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            await sio.emit('error', {'message': 'Authentication failed'}, room=sid)
    
    # ============================================
    # MATCHING QUEUE
    # ============================================
    
    @sio.event
    async def join_queue(sid, data):
        """Add user to matching queue with ban, premium, and filter enforcement"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                is_guest = session.get('is_guest', False)
                
                if not user_id:
                    await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
                    return
            
            # ENFORCE BAN - Double check ban status before allowing queue join
            is_banned, ban_reason, ban_expires = await ban_service.check_ban_status(user_id, is_guest)
            if is_banned:
                await sio.emit('user_banned', {
                    'reason': ban_reason or 'Your account has been banned',
                    'expires_at': ban_expires
                }, room=sid)
                logger.warning(f"Banned user {user_id} attempted to join queue")
                return
            
            # Prevent joining if already in session
            if matching_queue.is_user_in_session(user_id):
                await sio.emit('error', {'message': 'Already in active session'}, room=sid)
                return
            
            # Get user data
            if is_guest:
                guests = get_guests_collection()
                user_data = await guests.find_one({'guest_id': user_id}, {'_id': 0})
            else:
                users = get_users_collection()
                user_data = await users.find_one({'user_id': user_id}, {'_id': 0})
                
                # Check and enforce premium status (auto-expire if needed)
                if user_data:
                    is_premium, tier, expires = await premium_service.check_premium_status(user_id)
                    user_data['premium_status'] = is_premium
                    user_data['premium_tier'] = tier
            
            if not user_data:
                await sio.emit('error', {'message': 'User not found'}, room=sid)
                return
            
            # Prepare user data for queue
            user_data['socket_id'] = sid
            user_data['is_guest'] = is_guest
            user_data['premium_status'] = user_data.get('premium_status', False)
            
            # Get filters from request
            requested_gender = data.get('gender_filter', 'any')
            requested_country = data.get('country_filter', 'ANY')
            
            # ========== PREMIUM FILTER ENFORCEMENT ==========
            # Backend enforces premium filters - this cannot be bypassed
            
            # Validate gender filter
            gender_allowed, gender_msg, gender_filter = await premium_guard.validate_gender_filter(
                user_id, requested_gender, is_guest
            )
            
            # Validate country filter
            country_allowed, country_msg, country_filter = await premium_guard.validate_country_filter(
                user_id, requested_country, is_guest
            )
            
            # Notify user if filters were downgraded
            filter_warnings = []
            if not gender_allowed:
                filter_warnings.append(gender_msg)
            if not country_allowed:
                filter_warnings.append(country_msg)
            
            if filter_warnings:
                await sio.emit('premium_filter_blocked', {
                    'warnings': filter_warnings,
                    'applied_gender': gender_filter,
                    'applied_country': country_filter,
                    'requested_gender': requested_gender,
                    'requested_country': requested_country
                }, room=sid)
                logger.info(f"User {user_id} filter downgraded: {filter_warnings}")
            
            # Use the validated (potentially downgraded) filters
            effective_gender = gender_filter
            effective_country = country_filter
            
            # ========== END PREMIUM ENFORCEMENT ==========
            
            # Try to match with enforced filters
            match = matching_queue.add_to_queue(user_id, user_data, effective_gender, effective_country)
            
            if match:
                # Match found immediately!
                session_id = match['session_id']
                
                # Store session in DB
                sessions = get_sessions_collection()
                await sessions.insert_one({
                    'session_id': session_id,
                    'user1_id': match['user1']['user_id'],
                    'user2_id': match['user2']['user_id'],
                    'user1_username': match['user1'].get('username', ''),
                    'user2_username': match['user2'].get('username', ''),
                    'user1_is_guest': match['user1'].get('is_guest', False),
                    'user2_is_guest': match['user2'].get('is_guest', False),
                    'user1_country': match['user1'].get('country', ''),
                    'user2_country': match['user2'].get('country', ''),
                    'start_time': match['created_at'],
                    'end_time': None,
                    'status': 'active',
                    'duration_seconds': 0,
                    'message_count': 0,
                    'end_reason': None
                })
                
                # Notify both users
                user1_socket = match['user1']['socket_id']
                user2_socket = match['user2']['socket_id']
                
                await sio.emit('match_found', {
                    'session_id': session_id,
                    'partner': {
                        'user_id': match['user2']['user_id'],
                        'username': match['user2'].get('username'),
                        'gender': match['user2'].get('gender'),
                        'country': match['user2'].get('country'),
                        'country_code': match['user2'].get('country_code'),
                        'is_premium': match['user2'].get('premium', False)
                    }
                }, room=user1_socket)
                
                await sio.emit('match_found', {
                    'session_id': session_id,
                    'partner': {
                        'user_id': match['user1']['user_id'],
                        'username': match['user1'].get('username'),
                        'gender': match['user1'].get('gender'),
                        'country': match['user1'].get('country'),
                        'country_code': match['user1'].get('country_code'),
                        'is_premium': match['user1'].get('premium', False)
                    }
                }, room=user2_socket)
                
                logger.info(f"Match created: {match['user1']['user_id']} <-> {match['user2']['user_id']}")
            else:
                # Added to queue, waiting
                position = matching_queue.get_queue_position(user_id)
                stats = matching_queue.get_queue_stats()
                
                await sio.emit('queue_joined', {
                    'position': position,
                    'message': 'Searching for a match...',
                    'total_waiting': stats['total_waiting'],
                    'applied_filters': {
                        'gender': effective_gender,
                        'country': effective_country
                    }
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
                    removed = matching_queue.remove_from_queue(user_id)
                    await sio.emit('queue_left', {
                        'message': 'Left queue',
                        'was_in_queue': removed
                    }, room=sid)
        except Exception as e:
            logger.error(f"Error leaving queue: {e}")
    
    @sio.event
    async def skip_match(sid):
        """Skip current match"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            partner_socket = matching_queue.get_partner_socket(user_id)
            result = matching_queue.end_session(user_id, reason='skipped')
            
            if result:
                # Notify both users
                await sio.emit('match_ended', {'reason': 'skipped'}, room=sid)
                if partner_socket:
                    await sio.emit('match_ended', {'reason': 'partner_skipped'}, room=partner_socket)
                
                # Update session in DB
                sessions = get_sessions_collection()
                await sessions.update_one(
                    {'session_id': result['session_id']},
                    {'$set': {
                        'status': 'ended',
                        'end_time': datetime.now(timezone.utc).isoformat(),
                        'ended_by': user_id,
                        'end_reason': 'skipped',
                        'duration_seconds': result['duration_seconds'],
                        'message_count': result['message_count']
                    }}
                )
                
                logger.info(f"Match skipped by {user_id}")
        
        except Exception as e:
            logger.error(f"Error skipping match: {e}")
    
    @sio.event
    async def block_user(sid, data):
        """Block a user and end session"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            blocked_id = data.get('blocked_id')
            if not blocked_id:
                return
            
            # Store block in DB
            blocked_users = get_blocked_users_collection()
            await blocked_users.insert_one({
                'blocker_id': user_id,
                'blocked_id': blocked_id,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'reason': data.get('reason', 'User blocked')
            })
            
            # End session
            partner_socket = matching_queue.get_partner_socket(user_id)
            result = matching_queue.end_session(user_id, reason='blocked')
            
            if result:
                await sio.emit('match_ended', {'reason': 'blocked'}, room=sid)
                if partner_socket:
                    await sio.emit('match_ended', {'reason': 'partner_left'}, room=partner_socket)
                
                # Update session in DB
                sessions = get_sessions_collection()
                await sessions.update_one(
                    {'session_id': result['session_id']},
                    {'$set': {
                        'status': 'ended',
                        'end_time': datetime.now(timezone.utc).isoformat(),
                        'ended_by': user_id,
                        'end_reason': 'blocked',
                        'duration_seconds': result['duration_seconds'],
                        'message_count': result['message_count']
                    }}
                )
            
            await sio.emit('user_blocked', {'blocked_id': blocked_id}, room=sid)
            logger.info(f"User {user_id} blocked {blocked_id}")
        
        except Exception as e:
            logger.error(f"Error blocking user: {e}")
    
    # ============================================
    # CHAT MESSAGING - Room-based, persistent, real-time
    # ============================================
    
    @sio.event
    async def send_message(sid, data):
        """
        Send message to partner with content moderation.
        
        FLOW:
        1. Validate sender and session
        2. Apply moderation
        3. Store in MongoDB FIRST
        4. Emit confirmed message to BOTH users in room
        5. Return message_confirmed event with final message data
        """
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    await sio.emit('message_failed', {
                        'temp_id': data.get('temp_id'),
                        'error': 'Not authenticated'
                    }, room=sid)
                    return
            
            content = data.get('content', '').strip()
            temp_id = data.get('temp_id')  # Client-side temporary ID for optimistic UI
            
            if not content:
                await sio.emit('message_failed', {
                    'temp_id': temp_id,
                    'error': 'Empty message'
                }, room=sid)
                return
            
            # Get session FIRST to validate user is in active match
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('message_failed', {
                    'temp_id': temp_id,
                    'error': 'No active session'
                }, room=sid)
                return
            
            room_id = session_data['session_id']
            
            # Apply chat moderation filter
            is_allowed, block_reason = is_message_allowed(content)
            if not is_allowed:
                content = filter_message(content)
                await sio.emit('message_warning', {
                    'reason': 'Your message was filtered for inappropriate content.',
                    'message': 'Please keep the conversation respectful.'
                }, room=sid)
            
            # AI moderation if available
            moderation_result = await content_moderator.moderate(content, user_id, use_ai=True)
            
            if moderation_result.is_flagged:
                if moderation_result.action == "block":
                    await sio.emit('message_failed', {
                        'temp_id': temp_id,
                        'error': 'Message blocked due to policy violation',
                        'reason': moderation_result.reason
                    }, room=sid)
                    logger.warning(f"Message blocked from {user_id}: {moderation_result.reason}")
                    return
                elif moderation_result.action == "warn":
                    await sio.emit('message_warning', {
                        'reason': moderation_result.reason,
                        'message': 'Please be mindful of our community guidelines.'
                    }, room=sid)
            
            # Get sender info
            if session_data['user1']['user_id'] == user_id:
                sender = session_data['user1']
                receiver_id = session_data['user2']['user_id']
            else:
                sender = session_data['user2']
                receiver_id = session_data['user1']['user_id']
            
            # Create message with server-generated ID
            message_id = str(uuid.uuid4())
            timestamp = datetime.now(timezone.utc).isoformat()
            
            # Build the confirmed message object
            confirmed_message = {
                'message_id': message_id,
                'temp_id': temp_id,  # Include temp_id for client reconciliation
                'room_id': room_id,
                'session_id': room_id,
                'sender_id': user_id,
                'sender_username': sender.get('username', 'User'),
                'receiver_id': receiver_id,
                'content': content,
                'timestamp': timestamp,
                'premium': sender.get('premium', False),
                'moderated': moderation_result.is_flagged,
                'status': 'delivered'
            }
            
            # Store in MongoDB FIRST (before emitting)
            messages_collection = get_messages_collection()
            try:
                await messages_collection.insert_one({
                    'message_id': message_id,
                    'session_id': room_id,
                    'sender_id': user_id,
                    'sender_username': sender.get('username', 'User'),
                    'receiver_id': receiver_id,
                    'content': content,
                    'timestamp': timestamp,
                    'moderated': moderation_result.is_flagged,
                    'moderation_data': moderation_result.to_dict() if moderation_result.is_flagged else None,
                    'status': 'delivered'
                })
            except Exception as db_error:
                logger.error(f"Failed to store message in DB: {db_error}")
                await sio.emit('message_failed', {
                    'temp_id': temp_id,
                    'error': 'Failed to save message'
                }, room=sid)
                return
            
            # Add to in-memory session (for quick access)
            matching_queue.add_message(user_id, confirmed_message)
            
            # Get partner socket
            partner_socket = matching_queue.get_partner_socket(user_id)
            
            # Emit to SENDER - message confirmed
            await sio.emit('message_confirmed', confirmed_message, room=sid)
            
            # Emit to RECEIVER - new message
            if partner_socket:
                await sio.emit('receive_message', confirmed_message, room=partner_socket)
            
            logger.debug(f"Message {message_id} sent in room {room_id}: {user_id} -> {receiver_id}")
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            await sio.emit('message_failed', {
                'temp_id': data.get('temp_id') if data else None,
                'error': 'Server error'
            }, room=sid)
    
    @sio.event
    async def fetch_chat_history(sid, data):
        """
        Fetch chat history for current session (reconnection support).
        Called when user reconnects or refreshes while in active match.
        """
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
                    return
            
            # Get active session
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('chat_history', {'messages': [], 'session_id': None}, room=sid)
                return
            
            room_id = session_data['session_id']
            
            # Fetch messages from MongoDB
            messages_collection = get_messages_collection()
            cursor = messages_collection.find(
                {'session_id': room_id},
                {'_id': 0}  # Exclude MongoDB _id
            ).sort('timestamp', 1)  # Oldest first
            
            messages = await cursor.to_list(length=500)  # Max 500 messages
            
            await sio.emit('chat_history', {
                'session_id': room_id,
                'messages': messages
            }, room=sid)
            
            logger.info(f"Sent {len(messages)} messages for session {room_id} to user {user_id}")
            
        except Exception as e:
            logger.error(f"Error fetching chat history: {e}")
            await sio.emit('chat_history', {'messages': [], 'error': str(e)}, room=sid)
    
    @sio.event
    async def rejoin_session(sid, data):
        """
        Rejoin an active session after reconnection.
        Updates socket ID and fetches chat history.
        """
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
                    return
            
            # Check if user has active session
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('session_not_found', {'message': 'No active session'}, room=sid)
                return
            
            # Update socket ID in session
            matching_queue.update_socket_id(user_id, sid)
            
            room_id = session_data['session_id']
            
            # Determine partner
            if session_data['user1']['user_id'] == user_id:
                partner_data = session_data['user2']
            else:
                partner_data = session_data['user1']
            
            # Fetch chat history
            messages_collection = get_messages_collection()
            cursor = messages_collection.find(
                {'session_id': room_id},
                {'_id': 0}
            ).sort('timestamp', 1)
            messages = await cursor.to_list(length=500)
            
            # Send session restored event with all data
            await sio.emit('session_restored', {
                'session_id': room_id,
                'partner': {
                    'user_id': partner_data.get('user_id'),
                    'username': partner_data.get('username'),
                    'gender': partner_data.get('gender'),
                    'country': partner_data.get('country'),
                    'country_code': partner_data.get('country_code'),
                    'is_premium': partner_data.get('premium', False)
                },
                'messages': messages,
                'created_at': session_data.get('created_at')
            }, room=sid)
            
            # Notify partner of reconnection
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('partner_reconnected', {
                    'user_id': user_id
                }, room=partner_socket)
            
            logger.info(f"User {user_id} rejoined session {room_id}")
            
        except Exception as e:
            logger.error(f"Error rejoining session: {e}")
            await sio.emit('error', {'message': 'Failed to rejoin session'}, room=sid)
    
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
    
    # ============================================
    # RACCOON FEUD GAME HANDLERS
    # ============================================
    
    @sio.event
    async def start_feud_game(sid):
        """Start a Raccoon Feud game between matched users - PREMIUM ONLY"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                is_guest = session.get('is_guest', False)
                if not user_id:
                    return
            
            # ========== PREMIUM GAME ENFORCEMENT ==========
            allowed, message = await premium_guard.validate_game_access(user_id, 'Raccoon Feud', is_guest)
            if not allowed:
                await sio.emit('premium_required', {
                    'feature': 'mini_games',
                    'game': 'Raccoon Feud',
                    'message': message
                }, room=sid)
                logger.info(f"Non-premium user {user_id} blocked from starting Feud game")
                return
            # ========== END PREMIUM ENFORCEMENT ==========
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('error', {'message': 'No active match session'}, room=sid)
                return
            
            session_id = session_data['session_id']
            player1_id = session_data['user1']['user_id']
            player2_id = session_data['user2']['user_id']
            player1_username = session_data['user1'].get('username', 'Player 1')
            player2_username = session_data['user2'].get('username', 'Player 2')
            
            # Mark game as active
            matching_queue.set_game_active(user_id, 'feud')
            
            # Create game with usernames
            game = feud_service.create_game(
                session_id, 
                player1_id, 
                player2_id,
                player1_username,
                player2_username
            )
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('feud_game_started', {
                'game_state': game,
                'your_id': player1_id
            }, room=player1_socket)
            
            await sio.emit('feud_game_started', {
                'game_state': game,
                'your_id': player2_id
            }, room=player2_socket)
            
            logger.info(f"Feud game started for session {session_id}: {player1_username} vs {player2_username}")
        
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
            guess = data.get('guess', '').strip()
            
            if not guess:
                await sio.emit('error', {'message': 'Empty guess'}, room=sid)
                return
            
            result = feud_service.submit_guess(session_id, user_id, guess)
            
            if 'error' in result:
                await sio.emit('feud_error', {'message': result['error']}, room=sid)
                return
            
            # Notify both players of the result
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('feud_guess_result', result, room=player1_socket)
            await sio.emit('feud_guess_result', result, room=player2_socket)
            
            # Check if game ended
            if result['game_state']['status'] == 'finished':
                # Save result to DB
                await feud_service.save_game_result(session_id)
                
                # Send game ended event
                await sio.emit('feud_game_ended', {
                    'winner_id': result['game_state']['winner_id'],
                    'winner_username': result['game_state']['winner_username'],
                    'player1_score': result['game_state']['player1_score'],
                    'player2_score': result['game_state']['player2_score'],
                    'game_state': result['game_state']
                }, room=player1_socket)
                
                await sio.emit('feud_game_ended', {
                    'winner_id': result['game_state']['winner_id'],
                    'winner_username': result['game_state']['winner_username'],
                    'player1_score': result['game_state']['player1_score'],
                    'player2_score': result['game_state']['player2_score'],
                    'game_state': result['game_state']
                }, room=player2_socket)
                
                logger.info(f"Feud game ended: {result['game_state']['winner_username']} wins!")
        
        except Exception as e:
            logger.error(f"Error in Feud guess: {e}")
            await sio.emit('error', {'message': 'Failed to process guess'}, room=sid)
    
    @sio.event
    async def end_feud_game(sid):
        """End Feud game early"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            result = feud_service.end_game(session_id)
            
            if result:
                player1_socket = session_data['user1']['socket_id']
                player2_socket = session_data['user2']['socket_id']
                
                await sio.emit('feud_game_ended', {
                    'reason': 'ended_early',
                    'game_state': result
                }, room=player1_socket)
                
                await sio.emit('feud_game_ended', {
                    'reason': 'ended_early', 
                    'game_state': result
                }, room=player2_socket)
        
        except Exception as e:
            logger.error(f"Error ending Feud game: {e}")
    
    # ============================================
    # TRUTH OR DARE GAME HANDLERS
    # ============================================
    
    @sio.event
    async def start_tod_game(sid):
        """Start a Truth or Dare game between matched users - PREMIUM ONLY"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                is_guest = session.get('is_guest', False)
                if not user_id:
                    return
            
            # ========== PREMIUM GAME ENFORCEMENT ==========
            allowed, message = await premium_guard.validate_game_access(user_id, 'Truth or Dare', is_guest)
            if not allowed:
                await sio.emit('premium_required', {
                    'feature': 'mini_games',
                    'game': 'Truth or Dare',
                    'message': message
                }, room=sid)
                logger.info(f"Non-premium user {user_id} blocked from starting ToD game")
                return
            # ========== END PREMIUM ENFORCEMENT ==========
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                await sio.emit('error', {'message': 'No active match session'}, room=sid)
                return
            
            session_id = session_data['session_id']
            player1_id = session_data['user1']['user_id']
            player2_id = session_data['user2']['user_id']
            player1_username = session_data['user1'].get('username', 'Player 1')
            player2_username = session_data['user2'].get('username', 'Player 2')
            
            # Check if another game is active
            if feud_service.has_active_game(session_id):
                await sio.emit('error', {'message': 'Another game is already active'}, room=sid)
                return
            
            # Mark game as active
            matching_queue.set_game_active(user_id, 'tod')
            
            # Create game with usernames
            game = truth_or_dare_service.create_game(
                session_id, 
                player1_id, 
                player2_id,
                player1_username,
                player2_username
            )
            
            if 'error' in game:
                await sio.emit('error', {'message': game['error']}, room=sid)
                return
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('tod_game_started', {
                'game_state': game,
                'your_id': player1_id
            }, room=player1_socket)
            
            await sio.emit('tod_game_started', {
                'game_state': game,
                'your_id': player2_id
            }, room=player2_socket)
            
            logger.info(f"Truth or Dare game started: {player1_username} vs {player2_username}")
        
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
    async def tod_complete_round(sid, data=None):
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
            completed = data.get('completed', True) if data else True
            result = truth_or_dare_service.complete_round(session_id, user_id, completed)
            
            if 'error' in result:
                await sio.emit('tod_error', {'message': result['error']}, room=sid)
                return
            
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('tod_round_complete', result, room=player1_socket)
            await sio.emit('tod_round_complete', result, room=player2_socket)
            
            # Save to DB periodically
            if result['rounds_played'] % 3 == 0:
                await truth_or_dare_service.save_to_db(session_id)
        
        except Exception as e:
            logger.error(f"Error in ToD round complete: {e}")
    
    @sio.event
    async def end_tod_game(sid):
        """End Truth or Dare game"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            
            # Save to DB before ending
            await truth_or_dare_service.save_to_db(session_id)
            
            result = truth_or_dare_service.end_game(session_id)
            
            if result:
                player1_socket = session_data['user1']['socket_id']
                player2_socket = session_data['user2']['socket_id']
                
                await sio.emit('tod_game_ended', {
                    'reason': 'ended',
                    'game_state': result
                }, room=player1_socket)
                
                await sio.emit('tod_game_ended', {
                    'reason': 'ended',
                    'game_state': result
                }, room=player2_socket)
        
        except Exception as e:
            logger.error(f"Error ending ToD game: {e}")
    
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
            
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('webrtc_offer', {
                    'offer': data.get('offer'),
                    'from_user': user_id
                }, room=partner_socket)
                logger.debug(f"WebRTC offer forwarded from {user_id}")
        
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
            
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('webrtc_answer', {
                    'answer': data.get('answer'),
                    'from_user': user_id
                }, room=partner_socket)
                logger.debug(f"WebRTC answer forwarded from {user_id}")
        
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
            
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('webrtc_end_call', {
                    'from_user': user_id
                }, room=partner_socket)
                logger.info(f"WebRTC call ended by {user_id}")
        
        except Exception as e:
            logger.error(f"Error in webrtc_end_call: {e}")
    
    # ============================================
    # UTILITY HANDLERS
    # ============================================
    
    @sio.event
    async def get_queue_stats(sid):
        """Get current queue statistics"""
        try:
            stats = matching_queue.get_queue_stats()
            await sio.emit('queue_stats', stats, room=sid)
        except Exception as e:
            logger.error(f"Error getting queue stats: {e}")
