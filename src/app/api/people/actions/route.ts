import { NextRequest, NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';
import { emitDomainEvent } from '@/lib/events/domainEvents';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status') || 'PENDING';

    let sql = `SELECT * FROM action_items WHERE 1=1`;
    const params: any[] = [];
    let idx = 1;

    if (status !== 'ALL') {
      sql += ` AND status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (role && role !== 'Admin') {
      sql += ` AND (assigned_to_role = $${idx} OR assigned_to_role IS NULL)`;
      params.push(role);
      idx++;
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const { rows } = await queryPeople(sql, params);
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, completed_by } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing id or status' }, { status: 400 });
    }

    const completedAt = status === 'COMPLETED' ? 'NOW()' : 'NULL';
    const { rows } = await queryPeople(`
      UPDATE action_items 
      SET status = $1, completed_at = ${completedAt}
      WHERE id = $2
      RETURNING *;
    `, [status, id]);

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    await emitDomainEvent('action_item.status_changed', 'action_items', id, {
      previous_status: 'PENDING',
      new_status: status,
      completed_by
    });

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
