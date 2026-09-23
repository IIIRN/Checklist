import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Users, UserCheck, AlertTriangle, ShieldAlert,
  HardHat, ClipboardCheck, TrendingUp, Plus,
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats(today: string) {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('checklist_entries').select('*').eq('entry_date', today)
  if (!entries) return { total: 0, active: 0, out: 0, alc: 0, ppe: 0, black: 0 }
  return {
    total: entries.length,
    active: entries.filter(e => e.status === 'active').length,
    out: entries.filter(e => e.status === 'checked_out').length,
    alc: entries.filter(e => e.alc_result === '>0%').length,
    ppe: entries.filter(e => !e.ppe_helmet || !e.ppe_vest || !e.ppe_shirt || !e.ppe_shoes).length,
    black: entries.filter(e => e.is_blacklisted).length,
  }
}

async function getRecentEntries(today: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('checklist_entries').select('*').eq('entry_date', today)
    .order('created_at', { ascending: false }).limit(10)
  return data ?? []
}

const ppeFields = [
  { key: 'ppe_helmet', label: 'หมวกนิรภัย' },
  { key: 'ppe_vest',   label: 'เสื้อกั๊ก'   },
  { key: 'ppe_shirt',  label: 'เสื้อแขนยาว' },
  { key: 'ppe_gloves', label: 'ถุงมือ'       },
  { key: 'ppe_shoes',  label: 'รองเท้า'      },
]

export default async function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayThai = format(new Date(), 'd MMMM yyyy', { locale: th })
  const [stats, recent] = await Promise.all([getDashboardStats(today), getRecentEntries(today)])

  const statCards: {
    label: string
    value: number
    icon: React.ElementType
    iconBg: React.CSSProperties
    iconClr: React.CSSProperties
    cardStyle: React.CSSProperties
  }[] = [
    {
      label: 'คนเข้าวันนี้',    value: stats.total,
      icon: Users,
      iconBg:   { background: 'hsl(214 100% 97%)' },
      iconClr:  { color: 'hsl(221 83% 53%)' },
      cardStyle: { borderTop: '3px solid hsl(221 83% 53%)' },
    },
    {
      label: 'อยู่ในโครงการ',   value: stats.active,
      icon: UserCheck,
      iconBg:   { background: 'hsl(140 60% 93%)' },
      iconClr:  { color: 'hsl(142 72% 29%)' },
      cardStyle: { borderTop: '3px solid hsl(142 72% 29%)' },
    },
    {
      label: 'PPE ไม่ครบ',       value: stats.ppe,
      icon: HardHat,
      iconBg:   { background: 'hsl(40 100% 94%)' },
      iconClr:  { color: 'hsl(34 90% 38%)' },
      cardStyle: { borderTop: '3px solid hsl(34 90% 38%)' },
    },
    {
      label: 'ALC เกิน 0%',      value: stats.alc,
      icon: AlertTriangle,
      iconBg:   { background: 'hsl(0 80% 95%)' },
      iconClr:  { color: 'hsl(0 72% 50%)' },
      cardStyle: { borderTop: '3px solid hsl(0 72% 50%)' },
    },
    {
      label: 'Check-out แล้ว',  value: stats.out,
      icon: ClipboardCheck,
      iconBg:   { background: 'hsl(220 14% 94%)' },
      iconClr:  { color: 'hsl(220 16% 42%)' },
      cardStyle: { borderTop: '3px solid hsl(220 13% 78%)' },
    },
    {
      label: 'บัญชีดำ',          value: stats.black,
      icon: ShieldAlert,
      iconBg:   { background: 'hsl(260 60% 96%)' },
      iconClr:  { color: 'hsl(258 80% 56%)' },
      cardStyle: { borderTop: '3px solid hsl(258 80% 56%)' },
    },
  ]

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">ข้อมูลประจำวัน • {todayThai}</p>
        </div>
        <Link href="/checklist/new"
          className="ctrl-btn ctrl-btn-primary">
          <Plus className="w-3.5 h-3.5" />
          เพิ่มรายการ
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} className="stat-card" style={s.cardStyle}>
              <div className="stat-card-icon" style={s.iconBg}>
                <Icon className="w-4 h-4" style={s.iconClr} />
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent entries */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--c-border))' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'hsl(var(--c-brand))' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--c-fg))' }}>รายการล่าสุดวันนี้</span>
            </div>
            <Link href="/checklist"
              className="text-[11px] font-semibold px-2.5 py-1 rounded"
              style={{ color: 'hsl(var(--c-brand))', background: 'hsl(var(--c-brand-bg))', border: '1px solid hsl(214 100% 88%)' }}>
              ดูทั้งหมด
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex-center flex-col py-14 gap-2" style={{ color: 'hsl(var(--c-fg-4))' }}>
              <ClipboardCheck className="w-8 h-8 opacity-30" />
              <span className="text-[12px]">ยังไม่มีรายการวันนี้</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="cl-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ชื่อ / บริษัท</th>
                    <th>เวลาเข้า</th>
                    <th>กิจกรรม</th>
                    <th>ALC</th>
                    <th>PPE</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((e, i) => {
                    const ppeOk = ppeFields.every(f => e[f.key as keyof typeof e])
                    return (
                      <tr key={e.id}
                        className={e.is_blacklisted ? 'row-danger' : e.alc_result === '>0%' ? 'row-warning' : ''}>
                        <td>
                          <span style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>{i + 1}</span>
                        </td>
                        <td>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--c-fg))' }}>
                            {e.contractor_name}
                          </p>
                          <p style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>{e.company_name ?? '—'}</p>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(142 72% 29%)' }}>
                            {e.check_in_time ?? '—'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, maxWidth: 180 }}>
                            {e.activity_name ? (
                              e.activity_name.split(',').map((act: string, i: number) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    background: '#f3e8ff',
                                    color: '#6b21a8',
                                    border: '1px solid #e9d5ff',
                                    display: 'inline-block',
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {act.trim()}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${e.alc_result === '>0%' ? 'badge-alc-fail' : 'badge-alc-ok'}`}>
                            {e.alc_result}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${ppeOk ? 'badge-active' : 'badge-warn'}`}>
                            {ppeOk ? 'ครบ' : 'ไม่ครบ'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            e.status === 'active' ? 'badge-active' :
                            e.status === 'checked_out' ? 'badge-out' : 'badge-cancel'
                          }`}>
                            {e.status === 'active' ? 'อยู่' : e.status === 'checked_out' ? 'ออก' : 'ยกเลิก'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side panels */}
        <div className="space-y-4">

          {/* Quick links */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--c-border))' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--c-fg))' }}>เมนูลัด</span>
            </div>
            <div className="p-2 space-y-0.5">
              {[
                { href: '/checklist/new', icon: Plus,          label: 'เพิ่มรายการ Checklist', clr: 'hsl(var(--c-brand))'   },
                { href: '/checklist',     icon: ClipboardCheck, label: 'ดู Checklist วันนี้',   clr: 'hsl(142 72% 29%)'      },
                { href: '/contractors',   icon: Users,          label: 'จัดการผู้รับเหมา',       clr: 'hsl(258 80% 56%)'      },
                { href: '/history',       icon: TrendingUp,     label: 'ดูประวัติทั้งหมด',       clr: 'hsl(34 90% 38%)'       },
              ].map(item => (
                <Link key={item.href} href={item.href} className="quick-link">
                  <item.icon className="w-3.5 h-3.5 shrink-0" style={{ color: item.clr }} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* PPE Summary */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--c-border))' }}>
              <HardHat className="w-4 h-4" style={{ color: 'hsl(34 90% 38%)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--c-fg))' }}>PPE Summary</span>
            </div>
            <div className="p-4 space-y-3">
              {ppeFields.map(f => {
                const count = recent.filter(e => e[f.key as keyof typeof e]).length
                const total = recent.length
                const pct = total > 0 ? Math.round(count / total * 100) : 0
                const barClr = pct >= 80 ? 'hsl(142 72% 29%)' : pct >= 50 ? 'hsl(34 90% 38%)' : 'hsl(0 72% 50%)'
                return (
                  <div key={f.key}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--c-fg-2))' }}>{f.label}</span>
                      <span style={{ fontSize: 11, color: 'hsl(var(--c-fg-4))' }}>{count}/{total} · {pct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'hsl(var(--c-border))', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: barClr,
                        width: `${pct}%`, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
