/**
 * Outbound email delivery for the workspace service (team invitations, etc).
 *
 * Uses nodemailer against SMTP settings from env (SMTP_HOST/PORT/USER/PASSWORD/FROM).
 * Degrades gracefully: if SMTP_HOST isn't configured (e.g. local dev with no
 * mail server), we log a warning and no-op instead of crashing the process.
 */

import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../../../src/config/env.js";

let transporter: Transporter | null | undefined; // undefined = not yet built, null = unavailable

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  if (!env.smtpHost) {
    console.warn("⚠ SMTP_HOST not set — email sending is disabled (dev no-op).");
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
  });

  return transporter;
}

export interface SendInvitationEmailParams {
  to: string;
  teamName: string;
  inviterName: string;
  inviteUrl: string;
}

/** Sends a "you've been invited to a team" email. No-ops (with a console warning)
 *  if SMTP isn't configured, so local dev never crashes because of missing creds. */
export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<boolean> {
  const { to, teamName, inviterName, inviteUrl } = params;
  const t = getTransporter();

  if (!t) {
    console.warn(`⚠ [email] Skipped invitation email to ${to} (SMTP not configured).`);
    return false;
  }

  const subject = `${inviterName} invited you to join "${teamName}" on Unify`;
  const text = [
    `${inviterName} invited you to join the team "${teamName}" on Unify.`,
    "",
    `Accept the invite: ${inviteUrl}`,
    "",
    "If you weren't expecting this, you can safely ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px; font-size: 20px;">You're invited to join a team on Unify</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #333;">
        <strong>${escapeHtml(inviterName)}</strong> invited you to join the team
        <strong>${escapeHtml(teamName)}</strong> on Unify.
      </p>
      <p style="margin: 24px 0;">
        <a href="${inviteUrl}" style="background: #3a93b1; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; display: inline-block;">
          Accept invitation
        </a>
      </p>
      <p style="font-size: 12px; color: #888; line-height: 1.5;">
        Or copy this link into your browser: <br />
        <a href="${inviteUrl}" style="color: #3a93b1;">${inviteUrl}</a>
      </p>
      <p style="font-size: 12px; color: #aaa; margin-top: 32px;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  try {
    await t.sendMail({
      from: env.smtpFrom,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email.sendInvitationEmail] failed:", err);
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
