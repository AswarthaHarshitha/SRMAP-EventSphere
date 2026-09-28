const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function readConfig() {
  const env = process.env;
  const isProduction = env.NODE_ENV === "production";

  return {
    isProduction,
    isTest: env.NODE_ENV === "test",
    port: Number(env.PORT) || 5000,
    databaseUrl: env.DATABASE_URL || null,
    jwtSecret: env.JWT_SECRET || null,
    jwtExpiresInDays: Number(env.JWT_EXPIRES_IN_DAYS) || 7,
    /** Public origin of the web app, e.g. https://eventsphere.example.com */
    appUrl: env.APP_URL?.replace(/\/$/, "") || null,
    /** Extra origins allowed to call the API with credentials (split deployments only). */
    corsOrigins: list(env.CORS_ORIGINS),
    /** When set, only these email domains may sign up (e.g. srmap.edu.in). */
    allowedEmailDomains: list(env.ALLOWED_EMAIL_DOMAINS).map((d) => d.toLowerCase()),
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID || null,
      keySecret: env.RAZORPAY_KEY_SECRET || null,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || null,
    },
    smtp: {
      host: env.SMTP_HOST || null,
      port: Number(env.SMTP_PORT) || 587,
      user: env.SMTP_USER || null,
      pass: env.SMTP_PASS || null,
      from: env.EMAIL_FROM || null,
    },
  };
}

export type AppConfig = ReturnType<typeof readConfig>;

let cached: AppConfig | null = null;

export function config(): AppConfig {
  cached ??= readConfig();
  return cached;
}

/** Tests change environment variables between cases; this forces a re-read. */
export function resetConfig() {
  cached = null;
}

export function paymentsEnabled() {
  const { keyId, keySecret } = config().razorpay;
  return Boolean(keyId && keySecret);
}

/** Problems that make the deployment unusable; reported at startup and by the health check. */
export function configProblems(): string[] {
  const c = config();
  const problems: string[] = [];
  if (!c.databaseUrl) problems.push("DATABASE_URL is not set");
  if (!c.jwtSecret) problems.push("JWT_SECRET is not set");
  else if (c.isProduction && c.jwtSecret.length < 32) problems.push("JWT_SECRET must be at least 32 characters");
  return problems;
}
