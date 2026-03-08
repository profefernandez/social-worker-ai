const REQUIRED_ENV = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
];

const MISTRAL_ENV = [
  'MISTRAL_API_KEY',
  'MISTRAL_AGENT_ID',
  'MISTRAL_KIDDO_AGENT_ID',
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in the values.'
    );
  }

  const missingMistral = MISTRAL_ENV.filter((key) => !process.env[key]);
  if (missingMistral.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `WARNING: Missing Mistral env vars (AI features disabled): ${missingMistral.join(', ')}`
    );
  }

  if (process.env.DEMO_MODE === 'true' && process.env.NODE_ENV === 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: DEMO_MODE is enabled in production. ' +
      'This allows unauthenticated session creation. ' +
      'Set DEMO_MODE=false for production use.'
    );
  }

  return true;
}

module.exports = { validateEnv };
