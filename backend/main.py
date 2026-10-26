from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt
from jose import jwt, JWTError
import models
from database import engine, get_db
from typing import Optional
from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

## Users
def hash_password(password: str) -> str:
    # bcrypt expects bytes and has a hard 72-byte limit
    pwd_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')[:72]
    hash_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hash_bytes)

SECRET_KEY = "supersecretkey" # in production, load from environment
ALGORITHM = "HS256"

class AuthRequest(BaseModel):
    email: str
    password: str

# session protection: decodes and verifies the HMAC-SHA256 JWT.
# returns 401 if the token is missing, expired, altered, or if the user no longer exists
def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Fails; no session")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# User Endpoints

# registers an advisor account.
# Returns 400 Bad Request if the email is already registered, and 201 Created on success
# with an active session token returned as {"token": ...}
@app.post("/api/register", status_code=201)
def register(request: AuthRequest, db: Session = Depends(get_db)):
    # normalize email; strip spaces and convert to lowercase
    normalized_email = request.email.strip().lower()

    if db.query(models.User).filter(models.User.email == normalized_email).first():
        raise HTTPException(status_code=400, detail="email already registered")
    
    hashed_pw = hash_password(request.password)
    new_user = models.User(email=normalized_email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = jwt.encode({"sub": new_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}

# authenticate an advisor using password hash verification.
# Returns 401 Unauthorized if credentials do not match, returning a token on success.
@app.post("/api/login")
def login(request: AuthRequest, db: Session = Depends(get_db)):
    normalized_email = request.email.strip().lower()

    user = db.query(models.User).filter(models.User.email == normalized_email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="email or password incorrect.")
    
    token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}

# session termination endpoint. For stateless JWTs, the server returns 200 OK while the client discards its stored token.
@app.post("/api/logout")
def logout():
    return {"message": "Ends the session"}

@app.get("/api/me")
def read_me(user: models.User = Depends(get_current_user)):
    return {"email": user.email}


## Sites
class SiteBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    
    client_name: str
    address: str
    latitude: float
    longitude: float
    roof_area_m2: Optional[float] = None
    peak_kwp: float

class SiteCreate(SiteBase):
    pass

class SiteResponse(SiteBase):
    id: int


# Site Endpoints
@app.get("/api/sites", response_model=list[SiteResponse])
def get_sites(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Returns only the caller's sites
    return db.query(models.Site).filter(models.Site.owner_id == user.id).all()

@app.post("/api/sites", response_model=SiteResponse, status_code=201)
def create_site(site: SiteCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # .model_dump() extracts the snake_case fields seamlessly matching the SQLAlchemy model
    db_site = models.Site(**site.model_dump(), owner_id=user.id)
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    return db_site

@app.get("/api/sites/{id}", response_model=SiteResponse)
def get_site(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(models.Site).filter(models.Site.id == id, models.Site.owner_id == user.id).first()
    if not site:
        raise HTTPException(status_code=403, detail="Not the caller ID.")
    return site

@app.put("/api/sites/{id}", response_model=SiteResponse)
def update_site(id: int, site_update: SiteCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(models.Site).filter(models.Site.id == id, models.Site.owner_id == user.id).first()
    if not site:
        raise HTTPException(status_code=403, detail="Not the caller ID.")
    
    for key, value in site_update.model_dump().items():
        setattr(site, key, value)
        
    db.commit()
    db.refresh(site)
    return site

@app.delete("/api/sites/{id}", status_code=204)
def delete_site(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    site = db.query(models.Site).filter(models.Site.id == id, models.Site.owner_id == user.id).first()
    if not site:
        raise HTTPException(status_code=403, detail="Not the caller ID.")
    db.delete(site)
    db.commit()
    return