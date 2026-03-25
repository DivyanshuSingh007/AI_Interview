"""Quick test: connect to PostgreSQL and create tables."""
import asyncio
import sys

async def main():
    from dotenv import load_dotenv; load_dotenv()
    from database import engine, create_tables

    if not engine:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    print("Testing connection...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(__import__("sqlalchemy").text("SELECT version()"))
            row = result.fetchone()
            print("Connected:", row[0][:50])
    except Exception as e:
        print("Connection FAILED:", e)
        sys.exit(1)

    print("Creating tables...")
    await create_tables()
    print("Done! Tables are ready.")
    await engine.dispose()

asyncio.run(main())
