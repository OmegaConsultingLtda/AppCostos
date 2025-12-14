import 'server-only';

import { NextResponse } from 'next/server';
import { db, sql } from '@/db';

export async function GET() {
  const ping = await db.execute(sql`select 1 as ok`);

  const tables = await db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
    limit 50
  `);

  let usersCount: number | null = null;
  try {
    const r = await db.execute(sql`select count(*)::int as count from users`);
    usersCount = (r as Array<{ count: number }>)[0]?.count ?? null;
  } catch {
    // ignore if table doesn't exist
  }

  let transactionsCount: number | null = null;
  try {
    const r = await db.execute(sql`select count(*)::int as count from transactions`);
    transactionsCount = (r as Array<{ count: number }>)[0]?.count ?? null;
  } catch {
    // ignore if table doesn't exist
  }

  return NextResponse.json({
    ok: true,
    ping: (ping as Array<{ ok: number }>)[0]?.ok ?? 1,
    tables,
    usersCount,
    transactionsCount,
  });
}


