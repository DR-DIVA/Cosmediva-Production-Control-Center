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
