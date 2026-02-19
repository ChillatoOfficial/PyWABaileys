from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List, Literal, Union

class WADeleteKey(BaseModel):
    remoteJid: str
    id: str
    participant: Optional[str] = None
    fromMe: Optional[bool] = None

class EventMessage(BaseModel):
    type: Literal["message"]
    chat_id: str
    msg_id: str
    sender_id: str
    text: str
    timestamp: int
    is_group: bool
    group_admins: Optional[List[str]] = None
    key: WADeleteKey

class ActionSend(BaseModel):
    type: Literal["send"]
    to: str
    text: str
    mentions: Optional[List[str]] = None

class ActionDelete(BaseModel):
    type: Literal["delete"]
    key: WADeleteKey

class ActionGroupUpdate(BaseModel):
    type: Literal["kick","add","promote","demote"]
    chat_id: str
    user_id: str

Action = Union[ActionSend, ActionDelete, ActionGroupUpdate]

class Response(BaseModel):
    actions: List[Action] = []
