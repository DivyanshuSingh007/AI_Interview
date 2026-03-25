"""
PostgreSQL async database setup via SQLAlchemy + asyncpg.
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Async PostgreSQL URL: postgresql+asyncpg://user:pass@host:port/dbname
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Convert plain postgres:// or postgresql:// → postgresql+asyncpg://
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
) if DATABASE_URL else None

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
) if engine else None


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency: yield an async DB session."""
    if not AsyncSessionLocal:
        raise RuntimeError("DATABASE_URL is not configured.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def create_tables():
    """Create all tables on startup (idempotent)."""
    if not engine:
        print("[DB] No DATABASE_URL set — skipping table creation.")
        return
    from models import User  # noqa: F401 — import to register with Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[DB] Tables ensured.")
