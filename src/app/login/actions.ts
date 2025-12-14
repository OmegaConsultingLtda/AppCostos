'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getOriginFromHeaders() {
  // Next.js 16: headers() is async.
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return 'http://localhost:3000';
  return `${proto}://${host}`;
}

function safeMsg(e: unknown) {
  return e instanceof Error ? e.message : 'Error desconocido';
}

function isNextRedirectError(e: unknown): boolean {
  // Next's redirect() throws an internal error with digest starting with "NEXT_REDIRECT".
  return (
    typeof e === 'object' &&
    e !== null &&
    'digest' in e &&
    typeof (e as { digest?: unknown }).digest === 'string' &&
    (e as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(`Login: ${error.message}`)}`);
    }
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    redirect(`/login?error=${encodeURIComponent(`Login: ${safeMsg(e)}`)}`);
  }

  redirect('/');
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  try {
    const supabase = await createSupabaseServerClient();
    const { error, data } = await supabase.auth.signUp({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(`Signup: ${error.message}`)}`);
    }

    // If email confirmation is enabled, session may be null.
    if (!data.session) {
      redirect(
        `/login?message=${encodeURIComponent('Revisa tu correo para confirmar tu cuenta.')}`,
      );
    }
  } catch (e) {
    if (isNextRedirectError(e)) throw e;
    redirect(`/login?error=${encodeURIComponent(`Signup: ${safeMsg(e)}`)}`);
  }

  redirect('/');
}

export async function signInWithGoogle(_formData?: FormData) {
  const supabase = await createSupabaseServerClient();
  const origin = await getOriginFromHeaders();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.url) {
    redirect(`/login?error=${encodeURIComponent('No se pudo iniciar OAuth (URL vacía).')}`);
  }

  redirect(data.url);
}


