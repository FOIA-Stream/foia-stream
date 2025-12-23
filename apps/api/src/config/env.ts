// ============================================
// FOIA Stream - Environment Configuration
// ============================================

import { ParseResult, Schema as S } from 'effect';

const EnvSchema = S.Struct({
  // Server
  PORT: S.NumberFromString.pipe(S.optionalWith({ default: () => 3000 })),
  HOST: S.String.pipe(S.optionalWith({ default: () => '0.0.0.0' })),
  NODE_ENV: S.Literal('development', 'production', 'test').pipe(
    S.optionalWith({ default: () => 'development' as const }),
  ),

  // Database
  DATABASE_URL: S.String.pipe(S.optionalWith({ default: () => './data/foia-stream.db' })),

  // Authentication
  JWT_SECRET: S.String.pipe(
    S.minLength(32),
    S.optionalWith({ default: () => 'change-this-secret-in-production-min-32-chars' }),
  ),
  JWT_EXPIRES_IN: S.String.pipe(S.optionalWith({ default: () => '7d' })),

  // File uploads
  UPLOAD_DIR: S.String.pipe(S.optionalWith({ default: () => './uploads' })),
  MAX_FILE_SIZE: S.NumberFromString.pipe(S.optionalWith({ default: () => 100 * 1024 * 1024 })), // 100MB

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: S.NumberFromString.pipe(S.optionalWith({ default: () => 60000 })), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: S.NumberFromString.pipe(S.optionalWith({ default: () => 100 })),

  // CORS
  CORS_ORIGIN: S.String.pipe(S.optionalWith({ default: () => '*' })),
});

export type Env = typeof EnvSchema.Type;

function loadEnv(): Env {
  const result = S.decodeUnknownEither(EnvSchema)(process.env);

  if (result._tag === 'Left') {
    console.error('❌ Invalid environment variables:');
    const message = ParseResult.TreeFormatter.formatErrorSync(result.left);
    console.error(`  ${message}`);
    process.exit(1);
  }

  return result.right;
}

export const env = loadEnv();
