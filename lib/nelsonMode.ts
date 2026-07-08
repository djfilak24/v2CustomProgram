/**
 * NELSON presenter mode — a client-side gate for presenter chrome (demo
 * scenario pill, canvas wrench, engagement console). Unlocked once per device
 * with the shared passcode (verified server-side); this is UX separation for
 * the pilot, not a security boundary — the API routes carry their own check.
 */
const KEY = "nelson:mode"

export const isNelsonMode = (): boolean => {
  try { return localStorage.getItem(KEY) === "1" } catch { return false }
}

export async function unlockNelsonMode(code: string): Promise<boolean> {
  const res = await fetch("/api/nelson", { method: "POST", body: JSON.stringify({ code }) })
  const { ok } = await res.json().catch(() => ({ ok: false }))
  if (ok) { try { localStorage.setItem(KEY, "1"); localStorage.setItem("nelson:code", code) } catch {} }
  return !!ok
}

export const nelsonCode = (): string | null => {
  try { return localStorage.getItem("nelson:code") } catch { return null }
}

export function lockNelsonMode(): void {
  try { localStorage.removeItem(KEY); localStorage.removeItem("nelson:code") } catch {}
}
