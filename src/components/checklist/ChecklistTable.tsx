'use client'

import { useState } from 'react'
import type { ChecklistEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, XCircle, MoreHorizontal, Pencil, LogOut, Trash2,
  ArrowUp, ArrowDown, ArrowUpDown, HardHat,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

/* ── PPE dots ── */
const PPEDots = ({ entry }: { entry: ChecklistEntry }) => {
  const items = [
    { k: 'ppe_helmet', v: entry.ppe_helmet },
    { k: 'ppe_vest',   v: entry.ppe_vest   },
    { k: 'ppe_shirt',  v: entry.ppe_shirt  },
    { k: 'ppe_gloves', v: entry.ppe_gloves },
    { k: 'ppe_shoes',  v: entry.ppe_shoes  },
  ]
  const pass = items.filter(i => i.v).length
  return (
    <div className="flex items-center gap-1">
      {items.map(i => (
        <span key={i.k} style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: i.v ? 'hsl(142 72% 29%)' : 'hsl(var(--c-border-2))',
        }} />
      ))}
      <span style={{
        fontSize: 10, fontWeight: 700, marginLeft: 3,
        color: pass === 5 ? 'hsl(142 72% 29%)' : pass >= 3 ? 'hsl(34 90% 38%)' : 'hsl(0 72% 50%)',
      }}>
        {pass}/5
      </span>
    </div>
  )
}

type SortKey = 'contractor_name' | 'company_name' | 'check_in_time' | 'alc_result'

interface ChecklistTableProps {
  entries: ChecklistEntry[]
  loading: boolean
  onDelete: (id: string) => void
  onCheckout: (id: string) => void
}

export function ChecklistTable({ entries, loading, onDelete, onCheckout }: ChecklistTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('contractor_name')
  const [asc, setAsc] = useState(true)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setAsc(v => !v)
    else { setSortKey(key); setAsc(true) }
  }

  const sorted = [...entries].sort((a, b) => {
    const va = (a[sortKey] ?? '') as string
    const vb = (b[sortKey] ?? '') as string
    return asc ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return asc ? <ArrowUp className="w-3 h-3" style={{ color: 'hsl(var(--c-brand))' }} />
               : <ArrowDown className="w-3 h-3" style={{ color: 'hsl(var(--c-brand))' }} />
  }

  const SortTh = ({ col, label }: { col: SortKey; label: string }) => (
    <th onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}<SortIcon col={col} />
      </span>
    </th>
  )

  /* Loading */
  if (loading) return (
    <div className="card flex-center py-12">
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        border: '2px solid hsl(var(--c-border))',
        borderTopColor: 'hsl(var(--c-brand))',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )

  /* Empty */
  if (!entries.length) return (
    <div className="card flex-center flex-col py-16 gap-2">
      <HardHat className="w-10 h-10" style={{ color: 'hsl(var(--c-border-2))' }} />
      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--c-fg-4))' }}>ไม่พบรายการ</p>
      <p style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>กด &quot;เพิ่มรายการ&quot; เพื่อเริ่มบันทึก</p>
    </div>
  )

  return (
    <div className="card overflow-hidden">
      <div style={{ overflowX: 'auto' }}>
        <table className="cl-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <SortTh col="contractor_name" label="ชื่อ / บริษัท" />
              <th>ผู้ควบคุม</th>
              <th>ประสงค์</th>
              <SortTh col="check_in_time" label="เข้า / ออก" />
              <th>กิจกรรม / ระบบงาน</th>
              <SortTh col="alc_result" label="ALC" />
              <th style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <HardHat className="w-3.5 h-3.5" />PPE
              </th>
              <th>สถานะ</th>
              <th className="text-right">ค่าแรง</th>
              <th style={{ width: 32 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, idx) => (
              <tr key={e.id}
                className={cn(e.is_blacklisted ? 'row-danger' : e.alc_result === '>0%' ? 'row-warning' : '')}>

                {/* # */}
                <td><span style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>{idx + 1}</span></td>

                {/* Name */}
                <td>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--c-fg))' }}>{e.contractor_name}</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>{e.company_name ?? '—'}</p>
                </td>

                {/* Supervisor */}
                <td><span style={{ fontSize: 12, color: 'hsl(var(--c-fg-2))' }}>{e.supervisor ?? '—'}</span></td>

                {/* Purpose */}
                <td>
                  <span style={{ fontSize: 12, color: 'hsl(var(--c-fg-2))', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {e.purpose ?? '—'}
                  </span>
                </td>

                {/* Time */}
                <td>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(142 72% 29%)', lineHeight: 1.2 }}>{e.check_in_time ?? '—'}</p>
                  <p style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))', lineHeight: 1.2 }}>{e.check_out_time ?? '—'}</p>
                </td>

                {/* Activity / System Works */}
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                    {e.activity_name ? (
                      e.activity_name.split(',').map((act, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: '#f3e8ff',
                            color: '#6b21a8',
                            border: '1px solid #e9d5ff',
                            display: 'inline-block',
                            lineHeight: 1.3,
                          }}
                        >
                          {act.trim()}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: 12, color: 'hsl(var(--c-fg-4))' }}>—</span>
                    )}
                  </div>
                  {e.location && (
                    <p style={{ fontSize: 10, color: 'hsl(var(--c-fg-4))', marginTop: 3 }}>
                      📍 {e.location}
                    </p>
                  )}
                </td>

                {/* ALC */}
                <td>
                  <span className={`badge ${e.alc_result === '>0%' ? 'badge-alc-fail' : 'badge-alc-ok'}`}>
                    {e.alc_result}
                  </span>
                </td>

                {/* PPE */}
                <td><PPEDots entry={e} /></td>

                {/* Status */}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className={`badge ${
                      e.status === 'active' ? 'badge-active' :
                      e.status === 'checked_out' ? 'badge-out' : 'badge-cancel'
                    }`}>
                      {e.status === 'active' ? 'อยู่ในโครงการ' : e.status === 'checked_out' ? 'ออกแล้ว' : 'ยกเลิก'}
                    </span>
                    {e.is_blacklisted && <span className="badge badge-danger-pill">บัญชีดำ</span>}
                  </div>
                </td>

                {/* Wage */}
                <td style={{ textAlign: 'right' }}>
                  {e.daily_wage
                    ? <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--c-fg))' }}>{e.daily_wage.toLocaleString()}</span>
                    : <span style={{ fontSize: 12, color: 'hsl(var(--c-fg-4))' }}>—</span>}
                </td>

                {/* Actions */}
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="w-7 h-7 inline-flex items-center justify-center rounded outline-none transition-colors"
                      style={{ border: '1px solid transparent' }}
                      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'hsl(220 14% 96%)'; el.style.borderColor = 'hsl(var(--c-border))' }}
                      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = ''; el.style.borderColor = 'transparent' }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" style={{ color: 'hsl(var(--c-fg-3))' }} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem>
                        <Link href={`/checklist/${e.id}/edit`}
                          className="flex items-center gap-2 w-full text-[12px]">
                          <Pencil className="w-3.5 h-3.5" /> แก้ไข
                        </Link>
                      </DropdownMenuItem>
                      {e.status === 'active' && (
                        <DropdownMenuItem onClick={() => onCheckout(e.id)}
                          className="flex items-center gap-2 text-[12px]"
                          style={{ color: 'hsl(var(--c-info))' }}>
                          <LogOut className="w-3.5 h-3.5" /> Check-out
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onDelete(e.id)}
                        className="flex items-center gap-2 text-[12px] text-red-600">
                        <Trash2 className="w-3.5 h-3.5" /> ลบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid hsl(var(--c-border))',
        background: 'hsl(220 14% 98%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>
          แสดง <strong style={{ color: 'hsl(var(--c-fg))' }}>{entries.length}</strong> รายการ
        </span>
        <span style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>
          อยู่ <strong style={{ color: 'hsl(142 72% 29%)' }}>{entries.filter(e => e.status === 'active').length}</strong>
          {' '}· ออก <strong style={{ color: 'hsl(var(--c-info))' }}>{entries.filter(e => e.status === 'checked_out').length}</strong>
        </span>
      </div>
    </div>
  )
}
