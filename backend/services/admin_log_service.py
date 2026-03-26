"""
Admin Action Logging Service

Provides centralized logging for all admin actions with database persistence.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, List
from services.db_service import get_database
from models.admin_log import AdminActionType


class AdminLogService:
    """Service for logging and retrieving admin actions"""
    
    @staticmethod
    def get_collection():
        """Get the admin_logs collection"""
        db = get_database()
        return db['admin_logs']
    
    @staticmethod
    async def log_action(
        action_type: AdminActionType,
        admin_id: str,
        admin_username: str,
        target_id: str,
        target_type: str,
        target_username: Optional[str] = None,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """
        Log an admin action to the database
        
        Returns: log_id of the created log entry
        """
        collection = AdminLogService.get_collection()
        
        log_id = str(uuid.uuid4())
        log_entry = {
            'log_id': log_id,
            'action_type': action_type.value if isinstance(action_type, AdminActionType) else action_type,
            'admin_id': admin_id,
            'admin_username': admin_username,
            'target_id': target_id,
            'target_type': target_type,
            'target_username': target_username,
            'details': details or {},
            'ip_address': ip_address,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        await collection.insert_one(log_entry)
        return log_id
    
    @staticmethod
    async def get_logs(
        admin_id: Optional[str] = None,
        target_id: Optional[str] = None,
        action_type: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict:
        """
        Get admin logs with optional filters
        """
        collection = AdminLogService.get_collection()
        
        query = {}
        if admin_id:
            query['admin_id'] = admin_id
        if target_id:
            query['target_id'] = target_id
        if action_type:
            query['action_type'] = action_type
        
        total = await collection.count_documents(query)
        skip = (page - 1) * limit
        
        cursor = collection.find(query, {'_id': 0}).skip(skip).limit(limit).sort('created_at', -1)
        logs = await cursor.to_list(length=limit)
        
        return {
            'logs': logs,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total // limit) + (1 if total % limit else 0)
            }
        }
    
    @staticmethod
    async def get_user_action_history(target_id: str) -> List[Dict]:
        """Get all admin actions taken on a specific user"""
        collection = AdminLogService.get_collection()
        
        cursor = collection.find(
            {'target_id': target_id}, 
            {'_id': 0}
        ).sort('created_at', -1).limit(100)
        
        return await cursor.to_list(length=100)


# Singleton instance
admin_log_service = AdminLogService()
