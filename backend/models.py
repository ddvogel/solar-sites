from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# user table stores advisor credentials.

# primary key 'id' is the anchor for data isolation
# this allows us to associate each client site with a specific advisor (owner_id).

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # Establish relationship to sites
    sites = relationship("Site", back_populates="owner")

class Site(Base):
    __tablename__ = "sites"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    client_name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    roof_area_m2 = Column(Float, nullable=True)
    peak_kwp = Column(Float, nullable=False)

    owner = relationship("User", back_populates="sites")