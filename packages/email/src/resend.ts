import { Resend } from "resend";
import { render } from "@react-email/render";
import { ImportReportEmail, type ImportReportData } from "./templates/import-report";

const FROM_ADDRESS = "Hisskompetens <noreply@hisskompetens.se>";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

export async function sendImportReport(to: string, data: ImportReportData) {
  const resend = getResendClient();
  const total = data.created + data.updated;
  const hasErrors = data.errors.length > 0;
  const subject = `Importrapport: ${total} hissar behandlade${hasErrors ? ` (${data.errors.length} fel)` : ""}`;

  const html = await render(ImportReportEmail(data));

  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });
}
