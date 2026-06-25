from pydantic import BaseModel


class AuthRegisterResponse(BaseModel):
    user_id: str
    is_new: bool