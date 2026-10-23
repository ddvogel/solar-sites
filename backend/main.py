from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
import bcrypt
from jose import jwt, JWTError
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

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