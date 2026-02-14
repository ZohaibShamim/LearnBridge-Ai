from pydantic import BaseModel
from typing import Optional

class CVRequest(BaseModel):
    job_id: str
    cv_text: str
    role: Optional[str] = None  # Add this field

    class Config:
        from_attributes = True
