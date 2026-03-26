"""
Raccoon Feud Question Model - MongoDB schema for reusable question content
"""
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
import uuid


class FeudAnswerSchema(BaseModel):
    """Single answer in a Feud question"""
    answer_text: str
    points: int
    alt_answers: List[str] = []  # Alternative accepted answers


class FeudQuestion(BaseModel):
    """
    Reusable Feud question stored in database
    Supports multiple valid answers with scoring
    """
    question_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question_text: str
    answers: List[FeudAnswerSchema]
    answer_scores: List[int] = []  # Parallel scoring values (derived from answers)
    category: str = "general"
    difficulty: str = "medium"  # easy, medium, hard
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True
    times_used: int = 0
    
    def __init__(self, **data):
        super().__init__(**data)
        # Derive answer_scores from answers if not provided
        if not self.answer_scores and self.answers:
            self.answer_scores = [a.points for a in self.answers]


class FeudQuestionDB:
    """Database operations for Feud questions"""
    
    def __init__(self, collection):
        self.collection = collection
    
    async def create(self, question: FeudQuestion) -> str:
        """Insert a new question"""
        doc = question.model_dump()
        await self.collection.insert_one(doc)
        return question.question_id
    
    async def get_by_id(self, question_id: str) -> Optional[dict]:
        """Get question by ID"""
        return await self.collection.find_one(
            {'question_id': question_id},
            {'_id': 0}
        )
    
    async def get_random(self, count: int = 5, category: Optional[str] = None) -> List[dict]:
        """Get random active questions"""
        match_filter = {'is_active': True}
        if category:
            match_filter['category'] = category
        
        pipeline = [
            {'$match': match_filter},
            {'$sample': {'size': count}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        return await cursor.to_list(length=count)
    
    async def get_by_category(self, category: str, limit: int = 20) -> List[dict]:
        """Get questions by category"""
        cursor = self.collection.find(
            {'category': category, 'is_active': True},
            {'_id': 0}
        ).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def increment_usage(self, question_id: str):
        """Increment times_used counter"""
        await self.collection.update_one(
            {'question_id': question_id},
            {'$inc': {'times_used': 1}}
        )
    
    async def seed_questions(self, questions: List[dict]):
        """Bulk insert questions for seeding"""
        if questions:
            await self.collection.insert_many(questions)
