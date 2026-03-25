"""
SQLAlchemy ORM models.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


def _now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name:          Mapped[str]           = mapped_column(String(120))
    email:         Mapped[str]           = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str]           = mapped_column(String(255))
    is_active:     Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=_now)
    updated_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
    
    # Google OAuth
    google_id: Mapped[str]              = mapped_column(String(255), nullable=True)  # Google user ID
    
    # Subscription and usage tracking
    tavus_user_id: Mapped[str]           = mapped_column(String(255), nullable=True)  # Tavus AI user ID
    subscription_status: Mapped[str]    = mapped_column(String(50), default="free")  # "free" or "premium"
    usage_time_seconds: Mapped[int]     = mapped_column(Integer, default=0)  # Total usage in seconds
    video_time_seconds: Mapped[int]     = mapped_column(Integer, default=0)  # Video usage in seconds
    free_limit_seconds: Mapped[int]     = mapped_column(Integer, default=1500)  # 25 minutes = 1500 seconds
    free_video_limit_seconds: Mapped[int] = mapped_column(Integer, default=300)  # 5 minutes = 300 seconds
    subscription_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"

    @property
    def remaining_time_seconds(self) -> int:
        """Calculate remaining time for free tier"""
        if self.subscription_status == "premium":
            return -1  # Unlimited for premium
        return max(0, self.free_limit_seconds - self.usage_time_seconds)

    @property
    def is_time_exhausted(self) -> bool:
        """Check if free time is exhausted"""
        return self.subscription_status == "free" and self.usage_time_seconds >= self.free_limit_seconds

    @property
    def remaining_video_seconds(self) -> int:
        """Calculate remaining video time for free tier"""
        if self.subscription_status == "premium":
            return -1  # Unlimited for premium
        return max(0, self.free_video_limit_seconds - self.video_time_seconds)

    @property
    def is_video_exhausted(self) -> bool:
        """Check if free video time is exhausted"""
        return self.subscription_status == "free" and self.video_time_seconds >= self.free_video_limit_seconds

    @property
    def interview_phases(self) -> list:
        """Define interview phases with video/audio distribution"""
        return [
            {"phase": "intro_video", "duration": 60, "use_video": True},
            {"phase": "question_audio", "duration": 240, "use_video": False},
            {"phase": "reaction_video", "duration": 60, "use_video": True},
            {"phase": "coding_phase", "duration": 360, "use_video": False},
            {"phase": "final_feedback_video", "duration": 120, "use_video": True},
        ]
