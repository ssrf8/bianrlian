import os
import shutil
import uuid
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .auth import create_admin_token, require_admin, verify_admin_credentials
from .database import Base, engine, get_db
from .models import Verification
from .schemas import AdminLoginIn, AdminLoginOut, VerificationOut


UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Face Verification API")

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/verification", response_model=VerificationOut)
def create_verification(
    account: str = Form(...),
    actionsPassed: str = Form("[]"),
    durationMs: int = Form(0),
    clientMetadata: str = Form("{}"),
    video: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Verification:
    if not account.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is required")
    if not video.content_type or not video.content_type.startswith("video/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Video file is required")

    suffix = ".webm"
    if video.filename and "." in video.filename:
        suffix = Path(video.filename).suffix[:12] or suffix
    filename = f"{uuid.uuid4().hex}{suffix}"
    target = UPLOAD_DIR / filename
    size = 0
    with target.open("wb") as handle:
        while chunk := video.file.read(1024 * 1024):
            size += len(chunk)
            handle.write(chunk)

    record = Verification(
        account=account.strip(),
        status="passed",
        video_path=str(target),
        video_filename=filename,
        video_content_type=video.content_type,
        video_size=size,
        actions_passed=actionsPassed,
        duration_ms=durationMs,
        client_metadata=clientMetadata,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.post("/api/admin/login", response_model=AdminLoginOut)
def admin_login(payload: AdminLoginIn) -> AdminLoginOut:
    if not verify_admin_credentials(payload.username, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return AdminLoginOut(token=create_admin_token(payload.username))


@app.get(
    "/api/admin/verifications",
    response_model=list[VerificationOut],
    dependencies=[Depends(require_admin)],
)
def list_verifications(db: Session = Depends(get_db)) -> list[Verification]:
    return db.query(Verification).order_by(Verification.created_at.desc()).all()


@app.get("/api/admin/verifications/{verification_id}/video", dependencies=[Depends(require_admin)])
def get_video(verification_id: int, db: Session = Depends(get_db)) -> FileResponse:
    record = db.get(Verification, verification_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    path = Path(record.video_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    return FileResponse(
        path,
        media_type=record.video_content_type,
        filename=record.video_filename,
    )


@app.delete("/api/admin/verifications/{verification_id}", dependencies=[Depends(require_admin)])
def delete_verification(verification_id: int, db: Session = Depends(get_db)) -> dict[str, bool]:
    record = db.get(Verification, verification_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    path = Path(record.video_path)
    db.delete(record)
    db.commit()
    if path.exists():
        path.unlink()
    return {"ok": True}
