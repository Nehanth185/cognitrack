import uuid
from datetime import datetime
from typing import List
from sqlalchemy import String, DateTime, Integer, Float, func, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Session(Base):
    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    session_number: Mapped[int] = mapped_column(Integer, nullable=False)
    completion_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    tasks_completed: Mapped[List[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    trials: Mapped[List["Trial"]] = relationship(back_populates="session", lazy="dynamic")
    analytics: Mapped[List["SessionAnalytics"]] = relationship(back_populates="session", lazy="dynamic")

    def __repr__(self):
        return f"<Session {self.session_id[:8]}... user={self.user_id[:8]}...>"