from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List

@dataclass
class DeleteKey:
    remoteJid: str
    id: str
    participant: Optional[str] = None
    fromMe: Optional[bool] = None

@dataclass
class Message:
    chat_id: str
    msg_id: str
    sender_id: str
    text: str
    timestamp: int
    is_group: bool
    group_admins: Optional[List[str]] = None
    key: Optional[DeleteKey] = None

    @property
    def sender_num(self) -> str:
        return self.sender_id.split("@")[0]
