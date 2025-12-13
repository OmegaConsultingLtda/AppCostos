// Environment detection utility (strictly via NEXT_PUBLIC_ENV).
// Allowed values: "qa" | "production"

export const PUBLIC_ENVS = ['qa', 'production'] as const;
export type PublicEnv = (typeof PUBLIC_ENVS)[number];

export function getPublicEnv(): PublicEnv | undefined {
  const value = process.env.NEXT_PUBLIC_ENV;
  if (!value) return undefined;
  return (PUBLIC_ENVS as readonly string[]).includes(value) ? (value as PublicEnv) : undefined;
}

// Requirement: true only if NEXT_PUBLIC_ENV === 'production'
export function isProduction(): boolean {
  return process.env.NEXT_PUBLIC_ENV === 'production';
}

export function isQAEnvironment(): boolean {
  // Keep the old developer-friendly behavior: local dev defaults to QA tools enabled,
  // unless the developer explicitly sets NEXT_PUBLIC_ENV to "production".
  const raw = process.env.NEXT_PUBLIC_ENV;
  if (raw === 'qa') return true;
  if (raw === 'production') return false;

  // If it's set but invalid, do NOT fall back to NODE_ENV (avoid accidental QA enablement).
  if (typeof raw === 'string' && raw.length > 0) return false;

  // If it's unset, keep the local dev convenience default.
  return process.env.NODE_ENV === 'development';
}

