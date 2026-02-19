export type WADeleteKey = {
  remoteJid: string
  id: string
  participant?: string
  fromMe?: boolean
}

export type EventMessage = {
  type: "message"
  chat_id: string
  msg_id: string
  sender_id: string
  text: string
  timestamp: number
  is_group: boolean
  group_admins?: string[]
  key: WADeleteKey
}

export type Action =
  | { type: "send"; to: string; text: string; mentions?: string[] }
  | { type: "delete"; key: WADeleteKey }
  | { type: "kick" | "add" | "promote" | "demote"; chat_id: string; user_id: string }

export type BrainResponse = { actions: Action[] }
