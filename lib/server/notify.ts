/**
 * NELSON-side notifications — the funnel gets a voice. When RESEND_API_KEY +
 * NELSON_NOTIFY_EMAIL are configured (Vercel env), engagement moments send a
 * real email via Resend's REST API (no SDK dependency); otherwise they log,
 * so local dev and un-provisioned deploys behave identically minus the email.
 * Fire-and-forget by design: a notification failure must never fail the
 * client's request.
 */
export async function notifyNelson(subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const to = process.env.NELSON_NOTIFY_EMAIL
  const from = process.env.NELSON_NOTIFY_FROM ?? "onboarding@resend.dev"
  if (!key || !to) {
    console.log(`[notify] ${subject} — ${text} (set RESEND_API_KEY + NELSON_NOTIFY_EMAIL to email this)`)
    return
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    })
  } catch (err) {
    console.error("[notify] failed", err)
  }
}
