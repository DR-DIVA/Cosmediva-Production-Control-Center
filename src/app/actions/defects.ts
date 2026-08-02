'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function saveDefect(defectData: {
  lot_id: string;
  process_id: string;
  defect_reason: string;
  quantity: number;
  unit: string;
}) {
  const adminClient = createAdminClient()
  
  // Create defect_log
  const { data, error } = await adminClient
    .from('defect_logs')
    .insert({
      lot_id: defectData.lot_id,
      process_id: defectData.process_id,
      defect_reason: defectData.defect_reason,
      quantity: defectData.quantity,
      unit: defectData.unit
      // reported_by is omitted for now, or we can fetch the user ID from the session, 
      // but adminClient bypasses RLS so we'll just let it be null or pass it if needed.
    })
    .select()

  if (error) {
    console.error('Error saving defect:', error)
    return { success: false, error: error.message }
  }

  // Also record in production_logs for visibility in the task history
  await adminClient.from('production_logs').insert({
    production_lot_id: defectData.lot_id,
    process_id: defectData.process_id,
    status: 'DEFECT',
    note: `[บันทึกของเสีย] ${defectData.defect_reason} - จำนวน ${defectData.quantity} ${defectData.unit}`,
    start_time: new Date().toISOString(),
    end_time: new Date().toISOString(),
    activity_date: new Date().toISOString()
  })

  // Revalidate relevant paths
  revalidatePath('/my-tasks/weighing')
  revalidatePath('/my-tasks/mixing')
  revalidatePath('/my-tasks/packing')
  revalidatePath('/my-tasks/pof')
  revalidatePath('/costing')

  return { success: true, data: data[0] }
}


export async function getDefects() {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('defect_logs')
    .select(`
      *,
      process:processes(id, process_name),
      lot:production_lots(id, lot_no, sku_id, products:sku_id(sku, product_name))
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching defects:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateDefectCost(defectId: string, costPerUnit: number) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('defect_logs')
    .update({ 
      cost_per_unit: costPerUnit,
      updated_at: new Date().toISOString()
    })
    .eq('id', defectId)
    .select()

  if (error) {
    console.error('Error updating defect cost:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/costing/defects')
  return { success: true, data: data[0] }
}
