from sqlalchemy import Column, Integer, String
from database import Base

# user table stores advisor credentials.

# primary key 'id' is the anchor for data isolation
# this allows us to associate each client site with a specific advisor (owner_id).

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)