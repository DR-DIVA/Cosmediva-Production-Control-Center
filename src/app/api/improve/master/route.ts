import { NextResponse } from 'next/server';
import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

function getClient() {
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

export async function GET() {
  const client = getClient();
  try {
    await client.connect();

    const [deptRes, lineRes, stationRes, wasteRes, rateRes] = await Promise.all([
      client.query(`SELECT id, department_code, department_name FROM departments WHERE is_active = true ORDER BY department_name`),
      client.query(`SELECT id, department_id, line_code, line_name FROM improve_lines WHERE is_active = true ORDER BY line_name`),
      client.query(`SELECT id, line_id, station_code, station_name, sequence_order FROM improve_stations WHERE is_active = true ORDER BY sequence_order`),
      client.query(`SELECT id, code, name_en, name_th, type, description, color_code FROM improve_waste_categories WHERE is_active = true ORDER BY type, name_en`),
      client.query(`SELECT id, rate_code, rate_name, rate_type, amount_thb, unit FROM improve_cost_rates ORDER BY rate_type, rate_name`)
    ]);

    await client.end();

    return NextResponse.json({
      success: true,
      data: {
        departments: deptRes.rows,
        lines: lineRes.rows,
        stations: stationRes.rows,
        wasteCategories: wasteRes.rows,
        costRates: rateRes.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching improve master data:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = getClient();
  try {
    const body = await request.json();
    const { type, name, department_id, line_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    await client.connect();

    if (type === 'DEPARTMENT') {
      const code = `D-${Date.now().toString().slice(-4)}`;
      const res = await client.query(`
        INSERT INTO departments (department_code, department_name, is_active)
        VALUES ($1, $2, true)
        RETURNING id, department_code, department_name
      `, [code, name.trim()]);
      await client.end();
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    if (type === 'LINE') {
      const code = `L-${Date.now().toString().slice(-4)}`;
      const res = await client.query(`
        INSERT INTO improve_lines (department_id, line_code, line_name, is_active)
        VALUES ($1, $2, $3, true)
        RETURNING id, department_id, line_code, line_name
      `, [department_id || null, code, name.trim()]);
      await client.end();
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    if (type === 'STATION') {
      const code = `ST-${Date.now().toString().slice(-4)}`;
      const countRes = await client.query(`SELECT COUNT(*) FROM improve_stations WHERE line_id = $1`, [line_id || null]);
      const nextSeq = parseInt(countRes.rows[0]?.count || '0', 10) + 1;

      const res = await client.query(`
        INSERT INTO improve_stations (line_id, station_code, station_name, sequence_order, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id, line_id, station_code, station_name, sequence_order
      `, [line_id || null, code, name.trim(), nextSeq]);
      await client.end();
      return NextResponse.json({ success: true, data: res.rows[0] });
    }

    await client.end();
    return NextResponse.json({ success: false, error: 'Invalid type specified' }, { status: 400 });
  } catch (error: any) {
    console.error('Error creating master data:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

