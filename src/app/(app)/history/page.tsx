'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { ChecklistEntry } from '@/lib/types'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ChecklistTable } from '@/components/checklist/ChecklistTable'
import { ChecklistCards } from '@/components/checklist/ChecklistCards'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search, RefreshCw, LayoutList, Table2,
  ChevronLeft, ChevronRight, Calendar, History
} from 'lucide-react'

export default function HistoryPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<ChecklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [dateFrom, setDateFrom] = useState(
    format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd')
  )
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('checklist_entries')
      .select('*')
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(
        `contractor_name.ilike.%${search}%,company_name.ilike.%${search}%,activity_name.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) toast.error('โหลดข้อมูลไม่สำเร็จ')
    else setEntries(data ?? [])
    setLoading(false)
  }, [dateFrom, dateTo, search])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('checklist_entries').delete().eq('id', id)
    if (error) toast.error('ลบไม่สำเร็จ')
    else { toast.success('ลบรายการแล้ว'); fetchEntries() }
  }

  const handleCheckout = async (id: string) => {
    const now = format(new Date(), 'HH:mm')
    const { error } = await supabase.from('checklist_entries').update({ status: 'checked_out', check_out_time: now }).eq('id', id)
    if (error) toast.error('Check-out ไม่สำเร็จ')
    else { toast.success('Check-out สำเร็จ'); fetchEntries() }
  }

  const totalDays = [...new Set(entries.map(e => e.entry_date))].length

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" /> ประวัติการเข้าโครงการ
        </h1>
        <p className="text-sm text-muted-foreground">ค้นหาและดูข้อมูลย้อนหลัง</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'รายการทั้งหมด', value: entries.length, color: 'text-blue-600' },
          { label: 'จำนวนวัน', value: totalDays, color: 'text-green-600' },
          { label: 'ALC เกิน', value: entries.filter(e => e.alc_result === '>0%').length, color: 'text-red-600' },
          { label: 'บัญชีดำ', value: entries.filter(e => e.is_blacklisted).length, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-3">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white border border-border rounded-xl px-3 py-2 shadow-sm">
          <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="text-sm bg-transparent border-none outline-none cursor-pointer"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="text-sm bg-transparent border-none outline-none cursor-pointer"
          />
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white shadow-sm"
          />
        </div>

        <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'table' | 'cards')}>
          <TabsList className="bg-white border border-border shadow-sm">
            <TabsTrigger value="table"><Table2 className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="cards"><LayoutList className="w-4 h-4" /></TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="icon" onClick={fetchEntries} className="shrink-0 shadow-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {viewMode === 'table' ? (
        <ChecklistTable entries={entries} loading={loading} onDelete={handleDelete} onCheckout={handleCheckout} />
      ) : (
        <ChecklistCards entries={entries} loading={loading} onDelete={handleDelete} onCheckout={handleCheckout} />
      )}
    </div>
  )
}
