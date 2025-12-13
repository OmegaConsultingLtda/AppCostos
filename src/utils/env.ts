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
  return process.env.NEXT_PUBLIC_ENV === 'qa';
}

