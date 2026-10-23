from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# configure and setup SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./solar.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()