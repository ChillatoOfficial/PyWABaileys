import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys"
import PQueue from "p-queue"
import qrcode from "qrcode-terminal"
import { callBrain } from "./brain.js"
import type { Action, EventMessage } from "./types.js"

const sendQ = new PQueue({ interval: 1000, intervalCap: 10 })
let reconnectAttempts = 0

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function execAction(sock: any, a: Action) {
  await sendQ.add(async () => {
    switch (a.type) {
      case "send":
        await sock.sendMessage(a.to, { text: a.text, mentions: a.mentions || [] })
        return
      case "delete":
        await sock.sendMessage(a.key.remoteJid, { delete: a.key } as any)
        return
      case "kick":
        await sock.groupParticipantsUpdate(a.chat_id, [a.user_id], "remove")
        return
      case "add":
        await sock.groupParticipantsUpdate(a.chat_id, [a.user_id], "add")
        return
      case "promote":
        await sock.groupParticipantsUpdate(a.chat_id, [a.user_id], "promote")
        return
      case "demote":
        await sock.groupParticipantsUpdate(a.chat_id, [a.user_id], "demote")
        return
    }
  })
}

function extractText(m: any): string {
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ""
  )
}

// admin cache
type AdminCacheEntry = { admins: string[]; ts: number }
const adminCache = new Map<string, AdminCacheEntry>()
const ADMIN_CACHE_TTL_MS = 60_000

async function getGroupAdmins(sock: any, chatId: string): Promise<string[]> {
  const now = Date.now()
  const cached = adminCache.get(chatId)
  if (cached && now - cached.ts < ADMIN_CACHE_TTL_MS) return cached.admins

  try {
    const meta = await sock.groupMetadata(chatId)
    const admins = meta.participants
      .filter((p: any) => p.admin)
      .map((p: any) => p.id)
    adminCache.set(chatId, { admins, ts: now })
    return admins
  } catch {
    adminCache.set(chatId, { admins: [], ts: now })
    return []
  }
}

async function run() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth")

  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log("🧩 WA Web version:", version, "isLatest:", isLatest)

  const sock = makeWASocket({
    auth: state,
    version,
    browser: ["Windows", "Chrome", "125.0.0"],
    generateHighQualityLinkPreview: false,
  })

  sock.ev.on("creds.update", saveCreds)
  sock.ev.on("group-participants.update", (ev: any) => {
    if (ev?.id) adminCache.delete(ev.id)
  })

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true })
      console.log("📲 Scan QR above")
    }

    if (connection === "open") {
      reconnectAttempts = 0
      console.log("✅ Connected")
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      console.log("🔌 Closed:", statusCode)

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      if (!shouldReconnect) {
        console.log("⛔ Logged out. Delete ./auth and rescan QR.")
        return
      }

      reconnectAttempts++
      const wait = Math.min(30000, 1000 * reconnectAttempts)
      console.log(`♻️ Reconnect #${reconnectAttempts} in ${wait}ms...`)
      await sleep(wait)
      run().catch(() => {})
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return

    for (const msg of messages) {
      if (!msg.message) continue

      const chat = msg.key.remoteJid!
      const sender = msg.key.participant || msg.key.remoteJid!
      const isGroup = chat.endsWith("@g.us")
      const text = extractText(msg.message).trim()
      const id = msg.key.id || ""

      if (!text) continue

      let groupAdmins: string[] = []
      if (isGroup) groupAdmins = await getGroupAdmins(sock, chat)

      const ev: EventMessage = {
        type: "message",
        chat_id: chat,
        msg_id: id,
        sender_id: sender,
        text,
        timestamp: Number(msg.messageTimestamp || Math.floor(Date.now() / 1000)),
        is_group: isGroup,
        group_admins: groupAdmins,
        key: {
          remoteJid: chat,
          id,
          participant: msg.key.participant || undefined,
          fromMe: !!msg.key.fromMe,
        },
      }

      let res: { actions: Action[] } | null = null
      try {
        res = await callBrain(ev)
      } catch {
        continue
      }

      for (const a of res.actions || []) {
        try {
          await execAction(sock, a)
        } catch {
          // ignore
        }
      }
    }
  })
}

run().catch((e) => console.error("Fatal:", e))
