def append_costing_logic():
    with open('src/app/actions/costing.ts', 'a', encoding='utf-8') as f:
        f.write('''

// --- LOT COSTING & PROFITABILITY ---

export async function getLotCostings() {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('lot_costing')
    .select(`
      *,
      lot:production_lots (
        id,
        lot_no,
        products:sku_id(
          id,
          name,
          sku
        )
      )
    `)
    .order('calculated_at', { ascending: false })

  if (error) {
    console.error('Error fetching Lot Costings:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function calculateLotCost(lot_id: string) {
  const adminClient = createAdminClient()
  
  try {
    // 1. Get Lot info
    const { data: lotData, error: lotError } = await adminClient
      .from('production_lots')
      .select('id, sku_id, total_quantity, status')
      .eq('id', lot_id)
      .single()
      
    if (lotError || !lotData) throw new Error('Lot not found')
    
    // 2. Get BOM & Selling Price
    const { data: bomData } = await adminClient
      .from('product_bom')
      .select('*')
      .eq('product_id', lotData.sku_id)
      .single()
      
    const total_cost_per_piece = bomData?.total_cost_per_piece || 0
    const selling_price = bomData?.selling_price || 0
    
    // We assume total_quantity is the Good produced quantity (or planned if not finished)
    // To be more accurate, we should probably check if there is an 'actual_quantity' field, but for now we use total_quantity
    const produced_qty = lotData.total_quantity || 0
    
    const actual_material_cost = produced_qty * total_cost_per_piece
    const revenue = produced_qty * selling_price
    
    // 3. Get Labor & Overhead Rates
    const { data: laborRates } = await adminClient.from('labor_rates').select('*')
    const { data: ohRates } = await adminClient.from('overhead_rates').select('*')
    
    const laborRateMap = new Map(laborRates?.map((r: any) => [r.process_id, r.hourly_rate]) || [])
    const ohRateMap = new Map(ohRates?.map((r: any) => [r.process_id, r.hourly_rate]) || [])
    
    // 4. Calculate Actual Time from production_logs
    const { data: logs } = await adminClient
      .from('production_logs')
      .select('*')
      .eq('lot_id', lot_id)
      
    let actual_labor_cost = 0
    let actual_overhead_cost = 0
    
    if (logs && logs.length > 0) {
      // Group by task_id to find start and end times
      const taskTimes: Record<string, { start: Date | null, end: Date | null, process_id: string }> = {}
      
      logs.forEach((log: any) => {
        if (!taskTimes[log.task_id]) {
          taskTimes[log.task_id] = { start: null, end: null, process_id: log.process_id }
        }
        if (log.action === 'IN_PROGRESS' || log.action === 'SOAKING') {
          if (!taskTimes[log.task_id].start) taskTimes[log.task_id].start = new Date(log.created_at)
        }
        if (log.action === 'COMPLETED') {
          taskTimes[log.task_id].end = new Date(log.created_at)
        }
      })
      
      // Calculate hours and cost
      Object.values(taskTimes).forEach(task => {
        if (task.start && task.end) {
          const hours = (task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60)
          const lRate = laborRateMap.get(task.process_id) || 0
          const oRate = ohRateMap.get(task.process_id) || 0
          
          actual_labor_cost += hours * lRate
          actual_overhead_cost += hours * oRate
        }
      })
    }
    
    // 5. Get Defect Costs
    const { data: defects } = await adminClient
      .from('defect_logs')
      .select('quantity, cost_per_unit')
      .eq('lot_id', lot_id)
      
    let defect_cost = 0
    if (defects) {
      defects.forEach((d: any) => {
        const costPerUnit = d.cost_per_unit || 0
        defect_cost += d.quantity * costPerUnit
      })
    }
    
    // 6. Aggregate Total
    const total_cost = actual_material_cost + actual_labor_cost + actual_overhead_cost + defect_cost
    const cost_per_unit = produced_qty > 0 ? total_cost / produced_qty : 0
    const net_profit = revenue - total_cost
    
    // 7. Save to lot_costing
    const { data: saved, error: saveError } = await adminClient
      .from('lot_costing')
      .upsert({
        lot_id,
        total_produced_qty: produced_qty,
        actual_material_cost,
        actual_labor_cost,
        actual_overhead_cost,
        defect_cost,
        total_cost,
        cost_per_unit,
        revenue,
        net_profit,
        status: 'CALCULATED',
        calculated_at: new Date().toISOString()
      }, { onConflict: 'lot_id' })
      .select()
      
    if (saveError) throw new Error(saveError.message)
    
    revalidatePath('/costing')
    return { success: true, data: saved[0] }
    
  } catch (error: any) {
    console.error('Error calculating lot cost:', error)
    return { success: false, error: error.message }
  }
}
''')

append_costing_logic()
