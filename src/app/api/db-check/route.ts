import 'server-only';

import { NextResponse } from 'next/server';
import { sql } from '@/db';

export async function GET() {
  const ping = await sql<{ ok: number }[]>`select 1 as ok`;

  const tables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
    limit 50
  `;

  let usersCount: number | null = null;
  try {
    const r = await sql<{ count: number }[]>`select count(*)::int as count from users`;
    usersCount = r[0]?.count ?? null;
  } catch {
    // ignore if table doesn't exist
  }

  let transactionsCount: number | null = null;
  try {
    const r = await sql<{ count: number }[]>`select count(*)::int as count from transactions`;
    transactionsCount = r[0]?.count ?? null;
  } catch {
    // ignore if table doesn't exist
  }

  return NextResponse.json({
    ok: true,
    ping: ping[0]?.ok ?? 1,
    tables: tables.map((t) => t.table_name),
    usersCount,
    transactionsCount,
  });
}


