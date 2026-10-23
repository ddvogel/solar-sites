from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

# CryptContext! Handles slow bcrypt hashing and timing-safe comparisons to protect against brute-force and timing attacks.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "supersecretkey" # in production, load from environment
ALGORITHM = "HS256"

class AuthRequest(BaseModel):
    email: str
    password: str

# session protection: decodes and verifies the HMAC-SHA256 JWT.
# returns 401 if the token is missing, expired, altered, or if the user no longer exists
def get_current_user(token: str = None, db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Fails without a session")
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
    if db.query(models.User).filter(models.User.email == request.email).first():
        raise HTTPException(status_code=400, detail="Fails when the email exists")
    
    hashed_pw = pwd_context.hash(request.password)
    new_user = models.User(email=request.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = jwt.encode({"sub": new_user.email}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}

# authenticate an advisor using password hash verification.
# Returns 401 Unauthorized if credentials do not match, returning a token on success.
@app.post("/api/login")
def login(request: AuthRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Fails on wrong credentials")
    
    token = jwt.encode({"sub": user.email}, SECRET_KEY, algorithm=ALGORITHM)
    return {"token": token}

# session termination endpoint. For stateless JWTs, the server returns 200 OK while the client discards its stored token.
@app.post("/api/logout")
def logout():
    return {"message": "Ends the session"}

@app.get("/api/me")
def read_me(user: models.User = Depends(get_current_user)):
    return {"email": user.email}