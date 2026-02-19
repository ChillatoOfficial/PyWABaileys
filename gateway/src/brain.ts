import fetch from "node-fetch"
import type { EventMessage, BrainResponse } from "./types.js"

const PY_URL = process.env.PY_URL || "http://127.0.0.1:8000/event"

export async function callBrain(ev: EventMessage): Promise<BrainResponse> {
  const r = await fetch(PY_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ev),
  })
  if (!r.ok) throw new Error(`Brain HTTP ${r.status}`)
  return (await r.json()) as BrainResponse
}
