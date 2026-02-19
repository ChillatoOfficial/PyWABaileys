from pywabaileys import Client, Message

client = Client(port=8000, gateway_dir="./gateway", auto_start_gateway=True)

@client.on_message
def handle(msg: Message, wa: Client):
    t = msg.text.strip()

    if t == "!ping":
        return wa.send_text(msg.chat_id, "pong ✅")

    if t.startswith("!say "):
        return wa.send_text(msg.chat_id, t[5:])

    if t == "!id":
        return wa.send_text(msg.chat_id, f"chat_id: {msg.chat_id}")

    # Admin actions (bot must be admin)
    if t.startswith("!kick ") and msg.is_group:
        user = t.split(" ", 1)[1].strip()
        return [wa.send_text(msg.chat_id, f"👢 kick: {user}"), wa.kick(msg.chat_id, user)]

client.run()
