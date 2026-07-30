'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Save, RefreshCw } from 'lucide-react'
import { getLaborRates, getOverheadRates, saveLaborRate, saveOverheadRate } from '@/app/actions/costing'

export default function StandardCostSetupPage() {
  const [processes, setProcesses] = useState<any[]>([])
  const [laborRates, setLaborRates] = useState<Record<string, number>>({})
  const [overheadRates, setOverheadRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch all processes
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .select('*')

      if (processError) throw processError
      setProcesses(processData || [])

      // 2. Fetch Labor Rates
      const laborRes = await getLaborRates()
      if (laborRes.success && laborRes.data) {
        const rates: Record<string, number> = {}
        laborRes.data.forEach((r: any) => {
          rates[r.process_id] = Number(r.hourly_rate)
        })
        setLaborRates(rates)
      }

      // 3. Fetch Overhead Rates
      const overheadRes = await getOverheadRates()
      if (overheadRes.success && overheadRes.data) {
        const rates: Record<string, number> = {}
        overheadRes.data.forEach((r: any) => {
          rates[r.process_id] = Number(r.hourly_rate)
        })
        setOverheadRates(rates)
      }

    } catch (error: any) {
      toast.error('Failed to load standard costs: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLaborChange = (processId: string, value: string) => {
    setLaborRates(prev => ({ ...prev, [processId]: Number(value) }))
  }

  const handleOverheadChange = (processId: string, value: string) => {
    setOverheadRates(prev => ({ ...prev, [processId]: Number(value) }))
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const promises = []
      
      // Save Labor Rates
      for (const [processId, rate] of Object.entries(laborRates)) {
        promises.push(saveLaborRate(processId, rate))
      }
      
      // Save Overhead Rates
      for (const [processId, rate] of Object.entries(overheadRates)) {
        promises.push(saveOverheadRate(processId, rate))
      }

      await Promise.all(promises)
      toast.success('บันทึกต้นทุนมาตรฐานสำเร็จ')
      fetchData()
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Standard Cost Setup</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Button onClick={handleSaveAll} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Labor Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Direct Labor Rates (ค่าแรงทางตรง)</CardTitle>
            <CardDescription>
              กำหนดอัตราค่าแรงเฉลี่ยต่อชั่วโมงของแต่ละแผนก (บาท/ชม.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4">
                {processes.map((process) => (
                  <div key={`labor-${process.id}`} className="flex items-center justify-between">
                    <span className="font-medium">{process.name}</span>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        className="w-32 text-right"
                        value={laborRates[process.id] || 0}
                        onChange={(e) => handleLaborChange(process.id, e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">บาท/ชม.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overhead Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Overhead Rates (ค่าโสหุ้ย)</CardTitle>
            <CardDescription>
              กำหนดอัตราค่าใช้จ่ายการผลิตปันส่วนต่อชั่วโมงของแต่ละแผนก (บาท/ชม.)
            </CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
              <div className="flex justify-center p-4"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4">
                {processes.map((process) => (
                  <div key={`overhead-${process.id}`} className="flex items-center justify-between">
                    <span className="font-medium">{process.name}</span>
                    <div className="flex items-center space-x-2">
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01"
                        className="w-32 text-right"
                        value={overheadRates[process.id] || 0}
                        onChange={(e) => handleOverheadChange(process.id, e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">บาท/ชม.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
