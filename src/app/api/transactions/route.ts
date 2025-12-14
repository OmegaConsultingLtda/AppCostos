import 'server-only';

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type TxInput = {
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense_debit' | 'expense_credit';
  category: string;
  subcategory?: string | null;
  cardId?: number | null;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = (await request.json()) as Partial<TxInput>;

  if (!body.description || typeof body.description !== 'string') {
    return NextResponse.json({ error: 'Descripción inválida' }, { status: 400 });
  }
  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount)) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  }
  if (!body.date || typeof body.date !== 'string') {
    return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
  }
  if (!body.type || typeof body.type !== 'string') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }
  if (!body.category || typeof body.category !== 'string') {
    return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 });
  }

  const baseRow = {
    description: body.description,
    amount: body.amount,
    date: body.date,
    type: body.type,
    category: body.category,
    subcategory: body.subcategory ?? null,
    card_id: body.cardId ?? null,
  };

  // Different DB schemas may use `user_id` or `auth_id` for ownership.
  const candidates: Array<'user_id' | 'auth_id'> = ['user_id', 'auth_id'];

  let lastError: string | null = null;

  for (const col of candidates) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...baseRow, [col]: user.id } as any])
      .select()
      .maybeSingle();

    if (!error) {
      return NextResponse.json({ ok: true, data });
    }

    lastError = error.message;

    // Retry with the other column if this one doesn't exist.
    if (
      /column/i.test(error.message) &&
      (error.message.includes(col) || error.message.includes(`"${col}"`))
    ) {
      continue;
    }

    // Otherwise, fail fast (likely RLS or constraint).
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      error:
        lastError ??
        'No se pudo insertar: no se encontró una columna de ownership (user_id/auth_id) en transactions.',
    },
    { status: 400 },
  );
}


