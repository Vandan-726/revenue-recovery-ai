import { randomBytes } from "node:crypto";
import { env } from "../env";
import { logger } from "../logger";

export type ProviderChannel = "sms" | "email" | "voice" | "payment_retry";

export interface ProviderResult {
  success: boolean;
  provider: string;
  reference: string;
  status: "sent" | "delivered" | "failed" | "simulated";
  detail: Record<string, unknown>;
  error?: string;
}

const token = (prefix: string) => `${prefix}_${randomBytes(5).toString("hex")}`;

function simulation(channel: ProviderChannel, recipient: string, detail: Record<string, unknown>): ProviderResult {
  return {
    success: true,
    provider: "simulation",
    reference: token(channel),
    status: "simulated",
    detail: { simulated: true, channel, recipient, ...detail },
  };
}

export async function sendSms(to: string, message: string): Promise<ProviderResult> {
  const isTwilio = env.SMS_PROVIDER === "twilio" || (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER);
  
  if (isTwilio && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const params = new URLSearchParams();
      params.append("To", to);
      params.append("From", env.TWILIO_PHONE_NUMBER);
      params.append("Body", message);

      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = (await resp.json()) as Record<string, any>;
      if (resp.ok) {
        logger.info({ sid: data.sid, to }, "Twilio SMS dispatched successfully");
        return {
          success: true,
          provider: "twilio",
          reference: data.sid || token("sms"),
          status: "sent",
          detail: { sid: data.sid, to, status: data.status },
        };
      } else {
        logger.warn({ error: data }, "Twilio SMS dispatch failed");
        return {
          success: false,
          provider: "twilio",
          reference: token("sms_failed"),
          status: "failed",
          error: data.message || "Twilio error",
          detail: data,
        };
      }
    } catch (err: any) {
      logger.error({ err }, "Error sending Twilio SMS");
      return {
        success: false,
        provider: "twilio",
        reference: token("sms_err"),
        status: "failed",
        error: err.message || "Network error",
        detail: { error: String(err) },
      };
    }
  }

  return simulation("sms", to, { message: message.slice(0, 160) });
}

export async function sendWhatsApp(to: string, message: string): Promise<ProviderResult> {
  const isTwilio = env.SMS_PROVIDER === "twilio" || (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM);

  if (isTwilio && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) {
    try {
      const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
      const formattedFrom = env.TWILIO_WHATSAPP_FROM.startsWith("whatsapp:")
        ? env.TWILIO_WHATSAPP_FROM
        : `whatsapp:${env.TWILIO_WHATSAPP_FROM}`;

      const params = new URLSearchParams();
      params.append("To", formattedTo);
      params.append("From", formattedFrom);
      params.append("Body", message);

      const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = (await resp.json()) as Record<string, any>;
      if (resp.ok) {
        logger.info({ sid: data.sid, to: formattedTo }, "Twilio WhatsApp message dispatched successfully");
        return {
          success: true,
          provider: "twilio_whatsapp",
          reference: data.sid || token("whatsapp"),
          status: "sent",
          detail: { sid: data.sid, to: formattedTo, status: data.status },
        };
      } else {
        logger.warn({ error: data }, "Twilio WhatsApp dispatch failed");
        return {
          success: false,
          provider: "twilio_whatsapp",
          reference: token("wa_failed"),
          status: "failed",
          error: data.message || "Twilio WhatsApp error",
          detail: data,
        };
      }
    } catch (err: any) {
      logger.error({ err }, "Error sending Twilio WhatsApp");
      return {
        success: false,
        provider: "twilio_whatsapp",
        reference: token("wa_err"),
        status: "failed",
        error: err.message || "Network error",
        detail: { error: String(err) },
      };
    }
  }

  return simulation("sms", to, { channel: "whatsapp", message });
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<ProviderResult> {
  if (env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL) {
    try {
      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: env.SENDGRID_FROM_EMAIL, name: "Recoverly Revenue Recovery" },
          subject,
          content: [
            { type: "text/plain", value: text || subject },
            { type: "text/html", value: html || `<p>${text || subject}</p>` },
          ],
        }),
      });

      if (resp.ok || resp.status === 202) {
        const msgId = resp.headers.get("x-message-id") || token("sendgrid");
        logger.info({ to, msgId }, "SendGrid email dispatched successfully");
        return {
          success: true,
          provider: "sendgrid",
          reference: msgId,
          status: "sent",
          detail: { to, message_id: msgId },
        };
      } else {
        const errText = await resp.text().catch(() => "");
        logger.warn({ status: resp.status, body: errText }, "SendGrid dispatch failed");
        return {
          success: false,
          provider: "sendgrid",
          reference: token("email_failed"),
          status: "failed",
          error: errText || "SendGrid error",
          detail: { status: resp.status, body: errText },
        };
      }
    } catch (err: any) {
      logger.error({ err }, "Error sending SendGrid email");
      return {
        success: false,
        provider: "sendgrid",
        reference: token("email_err"),
        status: "failed",
        error: err.message || "Network error",
        detail: { error: String(err) },
      };
    }
  }

  return simulation("email", to, { subject, html, text });
}

export async function retryPayment(providerPaymentId: string, amount: number): Promise<ProviderResult> {
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
    try {
      const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
      const resp = await fetch("https://api.razorpay.com/v1/payment_links", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Math.round(amount),
          currency: "INR",
          description: `Recoverly Automated Recovery for Payment ${providerPaymentId}`,
          notify: { sms: true, email: true },
        }),
      });

      const data = (await resp.json()) as Record<string, any>;
      if (resp.ok) {
        logger.info({ linkId: data.id, shortUrl: data.short_url }, "Razorpay recovery link created successfully");
        return {
          success: true,
          provider: "razorpay",
          reference: data.id || token("rzp"),
          status: "sent",
          detail: { short_url: data.short_url, id: data.id, amount },
        };
      } else {
        logger.warn({ error: data }, "Razorpay API error");
        return {
          success: false,
          provider: "razorpay",
          reference: token("rzp_failed"),
          status: "failed",
          error: data.error?.description || "Razorpay API failure",
          detail: data,
        };
      }
    } catch (err: any) {
      logger.error({ err }, "Error creating Razorpay payment link");
      return {
        success: false,
        provider: "razorpay",
        reference: token("rzp_err"),
        status: "failed",
        error: err.message || "Network error",
        detail: { error: String(err) },
      };
    }
  }

  return simulation("payment_retry", providerPaymentId, { amount, captured: false });
}

export async function startVoiceCall(to: string, prompt: string): Promise<ProviderResult> {
  return simulation("voice", to, { prompt });
}

export function providerHealth() {
  return {
    sms: {
      provider: env.SMS_PROVIDER,
      configured: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER),
    },
    whatsapp: {
      provider: "twilio_whatsapp",
      configured: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM),
    },
    email: {
      provider: env.EMAIL_PROVIDER,
      configured: Boolean(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL),
    },
    payment_retry: {
      provider: "razorpay",
      configured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
    },
    voice: {
      provider: "twilio",
      configured: Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER),
    },
  };
}
