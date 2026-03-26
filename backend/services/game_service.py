"""
Game Services - Re-exports from game_service_v2 for backwards compatibility
"""
from services.game_service_v2 import (
    feud_service,
    truth_or_dare_service,
    FeudGameService,
    TruthOrDareService,
    FEUD_QUESTIONS,
    fuzzy_match_answer,
    normalize_text
)

# Re-export for backwards compatibility
__all__ = [
    'feud_service',
    'truth_or_dare_service', 
    'FeudGameService',
    'TruthOrDareService',
    'FEUD_QUESTIONS',
    'fuzzy_match_answer',
    'normalize_text'
]
