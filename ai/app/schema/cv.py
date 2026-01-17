from pydantic import BaseModel

class CVRequest(BaseModel):
    job_id: str
    cv_text: str
