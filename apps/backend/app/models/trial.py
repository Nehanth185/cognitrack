import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, Boolean, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Trial(Base):
    __tablename__ = "trials"

    trial_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    task_type: Mapped[str] = mapped_column(String(50), nullable=False)
    stimulus: Mapped[str] = mapped_column(String(50), nullable=False)
    correct_response: Mapped[str] = mapped_column(String(20), nullable=False)
    user_response: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reaction_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    trial_number: Mapped[int] = mapped_column(Integer, nullable=False)
    block_number: Mapped[int] = mapped_column(Integer, default=1)
    device_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    browser: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("ix_trials_session_task", "session_id", "task_type"),
        Index("ix_trials_user_task", "user_id", "task_type"),
    )

    def __repr__(self):
        return f"<Trial {self.trial_id[:8]}... task={self.task_type} rt={self.reaction_time}>"