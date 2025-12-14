/**
 * Firebase has been removed from this project as part of the migration to Vercel + Supabase.
 *
 * TODO(Supabase):
 * - Replace this module with Supabase client initialization (auth + database).
 * - Update imports across the app that previously depended on `auth` / `db`.
 *
 * Notes:
 * - We keep this file as a temporary compatibility shim to avoid breaking imports during the migration.
 * - Do NOT reintroduce Firebase SDK imports here.
 */

// Temporary placeholders (intentionally untyped / inert).
// If something still imports these at runtime, it should be refactored to Supabase.
export const app: unknown = null;
export const auth: unknown = null;
export const db: unknown = null;
