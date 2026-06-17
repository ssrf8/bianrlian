from datetime import datetime

from pydantic import BaseModel


class VerificationOut(BaseModel):
    id: int
    account: str
    status: str
    video_filename: str
    video_content_type: str
    video_size: int
    actions_passed: str
    duration_ms: int
    client_metadata: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminLoginIn(BaseModel):
    username: str
    password: str


class AdminLoginOut(BaseModel):
    token: str
