import { NextResponse } from 'next/server';
import { queryPeople } from '@/lib/peopleDb';

export async function GET(request: Request) {
  try {
    const policies = await queryPeople(`
      SELECT 
        lp.*,
        lt.type_code,
        lt.name_th,
        lt.name_en,
        lt.color_code,
        lt.is_paid as type_is_paid
      FROM leave_policies lp
      JOIN leave_types lt ON lp.leave_type_id = lt.id
      ORDER BY lt.sort_order ASC, lt.name_th ASC;
    `);

    const schedules = await queryPeople(`
      SELECT * FROM work_schedules ORDER BY schedule_name;
    `);

    const shifts = await queryPeople(`
      SELECT * FROM shifts ORDER BY start_time;
    `);

    const holidays = await queryPeople(`
      SELECT * FROM holidays WHERE is_active = TRUE ORDER BY holiday_date ASC;
    `);

    const settings = await queryPeople(`
      SELECT * FROM system_settings ORDER BY setting_key;
    `);

    return NextResponse.json({
      success: true,
      policies: policies.rows,
      schedules: schedules.rows,
      shifts: shifts.rows,
      holidays: holidays.rows,
      settings: settings.rows
    });
  } catch (error: any) {
    console.error('Error fetching policies:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      annual_entitlement,
      minimum_notice_days,
      carry_forward_allowed,
      max_carry_forward,
      max_consecutive_days,
      attachment_required,
      attachment_required_after_days,
      paid_unpaid
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Policy ID is required' }, { status: 400 });
    }

    const res = await queryPeople(`
      UPDATE leave_policies 
      SET 
        annual_entitlement = COALESCE($1, annual_entitlement),
        minimum_notice_days = COALESCE($2, minimum_notice_days),
        carry_forward_allowed = COALESCE($3, carry_forward_allowed),
        max_carry_forward = COALESCE($4, max_carry_forward),
        max_consecutive_days = COALESCE($5, max_consecutive_days),
        attachment_required = COALESCE($6, attachment_required),
        attachment_required_after_days = COALESCE($7, attachment_required_after_days),
        paid_unpaid = COALESCE($8, paid_unpaid),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *;
    `, [
      annual_entitlement !== undefined ? annual_entitlement : null,
      minimum_notice_days !== undefined ? minimum_notice_days : null,
      carry_forward_allowed !== undefined ? carry_forward_allowed : null,
      max_carry_forward !== undefined ? max_carry_forward : null,
      max_consecutive_days !== undefined ? max_consecutive_days : null,
      attachment_required !== undefined ? attachment_required : null,
      attachment_required_after_days !== undefined ? attachment_required_after_days : null,
      paid_unpaid || null,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: 'ปรับปรุงนโยบายการลาสำเร็จเรียบร้อยแล้ว (มีผลทันที)',
      data: res.rows[0]
    });
  } catch (error: any) {
    console.error('Error updating policy:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
