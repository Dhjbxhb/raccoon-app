"""
Socket.IO Event Handlers for the Raccoon App
PERFORMANCE OPTIMIZED - Target: <100ms game response

Handles all real-time communication including:
- Authentication
- Matching queue management
- Chat messaging with moderation
- WebRTC signaling
- Game events (Raccoon Feud, UNO, Draw & Guess)
- Private Rooms
- Premium feature enforcement
"""

import socketio
import logging
from datetime import datetime, timezone
import uuid
import asyncio
from services.matching_service import matching_queue
from services.auth_service import AuthService
from services.ban_service import ban_service
from services.premium_service import premium_service
from services.stats_service import stats_service
from middleware.premium_guard import premium_guard, PremiumFeature
from services.db_service import (
    get_users_collection, 
    get_guests_collection, 
    get_blocked_users_collection, 
    get_messages_collection,
    get_sessions_collection
)
from services.game_service import feud_service
from services.moderation_service import content_moderator
from services.chat_moderation import filter_message, is_message_allowed
import services.room_service as room_service

# PERFORMANCE: Reduce logging overhead
logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)  # Only warnings and errors


# PERFORMANCE: Async helper for parallel emissions
async def emit_to_both_fast(sio, event, data, socket1, socket2):
    """Emit to both players in parallel for faster delivery"""
    await asyncio.gather(
        sio.emit(event, data, room=socket1),
        sio.emit(event, data, room=socket2)
    )


async def get_active_game_state(session_id: str) -> dict:
    """Get active game state for session (used for reconnection)"""
    from services.uno_service import uno_service
    
    # Check for active UNO game
    uno_game = uno_service.get_game(session_id)
    if uno_game and uno_game.get('status') == 'active':
        return {'game_type': 'uno', 'game_state': uno_game}
    
    # Check for active Feud game
    feud_game = feud_service.get_game(session_id)
    if feud_game and feud_game.get('status') == 'active':
        return {'game_type': 'feud', 'game_state': feud_game}
    
    return None


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
            is_guest = session.get('is_guest', False)
            if not user_id:
                return
        
        # End platform time tracking and persist time
        await stats_service.end_platform_session(user_id, is_guest)
        
        # Remove from queue if waiting
        matching_queue.remove_from_queue(user_id)
        
        # Check if in active session
        if matching_queue.is_user_in_session(user_id):
            # Get partner socket before ending session
            partner_socket = matching_queue.get_partner_socket(user_id)
            
            # End session with disconnect reason
            result = matching_queue.end_session(user_id, reason='disconnected')
            
            if result:
                # End match session and update stats
                await stats_service.end_match_session(user_id, is_guest)
                
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
            
            # Store premium and username in session for later use
            async with sio.session(sid) as session:
                session['username'] = user_data.get('username', 'Player') if user_data else 'Player'
                session['is_premium'] = user_data.get('premium_status', False) if user_data else False
            
            # Start platform time tracking
            stats_service.start_platform_session(user_id)
            
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
    # TIME TRACKING (Heartbeat)
    # ============================================
    
    @sio.event
    async def heartbeat(sid, data=None):
        """
        Process heartbeat from client for time tracking.
        Should be called every 30 seconds by the frontend.
        """
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                is_guest = session.get('is_guest', False)
                
                if not user_id:
                    return
            
            # Process heartbeat and update time
            seconds_added = await stats_service.process_heartbeat(user_id, is_guest)
            
            # Get updated stats
            stats = await stats_service.get_user_stats(user_id, is_guest)
            
            # Send back current stats
            await sio.emit('heartbeat_ack', {
                'success': True,
                'seconds_added': seconds_added,
                'total_time_spent': stats['total_time_spent']
            }, room=sid)
            
        except Exception as e:
            logger.error(f"Heartbeat error: {e}")
    
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
            
            # Update session with latest premium status
            async with sio.session(sid) as session:
                session['username'] = user_data.get('username', 'Player')
                session['is_premium'] = user_data.get('premium_status', False)
            
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
                
                # Start match session tracking for both users
                user1_id = match['user1']['user_id']
                user2_id = match['user2']['user_id']
                stats_service.start_match_session(user1_id)
                stats_service.start_match_session(user2_id)
                
                # Store session in DB
                sessions = get_sessions_collection()
                await sessions.insert_one({
                    'session_id': session_id,
                    'user1_id': user1_id,
                    'user2_id': user2_id,
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
                
                logger.info(f"Match created: {user1_id} <-> {user2_id}")
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
        """Skip current match - fast and reliable"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                is_guest = session.get('is_guest', False)
                if not user_id:
                    logger.warning(f"Skip match called with no user_id for sid {sid}")
                    await sio.emit('skip_failed', {'message': 'Not authenticated'}, room=sid)
                    return
            
            logger.info(f"Skip match requested by user {user_id}")
            
            # Get partner info before ending
            partner_socket = matching_queue.get_partner_socket(user_id)
            partner_id = matching_queue.get_partner_id(user_id)
            partner_is_guest = False
            if partner_id:
                partner_session = matching_queue.get_session(partner_id)
                if partner_session:
                    if partner_session['user1']['user_id'] == partner_id:
                        partner_is_guest = partner_session['user1'].get('is_guest', False)
                    else:
                        partner_is_guest = partner_session['user2'].get('is_guest', False)
            
            result = matching_queue.end_session(user_id, reason='skipped')
            
            if result:
                # End match sessions and update stats for both users
                await stats_service.end_match_session(user_id, is_guest)
                if partner_id:
                    await stats_service.end_match_session(partner_id, partner_is_guest)
                
                # Notify the skipper FIRST with confirmation
                await sio.emit('match_ended', {'reason': 'skipped', 'success': True}, room=sid)
                
                # Notify partner
                if partner_socket:
                    await sio.emit('match_ended', {'reason': 'partner_skipped'}, room=partner_socket)
                
                # Update session in DB (async, don't block)
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
                
                logger.info(f"Match skipped successfully by {user_id}")
            else:
                # No active session but user requested skip - just acknowledge
                logger.warning(f"Skip requested but no active session for user {user_id}")
                await sio.emit('match_ended', {'reason': 'no_session', 'success': True}, room=sid)
        
        except Exception as e:
            logger.error(f"Error skipping match: {e}")
            await sio.emit('skip_failed', {'message': 'Skip failed, please try again'}, room=sid)
    
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
                'created_at': session_data.get('created_at'),
                # Include active game state if any
                'active_game': await get_active_game_state(room_id)
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
                logger.warning(f"No session found for user {user_id} trying to start Feud game")
                await sio.emit('feud_error', {'message': 'No active match session. Please reconnect.'}, room=sid)
                return
            
            session_id = session_data['session_id']
            player1_id = session_data['user1']['user_id']
            player2_id = session_data['user2']['user_id']
            player1_username = session_data['user1'].get('username', 'Player 1')
            player2_username = session_data['user2'].get('username', 'Player 2')
            player1_is_guest = session_data['user1'].get('is_guest', False)
            player2_is_guest = session_data['user2'].get('is_guest', False)
            
            # Increment games_played for both players
            await stats_service.increment_games_played(player1_id, player1_is_guest)
            await stats_service.increment_games_played(player2_id, player2_is_guest)
            
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
            await sio.emit('feud_error', {'message': 'Failed to start game'}, room=sid)
    
    @sio.event
    async def feud_guess(sid, data):
        """Submit a guess in Raccoon Feud"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    logger.warning("Feud guess: No user_id in session")
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                logger.warning(f"Feud guess: No active session for user {user_id}")
                return
            
            session_id = session_data['session_id']
            guess = data.get('guess', '').strip()
            
            if not guess:
                await sio.emit('feud_error', {'message': 'Empty guess'}, room=sid)
                return
            
            logger.info(f"Feud guess: User {user_id} guessed '{guess}' in session {session_id}")
            
            result = feud_service.submit_guess(session_id, user_id, guess)
            
            if 'error' in result:
                logger.warning(f"Feud guess error: {result['error']}")
                await sio.emit('feud_error', {'message': result['error']}, room=sid)
                return
            
            # Notify both players of the result
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            logger.info(f"Feud guess result: correct={result.get('correct')}, points={result.get('points', 0)}, emitting to both players")
            
            await sio.emit('feud_guess_result', result, room=player1_socket)
            await sio.emit('feud_guess_result', result, room=player2_socket)
            
            # Check if round ended (all answers claimed)
            if result.get('round_ended'):
                # End the round
                round_result = feud_service._end_round(
                    feud_service.active_games.get(session_id), 
                    reason='all_claimed'
                )
                await sio.emit('feud_round_ended', round_result, room=player1_socket)
                await sio.emit('feud_round_ended', round_result, room=player2_socket)
                
                if round_result.get('game_over'):
                    await feud_service.save_to_db(session_id)
                    await _emit_feud_game_ended(sio, session_data, round_result)
                    logger.info(f"Feud game ended: {round_result.get('winner_username')} wins!")
            
            # Check if game ended via submit_guess (status change)
            elif result['game_state']['status'] == 'finished':
                # Save result to DB
                await feud_service.save_to_db(session_id)
                
                # Track games won for the winner
                winner_id = result['game_state']['winner_id']
                if winner_id:
                    # Determine if winner is guest
                    winner_is_guest = False
                    if winner_id == session_data['user1']['user_id']:
                        winner_is_guest = session_data['user1'].get('is_guest', False)
                    else:
                        winner_is_guest = session_data['user2'].get('is_guest', False)
                    await stats_service.increment_games_won(winner_id, winner_is_guest)
                
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
    
    @sio.event
    async def feud_skip_round(sid):
        """Skip the current round in Speed Feud"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            result = feud_service.skip_round(session_id)
            
            if 'error' in result:
                await sio.emit('feud_error', {'message': result['error']}, room=sid)
                return
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('feud_round_ended', result, room=player1_socket)
            await sio.emit('feud_round_ended', result, room=player2_socket)
            
            # Check if game ended
            if result.get('game_over'):
                await feud_service.save_to_db(session_id)
                await _emit_feud_game_ended(sio, session_data, result)
            
            logger.info(f"Feud round skipped in session {session_id}")
        
        except Exception as e:
            logger.error(f"Error in feud_skip_round: {e}")
    
    @sio.event
    async def feud_time_up(sid):
        """Handle round timeout in Speed Feud"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            result = feud_service.time_up(session_id)
            
            if 'error' in result:
                return  # Round already ended
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('feud_round_ended', result, room=player1_socket)
            await sio.emit('feud_round_ended', result, room=player2_socket)
            
            # Check if game ended
            if result.get('game_over'):
                await feud_service.save_to_db(session_id)
                await _emit_feud_game_ended(sio, session_data, result)
            
            logger.info(f"Feud round timed out in session {session_id}")
        
        except Exception as e:
            logger.error(f"Error in feud_time_up: {e}")
    
    @sio.event
    async def feud_next_round(sid):
        """Start next round in Speed Feud"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            result = feud_service.next_round(session_id)
            
            if 'error' in result:
                await sio.emit('feud_error', {'message': result['error']}, room=sid)
                return
            
            # Notify both players
            player1_socket = session_data['user1']['socket_id']
            player2_socket = session_data['user2']['socket_id']
            
            await sio.emit('feud_round_started', {
                'round': result['round'],
                'game_state': result['game_state']
            }, room=player1_socket)
            
            await sio.emit('feud_round_started', {
                'round': result['round'],
                'game_state': result['game_state']
            }, room=player2_socket)
            
            logger.info(f"Feud round {result['round']} started in session {session_id}")
        
        except Exception as e:
            logger.error(f"Error in feud_next_round: {e}")
    
    async def _emit_feud_game_ended(sio, session_data, result):
        """Helper to emit feud game ended event"""
        player1_socket = session_data['user1']['socket_id']
        player2_socket = session_data['user2']['socket_id']
        
        # Track games won for the winner
        winner_id = result.get('winner_id')
        if winner_id and winner_id != 'tie':
            winner_is_guest = False
            if winner_id == session_data['user1']['user_id']:
                winner_is_guest = session_data['user1'].get('is_guest', False)
            else:
                winner_is_guest = session_data['user2'].get('is_guest', False)
            await stats_service.increment_games_won(winner_id, winner_is_guest)
        
        game_end_data = {
            'winner_id': result.get('winner_id'),
            'winner_username': result.get('winner_username'),
            'player1_score': result.get('player1_score', 0),
            'player2_score': result.get('player2_score', 0),
            'game_state': result.get('game_state')
        }
        
        await sio.emit('feud_game_ended', game_end_data, room=player1_socket)
        await sio.emit('feud_game_ended', game_end_data, room=player2_socket)
    
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
    # UNO GAME HANDLERS
    # ============================================
    
    from services.uno_service import uno_service
    
    @sio.event
    async def start_uno_game(sid):
        """Start a new UNO game for the current match session"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                is_guest = session.get('is_guest', False)
                is_premium = session.get('is_premium', False)
                
                if not user_id:
                    await sio.emit('uno_error', {'message': 'Not authenticated'}, room=sid)
                    return
            
            # Check premium status from session (already validated during auth)
            # For non-guests, also do a fresh check to ensure subscription hasn't expired
            if not is_guest and not is_premium:
                users_collection = get_users_collection()
                user_data = await users_collection.find_one({'user_id': user_id})
                is_premium = user_data.get('premium_status', False) if user_data else False
            
            if not is_premium:
                await sio.emit('premium_required', {
                    'game': 'UNO',
                    'message': 'Premium subscription required to play UNO'
                }, room=sid)
                return
            
            # Get active session
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                logger.warning(f"No session found for user {user_id} trying to start UNO")
                await sio.emit('uno_error', {'message': 'No active match session. Please reconnect.'}, room=sid)
                return
            
            room_id = session_data['session_id']
            
            # Get both players info
            if session_data['user1']['user_id'] == user_id:
                player1 = session_data['user1']
                player2 = session_data['user2']
            else:
                player1 = session_data['user2']
                player2 = session_data['user1']
            
            # Increment games_played for both players
            player1_is_guest = player1.get('is_guest', False)
            player2_is_guest = player2.get('is_guest', False)
            await stats_service.increment_games_played(player1['user_id'], player1_is_guest)
            await stats_service.increment_games_played(player2['user_id'], player2_is_guest)
            
            # Create UNO game
            uno_service.create_game(
                session_id=room_id,
                player1_id=player1['user_id'],
                player2_id=player2['user_id'],
                player1_username=player1.get('username', 'Player 1'),
                player2_username=player2.get('username', 'Player 2')
            )
            
            # Send game started to both players with their respective hands
            player1_state = uno_service.get_player_state(room_id, player1['user_id'])
            player2_state = uno_service.get_player_state(room_id, player2['user_id'])
            
            # Send to player 1
            player1_socket = matching_queue.get_socket_id(player1['user_id'])
            if player1_socket:
                await sio.emit('uno_game_started', {
                    'game_state': player1_state,
                    'started_by': user_id
                }, room=player1_socket)
            
            # Send to player 2
            player2_socket = matching_queue.get_socket_id(player2['user_id'])
            if player2_socket:
                await sio.emit('uno_game_started', {
                    'game_state': player2_state,
                    'started_by': user_id
                }, room=player2_socket)
            
            logger.info(f"UNO game started in session {room_id} by {user_id}")
            
        except Exception as e:
            logger.error(f"Error starting UNO game: {e}")
            await sio.emit('uno_error', {'message': 'Failed to start game'}, room=sid)
    
    @sio.event
    async def uno_play_card(sid, data):
        """Handle UNO card play"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            room_id = session_data['session_id']
            card_id = data.get('card_id')
            chosen_color = data.get('chosen_color')
            
            result = uno_service.play_card(room_id, user_id, card_id, chosen_color)
            
            if 'error' in result:
                await sio.emit('uno_error', {'message': result['error']}, room=sid)
                return
            
            # Emit updated state to both players
            await _emit_uno_state_to_both(sio, session_data, room_id, 'uno_card_played', {
                'player_id': user_id,
                'card': result['card'],
                'effect': result.get('effect'),
                'new_color': result.get('new_color'),
                'uno_penalty': result.get('uno_penalty', False),
                'penalty_cards': result.get('penalty_cards', 0)
            })
            
            # Check for game over
            game_state = uno_service.get_game(room_id)
            if game_state and game_state['status'] == 'finished':
                # Track games won for winner
                winner_id = game_state.get('winner_id')
                if winner_id:
                    winner_is_guest = False
                    if session_data['user1']['user_id'] == winner_id:
                        winner_is_guest = session_data['user1'].get('is_guest', False)
                    elif session_data['user2']['user_id'] == winner_id:
                        winner_is_guest = session_data['user2'].get('is_guest', False)
                    await stats_service.increment_games_won(winner_id, winner_is_guest)
                
                await _emit_uno_state_to_both(sio, session_data, room_id, 'uno_game_ended', {
                    'winner_id': game_state['winner_id'],
                    'winner_username': game_state['winner_username']
                })
            
        except Exception as e:
            logger.error(f"Error in uno_play_card: {e}")
            await sio.emit('uno_error', {'message': 'Failed to play card'}, room=sid)
    
    @sio.event
    async def uno_draw_card(sid):
        """Handle UNO card draw"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            room_id = session_data['session_id']
            
            result = uno_service.draw_card(room_id, user_id)
            
            if 'error' in result:
                await sio.emit('uno_error', {'message': result['error']}, room=sid)
                return
            
            # Emit updated state to both players
            await _emit_uno_state_to_both(sio, session_data, room_id, 'uno_card_drawn', {
                'player_id': user_id,
                'can_play_drawn': result.get('can_play_drawn', False)
            })
            
        except Exception as e:
            logger.error(f"Error in uno_draw_card: {e}")
            await sio.emit('uno_error', {'message': 'Failed to draw card'}, room=sid)
    
    @sio.event
    async def uno_call_uno(sid):
        """Handle UNO call"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            room_id = session_data['session_id']
            
            result = uno_service.call_uno(room_id, user_id)
            
            if 'error' in result:
                await sio.emit('uno_error', {'message': result['error']}, room=sid)
                return
            
            # Notify both players
            partner_socket = matching_queue.get_partner_socket(user_id)
            
            await sio.emit('uno_called', {
                'player_id': user_id,
                'player_username': result['player_username']
            }, room=sid)
            
            if partner_socket:
                await sio.emit('uno_called', {
                    'player_id': user_id,
                    'player_username': result['player_username']
                }, room=partner_socket)
            
        except Exception as e:
            logger.error(f"Error in uno_call_uno: {e}")
    
    @sio.event
    async def end_uno_game(sid):
        """End the current UNO game"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            room_id = session_data['session_id']
            
            uno_service.end_game(room_id)
            
            # Notify both players
            partner_socket = matching_queue.get_partner_socket(user_id)
            
            await sio.emit('uno_game_ended', {
                'ended_by': user_id,
                'reason': 'quit'
            }, room=sid)
            
            if partner_socket:
                await sio.emit('uno_game_ended', {
                    'ended_by': user_id,
                    'reason': 'quit'
                }, room=partner_socket)
            
            logger.info(f"UNO game ended in session {room_id} by {user_id}")
            
        except Exception as e:
            logger.error(f"Error ending UNO game: {e}")
    
    async def _emit_uno_state_to_both(sio, session_data, room_id, event_name, extra_data=None):
        """Helper to emit UNO state to both players"""
        player1_id = session_data['user1']['user_id']
        player2_id = session_data['user2']['user_id']
        
        player1_state = uno_service.get_player_state(room_id, player1_id)
        player2_state = uno_service.get_player_state(room_id, player2_id)
        
        player1_socket = matching_queue.get_socket_id(player1_id)
        player2_socket = matching_queue.get_socket_id(player2_id)
        
        payload1 = {'game_state': player1_state}
        payload2 = {'game_state': player2_state}
        
        if extra_data:
            payload1.update(extra_data)
            payload2.update(extra_data)
        
        if player1_socket:
            await sio.emit(event_name, payload1, room=player1_socket)
        if player2_socket:
            await sio.emit(event_name, payload2, room=player2_socket)

    
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



    # ============================================
    # PRIVATE ROOM HANDLERS
    # ============================================
    
    @sio.event
    async def create_room(sid, data=None):
        """Create a private room (premium only)"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    await sio.emit('room_error', {'message': 'Not authenticated'}, room=sid)
                    return
                
                username = session.get('username', 'Player')
                is_premium = session.get('is_premium', False)
            
            result = room_service.create_room(user_id, username, is_premium)
            
            if 'error' in result:
                await sio.emit('room_error', {'message': result['error']}, room=sid)
                return
            
            room = result['room']
            room_code = room['code']
            
            # Join socket room
            sio.enter_room(sid, f"room_{room_code}")
            
            await sio.emit('room_created', room, room=sid)
            
        except Exception as e:
            logger.error(f"Error creating room: {e}")
            await sio.emit('room_error', {'message': 'Failed to create room'}, room=sid)
    
    @sio.event
    async def join_room(sid, data):
        """Join a private room by code"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    await sio.emit('room_error', {'message': 'Not authenticated'}, room=sid)
                    return
                
                username = session.get('username', 'Player')
            
            room_code = data.get('code', '').upper()
            if not room_code:
                await sio.emit('room_error', {'message': 'Room code required'}, room=sid)
                return
            
            result = room_service.join_room(room_code, user_id, username)
            
            if 'error' in result:
                await sio.emit('room_error', {'message': result['error']}, room=sid)
                return
            
            room = result['room']
            
            # Join socket room
            sio.enter_room(sid, f"room_{room_code}")
            
            # Notify all room members
            await sio.emit('room_updated', room, room=f"room_{room_code}")
            await sio.emit('player_joined', {
                'player_id': user_id,
                'username': username,
                'room': room
            }, room=f"room_{room_code}")
            
        except Exception as e:
            logger.error(f"Error joining room: {e}")
            await sio.emit('room_error', {'message': 'Failed to join room'}, room=sid)
    
    @sio.event
    async def leave_room(sid, data=None):
        """Leave current room"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    return
            
            room_code = room_service.get_player_room_code(user_id)
            
            if not room_code:
                await sio.emit('room_error', {'message': 'Not in a room'}, room=sid)
                return
            
            result = room_service.leave_room(user_id)
            
            # Leave socket room
            sio.leave_room(sid, f"room_{room_code}")
            
            await sio.emit('room_left', {'success': True}, room=sid)
            
            if not result.get('room_destroyed'):
                # Notify remaining members
                await sio.emit('player_left', {
                    'player_id': user_id,
                    'room': result.get('room')
                }, room=f"room_{room_code}")
                await sio.emit('room_updated', result.get('room'), room=f"room_{room_code}")
            
        except Exception as e:
            logger.error(f"Error leaving room: {e}")
    
    @sio.event
    async def start_room_game(sid, data):
        """Start a game inside the room"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    await sio.emit('room_error', {'message': 'Not authenticated'}, room=sid)
                    return
            
            game_type = data.get('game_type', 'uno')
            room_code = room_service.get_player_room_code(user_id)
            
            if not room_code:
                await sio.emit('room_error', {'message': 'Not in a room'}, room=sid)
                return
            
            result = room_service.start_room_game(room_code, game_type, user_id)
            
            if 'error' in result:
                await sio.emit('room_error', {'message': result['error']}, room=sid)
                return
            
            # Notify all room members
            await sio.emit('room_game_started', {
                'game_type': game_type,
                'room': result['room']
            }, room=f"room_{room_code}")
            
        except Exception as e:
            logger.error(f"Error starting room game: {e}")
            await sio.emit('room_error', {'message': 'Failed to start game'}, room=sid)
    
    @sio.event
    async def end_room_game(sid, data=None):
        """End current game in room"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    return
            
            room_code = room_service.get_player_room_code(user_id)
            
            if not room_code:
                return
            
            result = room_service.end_room_game(room_code)
            
            if 'room' in result:
                await sio.emit('room_game_ended', result['room'], room=f"room_{room_code}")
            
        except Exception as e:
            logger.error(f"Error ending room game: {e}")
    
    @sio.event
    async def start_group_matching(sid, data=None):
        """Start matchmaking for the entire room as a group"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    await sio.emit('room_error', {'message': 'Not authenticated'}, room=sid)
                    return
            
            room_code = room_service.get_player_room_code(user_id)
            
            if not room_code:
                await sio.emit('room_error', {'message': 'Not in a room'}, room=sid)
                return
            
            result = room_service.start_group_matching(room_code, user_id)
            
            if 'error' in result:
                await sio.emit('room_error', {'message': result['error']}, room=sid)
                return
            
            # Notify all room members
            await sio.emit('group_matching_started', {
                'room': result['room'],
                'group_size': result['group_size']
            }, room=f"room_{room_code}")
            
        except Exception as e:
            logger.error(f"Error starting group matching: {e}")
            await sio.emit('room_error', {'message': 'Failed to start matching'}, room=sid)
    
    @sio.event
    async def stop_group_matching(sid, data=None):
        """Stop group matching"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    return
            
            room_code = room_service.get_player_room_code(user_id)
            
            if not room_code:
                return
            
            result = room_service.stop_group_matching(room_code)
            
            if 'room' in result:
                await sio.emit('group_matching_stopped', result['room'], room=f"room_{room_code}")
            
        except Exception as e:
            logger.error(f"Error stopping group matching: {e}")
    
    @sio.event
    async def get_room_state(sid, data=None):
        """Get current room state"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id') or session.get('guest_id')
                if not user_id:
                    return
            
            room = room_service.get_player_room(user_id)
            
            if room:
                await sio.emit('room_state', room_service.get_room_state(room), room=sid)
            else:
                await sio.emit('room_state', None, room=sid)
            
        except Exception as e:
            logger.error(f"Error getting room state: {e}")



    # ============================================
    # DRAW & GUESS GAME HANDLERS
    # ============================================
    
    from services.draw_game_service import draw_game_service
    
    @sio.event
    async def start_draw_game(sid):
        """Start a Draw & Guess game between matched users - PREMIUM ONLY"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                is_guest = session.get('is_guest', False)
                if not user_id:
                    await sio.emit('draw_error', {'message': 'Not authenticated'}, room=sid)
                    return
            
            # ========== PREMIUM GAME ENFORCEMENT ==========
            allowed, message = await premium_guard.validate_game_access(user_id, 'Draw & Guess', is_guest)
            if not allowed:
                await sio.emit('premium_required', {
                    'feature': 'mini_games',
                    'game': 'Draw & Guess',
                    'message': message
                }, room=sid)
                logger.info(f"Non-premium user {user_id} blocked from starting Draw game")
                return
            # ========== END PREMIUM ENFORCEMENT ==========
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                logger.warning(f"No session found for user {user_id} trying to start Draw game")
                await sio.emit('draw_error', {'message': 'No active match session. Please reconnect.'}, room=sid)
                return
            
            session_id = session_data['session_id']
            
            # Build players list
            players = [
                {
                    'user_id': session_data['user1']['user_id'],
                    'username': session_data['user1'].get('username', 'Player 1'),
                    'socket_id': session_data['user1']['socket_id']
                },
                {
                    'user_id': session_data['user2']['user_id'],
                    'username': session_data['user2'].get('username', 'Player 2'),
                    'socket_id': session_data['user2']['socket_id']
                }
            ]
            
            # Increment games_played for both players
            player1_is_guest = session_data['user1'].get('is_guest', False)
            player2_is_guest = session_data['user2'].get('is_guest', False)
            await stats_service.increment_games_played(players[0]['user_id'], player1_is_guest)
            await stats_service.increment_games_played(players[1]['user_id'], player2_is_guest)
            
            # Create game
            game = draw_game_service.create_game(session_id, players)
            
            if 'error' in game:
                await sio.emit('draw_error', {'message': game['error']}, room=sid)
                return
            
            # Send game started to both players with their respective states
            for player in players:
                player_state = draw_game_service.get_player_state(session_id, player['user_id'])
                player_socket = matching_queue.get_socket_id(player['user_id'])
                if player_socket:
                    await sio.emit('draw_game_started', {
                        'game_state': player_state,
                        'started_by': user_id
                    }, room=player_socket)
            
            logger.info(f"Draw & Guess game started for session {session_id}")
            
        except Exception as e:
            logger.error(f"Error starting Draw game: {e}")
            await sio.emit('draw_error', {'message': 'Failed to start game'}, room=sid)
    
    @sio.event
    async def draw_stroke(sid, data):
        """Handle drawing stroke from drawer - broadcast to all players"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            stroke_data = data.get('stroke', {})
            
            result = draw_game_service.add_stroke(session_id, user_id, stroke_data)
            
            if 'error' in result:
                await sio.emit('draw_error', {'message': result['error']}, room=sid)
                return
            
            # Broadcast stroke to partner (drawer already has it locally)
            partner_socket = matching_queue.get_partner_socket(user_id)
            if partner_socket:
                await sio.emit('draw_stroke_received', {
                    'stroke': result['stroke']
                }, room=partner_socket)
            
        except Exception as e:
            logger.error(f"Error in draw_stroke: {e}")
    
    @sio.event
    async def draw_undo(sid):
        """Handle undo action from drawer"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            
            result = draw_game_service.undo_stroke(session_id, user_id)
            
            if 'error' in result:
                await sio.emit('draw_error', {'message': result['error']}, room=sid)
                return
            
            # Broadcast undo to all players
            await _emit_to_both_players(sio, session_data, 'draw_undo', {
                'removed_stroke_id': result.get('removed_stroke_id')
            })
            
        except Exception as e:
            logger.error(f"Error in draw_undo: {e}")
    
    @sio.event
    async def draw_clear(sid):
        """Handle clear canvas action from drawer"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            
            result = draw_game_service.clear_canvas(session_id, user_id)
            
            if 'error' in result:
                await sio.emit('draw_error', {'message': result['error']}, room=sid)
                return
            
            # Broadcast clear to all players
            await _emit_to_both_players(sio, session_data, 'draw_canvas_cleared', {})
            
        except Exception as e:
            logger.error(f"Error in draw_clear: {e}")
    
    @sio.event
    async def draw_guess(sid, data):
        """Handle guess submission"""
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
                await sio.emit('draw_error', {'message': 'Empty guess'}, room=sid)
                return
            
            result = draw_game_service.submit_guess(session_id, user_id, guess)
            
            if 'error' in result:
                await sio.emit('draw_error', {'message': result['error']}, room=sid)
                return
            
            # Emit guess result to all players
            await _emit_draw_state_to_both(sio, session_data, session_id, 'draw_guess_result', {
                'player_id': result['player_id'],
                'player_username': result.get('player_username'),
                'guess': result['guess'],
                'correct': result['correct'],
                'points_earned': result['points_earned'],
                'scores': result['scores']
            })
            
            # Check if round ended
            if result.get('round_complete'):
                await _emit_draw_state_to_both(sio, session_data, session_id, 'draw_round_ended', {
                    'reason': result.get('reason', 'all_guessed'),
                    'word': draw_game_service.active_games[session_id]['current_word'],
                    'scores': result['scores']
                })
            
        except Exception as e:
            logger.error(f"Error in draw_guess: {e}")
            await sio.emit('draw_error', {'message': 'Failed to process guess'}, room=sid)
    
    @sio.event
    async def draw_skip_turn(sid):
        """Drawer skips their turn"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            
            result = draw_game_service.skip_turn(session_id, user_id)
            
            if 'error' in result:
                await sio.emit('draw_error', {'message': result['error']}, room=sid)
                return
            
            # Emit round ended to all players
            await _emit_draw_state_to_both(sio, session_data, session_id, 'draw_round_ended', {
                'reason': 'skipped',
                'word': result.get('word'),
                'scores': result.get('scores', {})
            })
            
            # Check if game is over
            if result.get('game_over'):
                await _emit_draw_game_ended(sio, session_data, result)
            
        except Exception as e:
            logger.error(f"Error in draw_skip_turn: {e}")
    
    @sio.event
    async def draw_next_round(sid):
        """Start the next round"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            
            result = draw_game_service.next_round(session_id)
            
            if 'error' in result:
                await sio.emit('draw_error', {'message': result['error']}, room=sid)
                return
            
            # Send updated state to both players
            for player_id in [session_data['user1']['user_id'], session_data['user2']['user_id']]:
                player_state = draw_game_service.get_player_state(session_id, player_id)
                player_socket = matching_queue.get_socket_id(player_id)
                if player_socket:
                    await sio.emit('draw_round_started', {
                        'round': result['round'],
                        'drawer_id': result['drawer_id'],
                        'game_state': player_state
                    }, room=player_socket)
            
            logger.info(f"Draw & Guess round {result['round']} started in session {session_id}")
            
        except Exception as e:
            logger.error(f"Error in draw_next_round: {e}")
    
    @sio.event
    async def draw_time_up(sid):
        """Handle round timeout"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            
            # Only process if game is still active
            game = draw_game_service.get_game(session_id)
            if not game or not game.get('round_active'):
                return
            
            result = draw_game_service.end_round(session_id, reason='timeout')
            
            if 'error' in result:
                return
            
            # Emit round ended to all players
            await _emit_draw_state_to_both(sio, session_data, session_id, 'draw_round_ended', {
                'reason': 'timeout',
                'word': result.get('word'),
                'scores': result.get('scores', {})
            })
            
            # Check if game is over
            if result.get('game_over'):
                await _emit_draw_game_ended(sio, session_data, result)
            
        except Exception as e:
            logger.error(f"Error in draw_time_up: {e}")
    
    @sio.event
    async def end_draw_game(sid):
        """End the Draw & Guess game early"""
        try:
            async with sio.session(sid) as session:
                user_id = session.get('user_id')
                if not user_id:
                    return
            
            session_data = matching_queue.get_session(user_id)
            if not session_data:
                return
            
            session_id = session_data['session_id']
            
            draw_game_service.end_game(session_id)
            
            # Notify both players
            await _emit_to_both_players(sio, session_data, 'draw_game_ended', {
                'ended_by': user_id,
                'reason': 'quit'
            })
            
            logger.info(f"Draw & Guess game ended in session {session_id} by {user_id}")
            
        except Exception as e:
            logger.error(f"Error ending Draw game: {e}")
    
    async def _emit_to_both_players(sio, session_data, event_name, data):
        """Helper to emit event to both players"""
        player1_socket = matching_queue.get_socket_id(session_data['user1']['user_id'])
        player2_socket = matching_queue.get_socket_id(session_data['user2']['user_id'])
        
        if player1_socket:
            await sio.emit(event_name, data, room=player1_socket)
        if player2_socket:
            await sio.emit(event_name, data, room=player2_socket)
    
    async def _emit_draw_state_to_both(sio, session_data, session_id, event_name, extra_data=None):
        """Helper to emit Draw game state to both players"""
        player1_id = session_data['user1']['user_id']
        player2_id = session_data['user2']['user_id']
        
        player1_state = draw_game_service.get_player_state(session_id, player1_id)
        player2_state = draw_game_service.get_player_state(session_id, player2_id)
        
        player1_socket = matching_queue.get_socket_id(player1_id)
        player2_socket = matching_queue.get_socket_id(player2_id)
        
        payload1 = {'game_state': player1_state}
        payload2 = {'game_state': player2_state}
        
        if extra_data:
            payload1.update(extra_data)
            payload2.update(extra_data)
        
        if player1_socket:
            await sio.emit(event_name, payload1, room=player1_socket)
        if player2_socket:
            await sio.emit(event_name, payload2, room=player2_socket)
    
    async def _emit_draw_game_ended(sio, session_data, result):
        """Helper to emit game ended event"""
        player1_socket = matching_queue.get_socket_id(session_data['user1']['user_id'])
        player2_socket = matching_queue.get_socket_id(session_data['user2']['user_id'])
        
        # Track games won for winner
        winner_id = result.get('winner_id')
        if winner_id:
            winner_is_guest = False
            if session_data['user1']['user_id'] == winner_id:
                winner_is_guest = session_data['user1'].get('is_guest', False)
            elif session_data['user2']['user_id'] == winner_id:
                winner_is_guest = session_data['user2'].get('is_guest', False)
            await stats_service.increment_games_won(winner_id, winner_is_guest)
        
        game_end_data = {
            'winner_id': result.get('winner_id'),
            'winner_username': result.get('winner_username'),
            'final_scores': result.get('final_scores', {}),
            'reason': 'complete'
        }
        
        if player1_socket:
            await sio.emit('draw_game_ended', game_end_data, room=player1_socket)
        if player2_socket:
            await sio.emit('draw_game_ended', game_end_data, room=player2_socket)
