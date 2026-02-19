# 🚀 PyWABaileys

> A Baileys-like WhatsApp bot framework written in Python.  
> Powered by a lightweight TypeScript gateway using Baileys.

---

## 📌 Overview

PyWABaileys allows you to write WhatsApp bots **entirely in Python**, while a minimal TypeScript gateway handles the WhatsApp Web protocol via Baileys.

You focus on bot logic.  
The gateway manages connection and WhatsApp internals.

---

## 🧠 Architecture

```
WhatsApp
   │
   ▼
Baileys (TypeScript Gateway)
   │  HTTP JSON
   ▼
PyWABaileys (Python Client)
   │
   ▼
Your Bot Code
```

### Gateway Responsibilities
- QR login
- Reconnect logic
- Group metadata fetching
- Admin caching
- Execute moderation actions

### Python Client Responsibilities
- Receive message events
- Process logic
- Return structured actions

---

## ✨ Features

### Core
- Python-first API
- Event system (`@client.on_message`)
- Auto gateway startup
- Stable reconnect handling
- Admin detection with caching

### Supported Actions
- Send messages
- Delete messages
- Kick users
- Add users
- Promote users
- Demote users

---

## ⚙️ Requirements

- Python 3.10+
- Node.js 18+
- WhatsApp account

⚠️ To use moderation features, the bot account must be group admin.

---

## 📦 Installation

### 1️⃣ Clone repository

```bash
git clone https://github.com/yourusername/pywabaileys.git
cd pywabaileys
```

---

### 2️⃣ Install Python dependencies

```bash
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

---

### 3️⃣ Install Gateway dependencies

```bash
cd gateway
npm install
cd ..
```

---

## ▶️ Running the Example Bot

```bash
venv\Scripts\activate
python examples\bot_basic.py
```

Scan the QR code displayed in the gateway terminal.

The bot is now online.

---

## 🧩 Basic Usage Example

```python
from pywabaileys import Client, Message

client = Client(port=8000, gateway_dir="./gateway")

@client.on_message
def handler(msg: Message, wa: Client):
    text = msg.text.strip()

    if text == "!ping":
        return wa.send_text(msg.chat_id, "pong ✅")

    if text.startswith("!kick ") and msg.is_group:
        user = text.split(" ", 1)[1]
        return [
            wa.send_text(msg.chat_id, f"Kicking {user}"),
            wa.kick(msg.chat_id, user)
        ]

client.run()
```

---

## 🔐 Admin Detection

The gateway automatically retrieves group admins using:

```ts
sock.groupMetadata()
```

Admins are cached and refreshed on participant updates.

In Python:

```python
if msg.sender_id in (msg.group_admins or []):
    # user is admin
```

---

## 📚 Client Methods

| Method | Description |
|--------|------------|
| `send_text(chat_id, text, mentions=None)` | Send text message |
| `delete(key)` | Delete a message |
| `kick(chat_id, user_id)` | Remove user from group |
| `add(chat_id, user_id)` | Add user to group |
| `promote(chat_id, user_id)` | Promote to admin |
| `demote(chat_id, user_id)` | Demote admin |

---

## 🔄 How It Works

1. Gateway receives WhatsApp message.
2. Gateway sends JSON event to Python.
3. Python returns a list of actions.
4. Gateway executes actions safely via Baileys.

---

## 🛠 Roadmap

- WebSocket transport (replace HTTP)
- Built-in command system
- Plugin loader
- Middleware system
- Role hierarchy (owner/mod/helper)
- Dashboard interface
- Async-native support
- Rate limiter per user
- AI integration module

---

## ⚠️ Disclaimer

This project uses the unofficial WhatsApp Web protocol.

Use responsibly.  
Do not spam or abuse automation.  
WhatsApp may restrict accounts violating policies.

---

## 📜 License

MIT License
