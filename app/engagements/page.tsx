"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { KeyRound, Plus, Copy, Check, ExternalLink, RefreshCw, LockOpen, Rocket } from "lucide-react"
import { isNelsonMode, unlockNelsonMode, nelsonCode } from "@/lib/nelsonMode"
import { saveSurveySeed } from "@/lib/survey/seedStorage"

interface Row {
  token: string
  clientName: string
  status: "sent" | "submitted"
  hasResult: boolean
  shared?: boolean
  progress?: { stage: "landing" | "survey" | "workbook"; step?: number; total?: number; updatedAt: string }
  updatedAt: string
}

/** Human status: how far the client actually got, not just sent/returned. */
function rowStatus(r: Row): { label: string; tone: "done" | "active" | "idle" } {
  if (r.status === "submitted") return { label: "Returned ✓", tone: "done" }
  if (r.progress?.stage === "survey")
    return { label: `Survey · step ${r.progress.step ?? "?"} of ${r.progress.total ?? "?"}`, tone: "active" }
  if (r.progress?.stage === "workbook") return { label: "Workbook downloaded", tone: "active" }
  if (r.progress?.stage === "landing") return { label: "Link opened", tone: "active" }
  return { label: "Sent", tone: "idle" }
}

/** Every screen we show clients, one click away — the pitch launchpad. */
const LAUNCHPAD: { label: string; href: string; note: string }[] = [
  { label: "Survey — blank", href: "/survey", note: "what a fresh respondent sees" },
  { label: "Survey — Law Firm demo", href: "/survey?demo=law", note: "pre-filled, presenter pill on" },
  { label: "Survey — Tech demo", href: "/survey?demo=tech", note: "pre-filled" },
  { label: "Survey — Enterprise demo", href: "/survey?demo=enterprise", note: "pre-filled" },
  { label: "Workbook guide", href: "/workbook-guide", note: "the send-along PDF" },
  { label: "Program review", href: "/review", note: "validation session view" },
  { label: "Studio", href: "/studio", note: "Canvas v2 preview — engagement workbench" },
  { label: "Advanced Canvas", href: "/", note: "NELSON-only — Fast-Track inside" },
]

/**
 * The NELSON console — passcode-gated. Create an engagement (client name →
 * their landing link), watch statuses, and open a returned result straight
 * into the validation review. Unlocking here also enables presenter chrome
 * (demo pill, canvas wrench) across the app on this device.
 */
export default function EngagementsPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { setUnlocked(isNelsonMode()) }, [])

  const headers = () => ({ "x-nelson-code": nelsonCode() ?? "" })

  const refresh = async () => {
    setApiError(null)
    const res = await fetch("/api/engagements", { headers: headers() })
    if (!res.ok) { setApiError((await res.json()).error ?? "Request failed"); return }
    setRows(await res.json())
  }
  useEffect(() => { if (unlocked) refresh() }, [unlocked]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    if (!name.trim()) return
    setCreating(true)
    const res = await fetch("/api/engagements", {
      method: "POST", headers: headers(), body: JSON.stringify({ clientName: name.trim() }),
    })
    setCreating(false)
    if (!res.ok) { setApiError((await res.json()).error ?? "Create failed"); return }
    setName("")
    refresh()
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${token}`)
    setCopied(token)
    window.setTimeout(() => setCopied(null), 1500)
  }

  const openInReview = async (token: string) => {
    const res = await fetch(`/api/engagements/${token}`, { headers: headers() })
    if (!res.ok) { setApiError("Couldn't load the result"); return }
    const e = await res.json()
    if (!e.result) { setApiError("No result submitted yet"); return }
    saveSurveySeed(e.result)
    window.location.href = "/review"
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7fa] px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <Image src="/nelson-logo.png" alt="NELSON" width={104} height={28} className="h-6 w-auto" />
          <h1 className="mt-4 text-lg font-bold">NELSON access</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the team passcode to manage engagements and unlock presenter mode on this device.</p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              const ok = await unlockNelsonMode(code)
              setCodeError(!ok)
              setUnlocked(ok)
            }}
          >
            <input
              type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Passcode"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#00badc] focus:outline-none"
            />
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              <KeyRound className="h-4 w-4" /> Unlock
            </button>
          </form>
          {codeError && <p className="mt-2 text-xs text-amber-600">That passcode didn&apos;t verify.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <header className="border-b border-slate-200 bg-white/85 px-6 py-4 backdrop-blur-md lg:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/nelson-logo.png" alt="NELSON" width={104} height={28} className="h-6 w-auto" />
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm font-medium text-slate-700">Engagements</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <LockOpen className="h-3.5 w-3.5" /> Presenter mode on
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 lg:px-10">
        {/* Create */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
          <input
            value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name — e.g. Hartwell & Cross LLP"
            onKeyDown={(e) => e.key === "Enter" && create()}
            className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#00badc] focus:outline-none"
          />
          <button
            onClick={create} disabled={creating || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00badc] px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#2fd0ee] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> New engagement
          </button>
          <button onClick={refresh} title="Refresh" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {apiError && (
          <p className="mt-3 rounded-lg border border-amber-400/60 bg-amber-50 px-3 py-2 text-sm text-amber-700">{apiError}</p>
        )}

        {/* Board */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {rows === null ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">No engagements yet — create the first one above and send the client their link.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const st = rowStatus(r)
                  return (
                  <tr key={r.token}>
                    <td className="px-5 py-3 font-medium text-slate-900">{r.clientName}</td>
                    <td className="px-3 py-3">
                      <span
                        title={r.progress ? `Last activity ${new Date(r.progress.updatedAt).toLocaleString()}` : undefined}
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          st.tone === "done" ? "bg-emerald-50 text-emerald-700"
                            : st.tone === "active" ? "bg-[#00badc]/10 text-[#0089a3]"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-500">{new Date(r.updatedAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => copyLink(r.token)} title="Copy client link"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900">
                          {copied === r.token ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} Link
                        </button>
                        <a href={`/s/${r.token}`} target="_blank" rel="noreferrer" title="Preview landing"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300 hover:text-slate-900">
                          <ExternalLink className="h-3.5 w-3.5" /> Preview
                        </a>
                        {r.status === "submitted" && (
                          <>
                            <a href={`/d/${r.token}`} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-[#00badc]/50 bg-[#00badc]/10 px-2.5 py-1 text-xs font-semibold text-[#0089a3] hover:bg-[#00badc]/20">
                              Deliverable
                            </a>
                            <button
                              onClick={async () => {
                                await fetch(`/api/engagements/${r.token}`, {
                                  method: "PATCH", headers: headers(), body: JSON.stringify({ shared: !r.shared }),
                                })
                                refresh()
                              }}
                              title={r.shared ? "Client can see the deliverable — click to unshare" : "Deliverable is private — click to share with the client"}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                                r.shared ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "border border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              {r.shared ? "Shared ✓" : "Share"}
                            </button>
                            <button onClick={() => openInReview(r.token)}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700">
                              Open in review →
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          The client link (<code className="text-slate-500">/s/&lt;token&gt;</code>) shows only their landing —
          story, paths in, and the return slot. No demos, no canvas, no numbers until the session.
        </p>

        {/* Launchpad — every pitch screen one click away */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Rocket className="h-4 w-4 text-[#0089a3]" /> Demo launchpad
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            The screens you pitch with, one click away. Client landings open from each engagement&apos;s Preview above.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LAUNCHPAD.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                title={l.note}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-[#00badc]/50 hover:bg-[#00badc]/[0.06] hover:text-slate-900"
              >
                <ExternalLink className="h-3 w-3 text-slate-400" /> {l.label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
