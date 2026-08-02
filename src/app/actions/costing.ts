'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

// --- PRODUCT BOM ---

export async function getProductBOMs() {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('product_bom')
    .select(`
      *,
      product:products (
        id,
        name,
        sku
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching Product BOMs:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function saveProductBOM(bomData: any) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('product_bom')
    .upsert({
      product_id: bomData.product_id,
      formula_cost_per_kg: bomData.formula_cost_per_kg,
      amount_g_per_piece: bomData.amount_g_per_piece,
      formula_cost_per_piece: (bomData.formula_cost_per_kg * bomData.amount_g_per_piece) / 1000,
      packaging_cost_per_piece: bomData.packaging_cost_per_piece,
      selling_price: bomData.selling_price || 0,
      total_cost_per_piece: ((bomData.formula_cost_per_kg * bomData.amount_g_per_piece) / 1000) + bomData.packaging_cost_per_piece,
      updated_at: new Date().toISOString()
    }, { onConflict: 'product_id' })
    .select()

  if (error) {
    console.error('Error saving Product BOM:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/costing')
  return { success: true, data: data[0] }
}

// --- LABOR RATES ---

export async function getLaborRates() {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('labor_rates')
    .select(`
      *,
      process:processes (
        id,
        name
      )
    `)

  if (error) {
    console.error('Error fetching Labor Rates:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function saveLaborRate(process_id: string, hourly_rate: number) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('labor_rates')
    .upsert({
      process_id,
      hourly_rate,
      updated_at: new Date().toISOString()
    }, { onConflict: 'process_id' })

  if (error) {
    console.error('Error saving Labor Rate:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/costing')
  return { success: true, data }
}

// --- OVERHEAD RATES ---

export async function getOverheadRates() {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('overhead_rates')
    .select(`
      *,
      process:processes (
        id,
        name
      )
    `)

  if (error) {
    console.error('Error fetching Overhead Rates:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function saveOverheadRate(process_id: string, hourly_rate: number) {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('overhead_rates')
    .upsert({
      process_id,
      hourly_rate,
      updated_at: new Date().toISOString()
    }, { onConflict: 'process_id' })

  if (error) {
    console.error('Error saving Overhead Rate:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/costing')
  return { success: true, data }
}

// --- LOT COSTING ---

export async function getLotCostings() {
  const adminClient = createAdminClient()
  
  const { data, error } = await adminClient
    .from('lot_costing')
    .select(`
      *,
      lot:production_lots (
        id,
        lot_no,
        status,
        product:products (
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


// --- LOT COSTING & PROFITABILITY ---


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
