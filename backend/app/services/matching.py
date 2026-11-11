from sqlalchemy.orm import Session
from app.matching import match_request as canonical_match_request
def match_request(db: Session, request_id: int):
    return canonical_match_request(db, request_id)
