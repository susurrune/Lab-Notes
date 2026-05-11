from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import AuthToken, LoginRequest, RegisterRequest, UserOut
from app.utils.response_v1 import ok

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return ok(
        AuthToken(
            access_token=token,
            user=UserOut.model_validate(user),
        ).model_dump(mode="json"),
        request,
        status_code=status.HTTP_201_CREATED,
    )


@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return ok(
        AuthToken(
            access_token=token,
            user=UserOut.model_validate(user),
        ).model_dump(mode="json"),
        request,
    )


@router.get("/me")
def me(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return ok(UserOut.model_validate(current_user).model_dump(mode="json"), request)
