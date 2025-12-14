import { login, signInWithGoogle, signup } from './actions';

type Props = {
  // Next.js 16: `searchParams` puede llegar como Promise (Sync Dynamic APIs).
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.243 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.969 3.031l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.88 19.51C14.655 15.108 18.956 12 24 12c3.059 0 5.842 1.154 7.969 3.031l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.332 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.142 0 9.835-1.977 13.377-5.197l-6.18-5.227C29.116 35.158 26.715 36 24 36c-5.223 0-9.62-3.317-11.283-7.946l-6.54 5.038C9.487 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.79 2.238-2.28 4.125-4.106 5.576h.003l6.18 5.227C36.943 39.203 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const error = sp.error;
  const message = sp.message;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-10 text-zinc-900 dark:from-zinc-950 dark:to-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Accede a AppCostos</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Inicia sesión o crea una cuenta para continuar.
          </p>
        </div>

        {(error || message) && (
          <div
            className={[
              'rounded-lg border px-4 py-3 text-sm',
              error
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200',
            ].join(' ')}
            role={error ? 'alert' : 'status'}
          >
            {error ?? message}
          </div>
        )}

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Default submit (Enter) logs in; the other buttons override via `formAction`. */}
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="tu@email.com"
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
              />
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <button
                type="submit"
                formAction={login}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Iniciar sesión
              </button>
              <button
                type="submit"
                formAction={signup}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Crear cuenta
              </button>
            </div>

            <div className="my-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">O continúa con</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <button
              type="submit"
              formAction={signInWithGoogle}
              formNoValidate
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
          Al continuar, aceptas nuestros términos y política de privacidad.
        </p>
      </div>
    </div>
  );
}


