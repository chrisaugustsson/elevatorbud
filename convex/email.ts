/**
 * Email sending helper for Convex actions.
 * Uses Resend REST API directly via fetch() since Convex
 * cannot import workspace packages (@elevatorbud/email).
 */

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "Hisskompetens <noreply@hisskompetens.se>";

export interface ImportResult {
  created: number;
  updated: number;
  errors: { hissnummer: string; error: string }[];
  orgsCreated: string[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildImportReportHtml(data: ImportResult, timestamp: string): string {
  const total = data.created + data.updated;
  const hasErrors = data.errors.length > 0;

  const orgsSection =
    data.orgsCreated.length > 0
      ? `
    <hr style="border-color:#e5e7eb;margin:16px 0" />
    <h2 style="font-size:18px;font-weight:600;color:#1a1a2e;margin:16px 0 8px">Nya organisationer skapade</h2>
    ${data.orgsCreated.map((org) => `<p style="font-size:14px;color:#374151;margin:2px 0;padding-left:12px">${escapeHtml(org)}</p>`).join("")}
  `
      : "";

  const errorsSection = hasErrors
    ? `
    <hr style="border-color:#e5e7eb;margin:16px 0" />
    <h2 style="font-size:18px;font-weight:600;color:#1a1a2e;margin:16px 0 8px">Fel vid import</h2>
    ${data.errors
      .slice(0, 50)
      .map(
        (err) =>
          `<p style="font-size:13px;color:#dc2626;margin:2px 0;padding-left:12px"><strong>${escapeHtml(err.hissnummer)}</strong>: ${escapeHtml(err.error)}</p>`,
      )
      .join("")}
    ${data.errors.length > 50 ? `<p style="font-size:14px;color:#374151;margin:4px 0">... och ${data.errors.length - 50} ytterligare fel</p>` : ""}
  `
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif">
  <div style="background-color:#ffffff;margin:0 auto;padding:24px;max-width:600px;border-radius:8px">
    <h1 style="font-size:24px;font-weight:700;color:#1a1a2e;margin:0 0 4px">Importrapport — Hisskompetens</h1>
    <p style="font-size:13px;color:#6b7280;margin:0 0 16px">${escapeHtml(timestamp)}</p>
    <hr style="border-color:#e5e7eb;margin:16px 0" />

    <h2 style="font-size:18px;font-weight:600;color:#1a1a2e;margin:16px 0 8px">Sammanfattning</h2>
    <p style="font-size:14px;color:#374151;margin:4px 0"><strong>${total}</strong> hissar behandlade totalt</p>
    <p style="font-size:14px;color:#374151;margin:2px 0;padding-left:12px">Nya hissar: <strong>${data.created}</strong></p>
    <p style="font-size:14px;color:#374151;margin:2px 0;padding-left:12px">Uppdaterade hissar: <strong>${data.updated}</strong></p>
    ${hasErrors ? `<p style="font-size:14px;color:#dc2626;margin:2px 0;padding-left:12px;font-weight:600">Fel: <strong>${data.errors.length}</strong></p>` : ""}

    ${orgsSection}
    ${errorsSection}

    <hr style="border-color:#e5e7eb;margin:16px 0" />
    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0">Detta meddelande skickades automatiskt från Hisskompetens importverktyg.</p>
  </div>
</body>
</html>`;
}

export async function sendImportReport(
  to: string,
  data: ImportResult,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured — skipping import report email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const timestamp = new Date().toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm",
    dateStyle: "long",
    timeStyle: "short",
  });

  const total = data.created + data.updated;
  const hasErrors = data.errors.length > 0;
  const subject = `Importrapport: ${total} hissar behandlade${hasErrors ? ` (${data.errors.length} fel)` : ""}`;
  const html = buildImportReportHtml(data, timestamp);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Resend API error:", response.status, body);
      return { success: false, error: `Resend API ${response.status}: ${body}` };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Failed to send import report email:", message);
    return { success: false, error: message };
  }
}
