import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { host, port, user, pass } = config().smtp;
  transporter =
    host && user && pass
      ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
      : null;
  return transporter;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Sends a notification email when SMTP is configured. Failures are logged and swallowed:
 * email is a courtesy and must never block a registration.
 */
async function send(to: string, subject: string, text: string, html: string) {
  const mailer = getTransporter();
  if (!mailer) return;
  try {
    await mailer.sendMail({ from: config().smtp.from ?? config().smtp.user!, to, subject, text, html });
  } catch (err) {
    console.error("[email] send failed:", (err as Error).message);
  }
}

export async function sendRegistrationConfirmation(input: {
  to: string;
  name: string;
  eventTitle: string;
  venue: string;
  startAt: Date;
  ticketCode: string;
  registrationId: number;
}) {
  const when = input.startAt.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const ticketUrl = config().appUrl ? `${config().appUrl}/tickets/${input.registrationId}` : null;
  const text = [
    `Hi ${input.name},`,
    "",
    `You're registered for ${input.eventTitle}.`,
    `When: ${when} (IST)`,
    `Where: ${input.venue}`,
    `Ticket code: ${input.ticketCode}`,
    ticketUrl ? `View your ticket: ${ticketUrl}` : "",
    "",
    "Show the QR code on your ticket at the entrance.",
  ].join("\n");
  const html = `
    <p>Hi ${escapeHtml(input.name)},</p>
    <p>You're registered for <strong>${escapeHtml(input.eventTitle)}</strong>.</p>
    <p><strong>When:</strong> ${escapeHtml(when)} (IST)<br/><strong>Where:</strong> ${escapeHtml(input.venue)}<br/>
    <strong>Ticket code:</strong> <code>${escapeHtml(input.ticketCode)}</code></p>
    ${ticketUrl ? `<p><a href="${escapeHtml(ticketUrl)}">View your ticket</a></p>` : ""}
    <p>Show the QR code on your ticket at the entrance.</p>`;
  await send(input.to, `Registration confirmed: ${input.eventTitle}`, text, html);
}
