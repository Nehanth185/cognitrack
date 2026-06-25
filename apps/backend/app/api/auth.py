import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import AuthRegisterResponse

router = APIRouter()


@router.post("/auth/register", response_model=AuthRegisterResponse)
def register_user(db: Session = Depends(get_db)):
    user = User(user_id=str(uuid.uuid4()))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthRegisterResponse(user_id=user.user_id, is_new=True)


@router.get("/auth/me")
def get_current_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user.user_id,
        "age_range": user.age_range,
        "sex": user.sex,
        "created_at": user.created_at,
        "last_active_at": user.last_active_at,
    }


@router.delete("/users/me")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "Account deleted successfully"}