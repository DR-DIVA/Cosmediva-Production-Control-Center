def append_defects_action():
    with open(r'src/app/actions/defects.ts', 'a', encoding='utf-8') as f:
        f.write('''

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
''')

append_defects_action()
