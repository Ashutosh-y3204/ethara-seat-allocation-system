import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config.settings import settings

logger = logging.getLogger("ethara_database")

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = None
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    try:
        temp_engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=5,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 5}
        )
        with temp_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = temp_engine
        logger.info("Successfully connected to primary remote database.")
    except Exception as e:
        logger.warning(
            f"Primary database connection failed: {e}. Falling back to embedded SQLite database."
        )
        engine = create_engine(
            "sqlite:///./ethara.db",
            connect_args={"check_same_thread": False}
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
