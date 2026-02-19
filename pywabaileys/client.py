from __future__ import annotations

import os
import subprocess
from typing import Callable, List, Optional, Any, Dict

import uvicorn
from fastapi import FastAPI

from .models import Message, DeleteKey
from .protocol import EventMessage, Response

Handler = Callable[[Message, "Client"], Any]

class Client:

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 8000,
        prefix: Optional[str] = "!",
        gateway_dir: str = "./gateway",
        auto_start_gateway: bool = True,
        gateway_cmd: Optional[List[str]] = None,
    ):
        self.host = host
        self.port = port
        self.prefix = prefix
        self.gateway_dir = gateway_dir
        self.auto_start_gateway = auto_start_gateway
        self.gateway_cmd = gateway_cmd or ["npm", "run", "dev"]

        self._handlers: List[Handler] = []
        self._gateway_proc: Optional[subprocess.Popen] = None

        self.app = FastAPI(title="PyWABaileys Client")
        self._mount_routes()

    def on_message(self, fn: Handler):
        self._handlers.append(fn)
        return fn

    # ---- Actions returned to gateway
    def send_text(self, chat_id: str, text: str, mentions: Optional[List[str]] = None) -> Dict[str, Any]:
        return {"type": "send", "to": chat_id, "text": text, "mentions": mentions or []}

    def delete(self, key: Dict[str, Any]) -> Dict[str, Any]:
        return {"type": "delete", "key": key}

    def kick(self, chat_id: str, user_id: str) -> Dict[str, Any]:
        return {"type": "kick", "chat_id": chat_id, "user_id": user_id}

    def add(self, chat_id: str, user_id: str) -> Dict[str, Any]:
        return {"type": "add", "chat_id": chat_id, "user_id": user_id}

    def promote(self, chat_id: str, user_id: str) -> Dict[str, Any]:
        return {"type": "promote", "chat_id": chat_id, "user_id": user_id}

    def demote(self, chat_id: str, user_id: str) -> Dict[str, Any]:
        return {"type": "demote", "chat_id": chat_id, "user_id": user_id}

    def _mount_routes(self):
        @self.app.post("/event", response_model=Response)
        def event(ev: EventMessage):
            msg = Message(
                chat_id=ev.chat_id,
                msg_id=ev.msg_id,
                sender_id=ev.sender_id,
                text=ev.text or "",
                timestamp=ev.timestamp,
                is_group=ev.is_group,
                group_admins=ev.group_admins,
                key=DeleteKey(**ev.key.model_dump()) if ev.key else None,
            )

            actions: List[Dict[str, Any]] = []
            for h in self._handlers:
                out = h(msg, self)
                if out is None:
                    continue
                if isinstance(out, list):
                    actions.extend(out)
                else:
                    actions.append(out)

            actions = [a for a in actions if a]
            return Response.model_validate({"actions": actions})

    def start_gateway(self):
        if not self.auto_start_gateway:
            return

        if self._gateway_proc and self._gateway_proc.poll() is None:
            return

        env = os.environ.copy()
        env["PY_URL"] = f"http://{self.host}:{self.port}/event"
        self._gateway_proc = subprocess.Popen(
            self.gateway_cmd,
            cwd=self.gateway_dir,
            env=env,
            shell=True,
        )

    def run(self):
        self.start_gateway()
        uvicorn.run(self.app, host=self.host, port=self.port)
