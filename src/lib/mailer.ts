import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!cachedTransporter) {
    const host = process.env.SMTP_HOST ?? "127.0.0.1";
    const port = Number(process.env.SMTP_PORT ?? 1025);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER || undefined;
    const pass = process.env.SMTP_PASS || undefined;

    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }
  return cachedTransporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const from =
    process.env.SMTP_FROM ?? "Komik Mirror <no-reply@komik-mirror.local>";
  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
