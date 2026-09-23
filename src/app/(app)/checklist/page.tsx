'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistEntry } from '@/lib/types'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { toast } from 'sonner'

import { ChecklistTable } from '@/components/checklist/ChecklistTable'
import { ChecklistCards } from '@/components/checklist/ChecklistCards'
import {
  Plus, Search, RefreshCw, LayoutGrid, TableProperties,
  ChevronLeft, ChevronRight, CalendarDays, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

export default function ChecklistPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<ChecklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('checklist_entries').select('*')
      .eq('entry_date', date).order('created_at', { ascending: true })
    if (search) q = q.or(
      `contractor_name.ilike.%${search}%,company_name.ilike.%${search}%,supervisor.ilike.%${search}%,activity_name.ilike.%${search}%`
    )
    const { data, error } = await q
    if (error) toast.error('โหลดข้อมูลไม่สำเร็จ')
    else setEntries(data ?? [])
    setLoading(false)
  }, [date, search])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  useEffect(() => {
    const ch = supabase.channel('cl_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_entries' }, fetchEntries)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchEntries])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('checklist_entries').delete().eq('id', id)
    if (error) toast.error('ลบไม่สำเร็จ')
    else { toast.success('ลบรายการแล้ว'); fetchEntries() }
  }

  const handleCheckout = async (id: string) => {
    const now = format(new Date(), 'HH:mm')
    const { error } = await supabase.from('checklist_entries')
      .update({ status: 'checked_out', check_out_time: now }).eq('id', id)
    if (error) toast.error('Check-out ไม่สำเร็จ')
    else { toast.success('Check-out สำเร็จ'); fetchEntries() }
  }

  const shiftDate = (d: -1 | 1) => {
    const dt = new Date(date); dt.setDate(dt.getDate() + d)
    setDate(format(dt, 'yyyy-MM-dd'))
  }

  const isToday = date === format(new Date(), 'yyyy-MM-dd')
  const displayDate = format(new Date(date + 'T00:00:00'), 'd MMM yyyy', { locale: th })

  const stats = {
    total: entries.length,
    active: entries.filter(e => e.status === 'active').length,
    out: entries.filter(e => e.status === 'checked_out').length,
    fail: entries.filter(e => e.alc_result === '>0%').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Checklist รายวัน</h1>
          <p className="page-subtitle">บันทึกการเข้า-ออกโครงการ</p>
        </div>
        <Link href="/checklist/new" className="ctrl-btn ctrl-btn-primary">
          <Plus className="w-3.5 h-3.5" />
          เพิ่มรายการ
        </Link>
      </div>

      {/* ── Control bar ── */}
      <div className="ctrl-bar">

        {/* Date nav */}
        <div style={{
          display: 'flex', alignItems: 'center', height: 36,
          border: '1px solid hsl(var(--c-border))', borderRadius: 'var(--r-md)',
          background: 'hsl(var(--c-surface))', overflow: 'hidden',
        }}>
          <button onClick={() => shiftDate(-1)}
            style={{
              width: 32, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: 'transparent', border: 'none',
              color: 'hsl(var(--c-fg-3))', transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220 14% 96%)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px',
            borderLeft: '1px solid hsl(var(--c-border))', borderRight: '1px solid hsl(var(--c-border))',
          }}>
            <CalendarDays className="w-3.5 h-3.5" style={{ color: 'hsl(var(--c-brand))', flexShrink: 0 }} />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                fontSize: 12, fontWeight: 700, color: 'hsl(var(--c-fg))',
                background: 'transparent', border: 'none', outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          <button onClick={() => shiftDate(1)}
            style={{
              width: 32, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', background: 'transparent', border: 'none',
              color: 'hsl(var(--c-fg-3))', transition: 'background 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220 14% 96%)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {!isToday && (
          <button onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
            style={{
              height: 36, padding: '0 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              color: 'hsl(var(--c-brand))', background: 'hsl(var(--c-brand-bg))',
              border: '1px solid hsl(214 100% 88%)', borderRadius: 'var(--r-md)',
            }}>
            วันนี้
          </button>
        )}

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search className="w-3.5 h-3.5" style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'hsl(var(--c-fg-4))', pointerEvents: 'none',
          }} />
          <input
            type="search"
            className="ctrl-input"
            placeholder="ค้นหาชื่อ, บริษัท, กิจกรรม..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, width: '100%' }}
          />
        </div>

        {/* View toggle */}
        <div className="view-toggle">
          <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`}
            onClick={() => setView('table')} title="มุมมองตาราง">
            <TableProperties className="w-3.5 h-3.5" />
          </button>
          <button className={`view-toggle-btn ${view === 'cards' ? 'active' : ''}`}
            onClick={() => setView('cards')} title="มุมมองการ์ด">
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Refresh */}
        <button className="ctrl-btn ctrl-btn-icon" onClick={fetchEntries} title="รีเฟรช">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'spin' : ''}`} style={{ color: 'hsl(var(--c-fg-3))' }} />
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <span className="badge badge-brand">
          รวม {stats.total} คน
        </span>
        <span className="badge badge-active">
          อยู่ {stats.active} คน
        </span>
        <span className="badge badge-out">
          ออกแล้ว {stats.out} คน
        </span>
        {stats.fail > 0 && (
          <span className="badge badge-alc-fail">
            <AlertTriangle className="w-3 h-3" />
            ALC เกิน {stats.fail} คน
          </span>
        )}
      </div>

      {/* ── Table / Cards ── */}
      {view === 'table'
        ? <ChecklistTable entries={entries} loading={loading} onDelete={handleDelete} onCheckout={handleCheckout} />
        : <ChecklistCards entries={entries} loading={loading} onDelete={handleDelete} onCheckout={handleCheckout} />
      }
    </div>
  )
}
