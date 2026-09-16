import { NextResponse } from 'next/server';
import pg from 'pg';

const dbPassword = encodeURIComponent('/Qaz7410/Yc8gre4u');
const connectionString = `postgres://postgres.yzwldawflteyywuetzcw:${dbPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

function getClient() {
  return new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const client = getClient();
  try {
    const body = await request.json();
    const { file_url, file_name, file_size, mime_type, media_type } = body;

    if (!file_url) {
      return NextResponse.json({ success: false, error: 'File URL is required' }, { status: 400 });
    }

    await client.connect();

    const res = await client.query(`
      INSERT INTO improve_observation_media (
        observation_id, media_type, file_url, file_name, file_size, mime_type
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      id,
      media_type || 'PHOTO',
      file_url,
      file_name || 'attachment',
      file_size || 0,
      mime_type || ''
    ]);

    await client.end();
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    console.error('Error attaching media to observation:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get('mediaId');
  const client = getClient();

  try {
    await client.connect();
    if (mediaId) {
      await client.query(`DELETE FROM improve_observation_media WHERE id = $1 AND observation_id = $2`, [mediaId, id]);
    } else {
      await client.query(`DELETE FROM improve_observation_media WHERE observation_id = $1 AND file_url LIKE 'blob:%'`, [id]);
    }
    await client.end();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting media:', error);
    try { await client.end(); } catch {}
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
