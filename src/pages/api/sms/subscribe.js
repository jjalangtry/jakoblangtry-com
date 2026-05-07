import crypto from "node:crypto";

const CONSENT_TEXT =
  "I agree to receive SMS notifications from lab86 / Jakob Langtry at the phone number provided. Message frequency varies. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out or HELP for help. See the Terms and Privacy Policy.";

const INTERESTS = new Set([
  "server_alerts",
  "daily_briefs",
  "project_notifications",
  "support_responses",
]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function normalizePhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");

  if (raw.startsWith("+") && /^\+\d{10,15}$/.test(raw.replace(/[^\d+]/g, ""))) {
    return raw.replace(/[^\d+]/g, "");
  }

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return "";
}

function hashIp(ip) {
  const salt = process.env.SMS_CONSENT_IP_HASH_SALT || "";
  if (!salt || !ip) return "";

  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function signPayload(secret, timestamp, body) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

async function readSubmission(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const form = await request.formData();
  return {
    phone: form.get("phone"),
    name: form.get("name"),
    consent: form.get("consent"),
    website: form.get("website"),
    interests: form.getAll("interests"),
  };
}

export async function POST({ request, clientAddress }) {
  const bridgeUrl =
    process.env.SMS_BRIDGE_SIGNUP_URL ||
    "https://sms.jjalangtry.com/signup/sms";
  const secret = process.env.SMS_BRIDGE_SIGNUP_SECRET;

  if (!secret) {
    return json(
      {
        ok: false,
        error:
          "SMS signup is not configured yet. Please email jjalangtry@gmail.com.",
      },
      503,
    );
  }

  let submission;
  try {
    submission = await readSubmission(request);
  } catch {
    return json({ ok: false, error: "Invalid signup request." }, 400);
  }

  if (String(submission.website || "").trim()) {
    return json({ ok: true });
  }

  const phone = normalizePhone(submission.phone);
  if (!phone) {
    return json(
      {
        ok: false,
        error: "Enter a valid US or Canada mobile phone number.",
      },
      400,
    );
  }

  if (submission.consent !== "yes" && submission.consent !== true) {
    return json(
      {
        ok: false,
        error:
          "You must agree to receive lab86 SMS notifications before submitting.",
      },
      400,
    );
  }

  const selectedInterests = Array.isArray(submission.interests)
    ? submission.interests.filter((interest) => INTERESTS.has(interest))
    : [];

  const payload = {
    phone,
    name: String(submission.name || "")
      .trim()
      .slice(0, 120),
    interests: selectedInterests,
    source: "https://jjalangtry.com/sms",
    consentText: CONSENT_TEXT,
    consentChecked: true,
    submittedAt: new Date().toISOString(),
    ipHash: hashIp(clientAddress || request.headers.get("x-forwarded-for")),
    userAgent: request.headers.get("user-agent") || "",
  };

  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = signPayload(secret, timestamp, body);

  let bridgeResponse;
  try {
    bridgeResponse = await fetch(bridgeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lab86-timestamp": timestamp,
        "x-lab86-signature": `sha256=${signature}`,
      },
      body,
    });
  } catch {
    return json(
      {
        ok: false,
        error: "SMS signup is temporarily unavailable. Please try again later.",
      },
      502,
    );
  }

  if (!bridgeResponse.ok) {
    return json(
      {
        ok: false,
        error: "SMS signup could not be completed. Please try again later.",
      },
      502,
    );
  }

  return json({
    ok: true,
    message:
      "Check your phone and reply YES to confirm lab86 SMS notifications.",
  });
}

export function ALL() {
  return json({ ok: false, error: "Method not allowed." }, 405);
}
