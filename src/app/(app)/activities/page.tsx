'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Activity } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Layers, Plus, Pencil, Trash2, Search, MapPin,
  Loader2, RefreshCw, LayoutGrid, List, CheckCircle2,
  XCircle, Hash, Building, Check, X, Wrench
} from 'lucide-react'

// รายการระบบงานหลัก สำหรับคลิกเลือกด่วน
const SYSTEM_WORK_PRESETS = [
  'งานปูกระเบื้อง',
  'งานก่ออิฐฉาบปูน',
  'งานทาสี',
  'งานระบบไฟฟ้า',
  'งานเชื่อมโครงสร้าง',
  'งานประปา / สุขาภิบาล',
  'งานฝ้าเพดาน',
  'งานโครงสร้างเหล็ก',
  'งานเทคอนกรีต',
  'งานติดตั้งกระจก/อะลูมิเนียม',
  'งานติดตั้งแอร์',
  'งานกันซึม / หลังคา',
]

export default function ActivitiesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formTasks, setFormTasks] = useState<string[]>([])
  const [customTaskInput, setCustomTaskInput] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('name')

      if (error) {
        const pgErr = error as { message?: string; code?: string; details?: string }
        if (!pgErr?.message && !pgErr?.code) {
          console.warn('Fetch activities aborted or empty error')
          return
        }
        throw error
      }

      setActivities(data ?? [])
    } catch (err: unknown) {
      const pgErr = err as { message?: string; code?: string; details?: string }
      if (!pgErr?.message && !pgErr?.code && !(err instanceof Error)) {
        return
      }
      const message = pgErr?.message || (err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้')
      console.error('Fetch activities error:', message, pgErr?.code, err)
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', { description: message })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Stats calculation
  const stats = useMemo(() => {
    const total = activities.length
    const active = activities.filter(a => a.is_active).length
    const inactive = total - active
    const withLocation = activities.filter(a => !!a.location).length
    return { total, active, inactive, withLocation }
  }, [activities])

  // Filtered List
  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (statusFilter === 'active' && !a.is_active) return false
      if (statusFilter === 'inactive' && a.is_active) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const codeMatch = (a.code ?? '').toLowerCase().includes(q)
        const nameMatch = a.name.toLowerCase().includes(q)
        const tasksMatch = (a.tasks ?? '').toLowerCase().includes(q)
        const locMatch = (a.location ?? '').toLowerCase().includes(q)
        if (!codeMatch && !nameMatch && !tasksMatch && !locMatch) return false
      }

      return true
    })
  }, [activities, statusFilter, search])

  // Task selection helpers
  const toggleTask = (task: string) => {
    const trimmed = task.trim()
    if (!trimmed) return
    setFormTasks(prev =>
      prev.includes(trimmed) ? prev.filter(t => t !== trimmed) : [...prev, trimmed]
    )
  }

  const addCustomTask = () => {
    const trimmed = customTaskInput.trim()
    if (!trimmed) return
    if (!formTasks.includes(trimmed)) {
      setFormTasks(prev => [...prev, trimmed])
    }
    setCustomTaskInput('')
  }

  const removeTask = (task: string) => {
    setFormTasks(prev => prev.filter(t => t !== task))
  }

  const openCreate = () => {
    setEditId(null)
    setFormCode('')
    setFormName('')
    setFormTasks([])
    setCustomTaskInput('')
    setFormLocation('')
    setFormActive(true)
    setDialogOpen(true)
  }

  const openEdit = (a: Activity) => {
    setEditId(a.id)
    setFormCode(a.code ?? '')
    setFormName(a.name)
    if (a.tasks) {
      setFormTasks(a.tasks.split(',').map((s: string) => s.trim()).filter(Boolean))
    } else {
      setFormTasks([])
    }
    setCustomTaskInput('')
    setFormLocation(a.location ?? '')
    setFormActive(a.is_active)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.error('กรุณาระบุชื่อกิจกรรม')
      return
    }

    setSaving(true)

    const tasksString = formTasks.length > 0 ? formTasks.join(', ') : null

    const payloadFull: Record<string, unknown> = {
      code: formCode.trim() || null,
      name: formName.trim(),
      tasks: tasksString,
      location: formLocation.trim() || null,
      is_active: formActive,
    }

    const payloadWithoutTasks: Record<string, unknown> = {
      code: formCode.trim() || null,
      name: formName.trim(),
      location: formLocation.trim() || null,
      is_active: formActive,
    }

    const payloadBasic: Record<string, unknown> = {
      name: formName.trim(),
      location: formLocation.trim() || null,
      is_active: formActive,
    }

    try {
      // 1. Try full payload with code and tasks
      let result = editId
        ? await supabase.from('activities').update(payloadFull).eq('id', editId)
        : await supabase.from('activities').insert(payloadFull)

      // Fallback if 'tasks' column does not exist yet
      if (result.error && result.error.message.includes('tasks')) {
        result = editId
          ? await supabase.from('activities').update(payloadWithoutTasks).eq('id', editId)
          : await supabase.from('activities').insert(payloadWithoutTasks)
      }

      // Fallback if 'code' column does not exist yet
      if (result.error && result.error.message.includes('code')) {
        result = editId
          ? await supabase.from('activities').update(payloadBasic).eq('id', editId)
          : await supabase.from('activities').insert(payloadBasic)
      }

      if (result.error) throw result.error

      toast.success(editId ? 'แก้ไขข้อมูลกิจกรรมเรียบร้อยแล้ว' : 'เพิ่มกิจกรรมเรียบร้อยแล้ว')
      setDialogOpen(false)
      fetchData(true)
    } catch (err: unknown) {
      const pgErr = err as { message?: string; details?: string; code?: string }
      const message = pgErr?.message || (err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก')
      toast.error('บันทึกไม่สำเร็จ', { description: message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบกิจกรรม "${name}" หรือไม่?`)) return
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id)
      if (error) throw error
      toast.success(`ลบกิจกรรม "${name}" สำเร็จ`)
      setActivities(prev => prev.filter(a => a.id !== id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      toast.error('ลบไม่สำเร็จ', { description: message })
    }
  }

  const handleToggleActive = async (a: Activity) => {
    const nextStatus = !a.is_active
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_active: nextStatus })
        .eq('id', a.id)

      if (error) throw error
      toast.success(nextStatus ? `เปิดใช้งาน "${a.name}" แล้ว` : `ปิดใช้งาน "${a.name}" แล้ว`)
      setActivities(prev =>
        prev.map(item => (item.id === a.id ? { ...item, is_active: nextStatus } : item))
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      toast.error('เปลี่ยนสถานะไม่สำเร็จ', { description: message })
    }
  }

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              จัดการกิจกรรมและระบบงาน
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              กำหนดกิจกรรม ระบบงาน (เช่น งานปูกระเบื้อง) และพื้นที่/โรง สำหรับบันทึก Checklist
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-9 px-3 bg-white"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={openCreate}
            className="gradient-primary border-0 text-white shadow-sm h-9 px-4 font-medium hover:opacity-95"
          >
            <Plus className="w-4 h-4 mr-1.5" /> เพิ่มกิจกรรม
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-xs border border-slate-200">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-medium">กิจกรรมทั้งหมด</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-emerald-200/80">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-emerald-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground font-medium">เปิดใช้งาน</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-slate-200">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 font-bold">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-600">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground font-medium">ปิดใช้งาน</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-purple-200/80">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-purple-600">{stats.withLocation}</p>
              <p className="text-xs text-muted-foreground font-medium">ระบุสถานที่ / โรง</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Controls ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อกิจกรรม, ระบบงาน (เช่น ปูกระเบื้อง), รหัส, หรือสถานที่..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200 h-10 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> เปิดใช้ ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                statusFilter === 'inactive'
                  ? 'bg-slate-700 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3 h-3" /> ปิด ({stats.inactive})
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded ${viewMode === 'table' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('table')}
              title="มุมมองตาราง"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'}`}
              onClick={() => setViewMode('grid')}
              title="มุมมองการ์ด"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
          <p className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลกิจกรรม...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-bold text-slate-700">ไม่พบข้อมูลกิจกรรม</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? 'ลองค้นหาด้วยคำใหม่อีกครั้ง' : 'เริ่มต้นสร้างกิจกรรมแรกของคุณโดยคลิกปุ่มด้านบน'}
          </p>
          {!search && (
            <Button onClick={openCreate} className="mt-4 gradient-primary text-white text-xs h-8">
              <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มกิจกรรมใหม่
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ── Table View ── */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-32">รหัส (Code)</th>
                  <th className="py-3.5 px-4">ชื่อกิจกรรม / โครงการ</th>
                  <th className="py-3.5 px-4">กิจกรรม / ระบบงาน</th>
                  <th className="py-3.5 px-4">สถานที่ / โรง</th>
                  <th className="py-3.5 px-4 w-32 text-center">สถานะ</th>
                  <th className="py-3.5 px-4 w-28 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* รหัส */}
                    <td className="py-3 px-4 font-mono text-xs">
                      {a.code ? (
                        <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-md">
                          <Hash className="w-3 h-3 text-purple-500" />
                          {a.code}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">- ไม่ระบุ -</span>
                      )}
                    </td>

                    {/* ชื่อกิจกรรม */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          a.is_active ? 'bg-purple-100 text-purple-700 font-bold' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{a.name}</p>
                        </div>
                      </div>
                    </td>

                    {/* กิจกรรม / ระบบงาน (เช่น งานปูกระเบื้อง สามารถใส่ได้หลายงาน) */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {a.tasks ? (
                          a.tasks.split(',').map((t: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200"
                            >
                              {t.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">-</span>
                        )}
                      </div>
                    </td>

                    {/* สถานที่ */}
                    <td className="py-3 px-4">
                      {a.location ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {a.location}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">-</span>
                      )}
                    </td>

                    {/* สถานะ */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(a)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all border ${
                          a.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {a.is_active ? 'เปิดใช้งาน' : 'ปิดการใช้งาน'}
                      </button>
                    </td>

                    {/* จัดการ */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEdit(a)}
                          title="แก้ไขกิจกรรม"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDelete(a.id, a.name)}
                          title="ลบกิจกรรม"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Grid Cards View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(a => (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-purple-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  {a.code ? (
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                      #{a.code}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">ไม่มีรหัส</span>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-semibold cursor-pointer ${
                      a.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                    onClick={() => handleToggleActive(a)}
                  >
                    {a.is_active ? 'ใช้งาน' : 'ปิด'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{a.name}</h3>
                </div>

                {/* ระบบงาน (กิจกรรม เช่น งานปูกระเบื้อง) */}
                {a.tasks && (
                  <div className="flex flex-wrap gap-1 my-2">
                    {a.tasks.split(',').map((t: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {a.location ? (
                  <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{a.location}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-2">- ไม่ได้ระบุสถานที่ -</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => openEdit(a)}
                >
                  <Pencil className="w-3 h-3 mr-1" /> แก้ไข
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDelete(a.id, a.name)}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> ลบ
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dialog Form (เพิ่ม / แก้ไข กิจกรรม และ ระบบงาน) ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl shadow-2xl border-0 ring-0">
          <form onSubmit={handleSave}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {editId ? 'แก้ไขกิจกรรม' : 'เพิ่มกิจกรรมใหม่'}
                  </DialogTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดกิจกรรมและระบบงานที่ปฏิบัติ เช่น งานปูกระเบื้อง สามารถใส่ได้หลายงาน
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* รหัส (Code) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="act_code" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-purple-600" />
                    รหัสกิจกรรม (Code)
                  </Label>
                  <span className="text-[11px] text-slate-400">ตัวอย่าง: ACT-01, J01</span>
                </div>
                <Input
                  id="act_code"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  placeholder="เช่น ACT-001..."
                  className="h-10 font-mono"
                />
              </div>

              {/* ชื่อกิจกรรม (Name) */}
              <div className="space-y-1.5">
                <Label htmlFor="act_name" className="text-xs font-semibold text-slate-700">
                  ชื่อกิจกรรม / โครงการ <span className="text-rose-500 font-bold">*</span>
                </Label>
                <Input
                  id="act_name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="เช่น งานปรับปรุงอาคาร, ก่อสร้างส่วนต่อขยาย..."
                  required
                  className="h-10"
                />
              </div>

              {/* กิจกรรม / ระบบงาน เช่น งานปูกระเบื้อง (ใส่ได้หลายงาน) */}
              <div className="space-y-2 p-3.5 rounded-xl border border-purple-200 bg-purple-50/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-purple-700" />
                    กิจกรรม / ระบบงาน (ใส่ได้หลายงาน):
                  </Label>
                  {formTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormTasks([])}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      ล้างทั้งหมด
                    </button>
                  )}
                </div>

                {/* Selected tasks chips */}
                {formTasks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-white border border-purple-200 min-h-[38px] items-center">
                    {formTasks.map(task => (
                      <span
                        key={task}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800"
                      >
                        <Check className="w-3 h-3 text-purple-700" />
                        {task}
                        <button
                          type="button"
                          onClick={() => removeTask(task)}
                          className="w-3.5 h-3.5 rounded-full hover:bg-rose-200 hover:text-rose-700 inline-flex items-center justify-center cursor-pointer ml-0.5"
                          title="ลบ"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    ยังไม่มีระบบงานที่เลือก — คลิกเลือกจากระบบงานหลัก หรือพิมพ์ใส่งานด้านล่าง
                  </p>
                )}

                {/* Preset Chips */}
                <div className="pt-1">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">
                    ระบบงานหลัก (คลิกเพื่อเลือก / ยกเลิก):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                    {SYSTEM_WORK_PRESETS.map(preset => {
                      const isSelected = formTasks.includes(preset)
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => toggleTask(preset)}
                          className={`text-xs px-2 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600 text-white font-semibold shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-300'
                          }`}
                        >
                          {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-slate-400" />}
                          {preset}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom task input */}
                <div className="pt-1">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">
                    หรือพิมพ์ใส่งานอื่น ๆ เพิ่มเติม:
                  </span>
                  <div className="flex gap-1.5">
                    <Input
                      value={customTaskInput}
                      onChange={e => setCustomTaskInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomTask()
                        }
                      }}
                      placeholder="พิมพ์ชื่องาน เช่น งานติดตั้งถังเก็บน้ำ แล้วกด Enter..."
                      className="h-9 bg-white text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addCustomTask}
                      variant="outline"
                      className="h-9 px-3 border-purple-300 text-purple-700 hover:bg-purple-100 text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่ม
                    </Button>
                  </div>
                </div>
              </div>

              {/* สถานที่ (Location) */}
              <div className="space-y-1.5">
                <Label htmlFor="act_location" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  สถานที่ / โรง / พื้นที่
                </Label>
                <Input
                  id="act_location"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  placeholder="เช่น โรง 3, อาคาร B ชั้น 2..."
                  className="h-10"
                />
              </div>

              {/* สถานะใช้งาน (Active) */}
              <label
                htmlFor="act_active"
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="act_active"
                    checked={formActive}
                    onCheckedChange={v => setFormActive(!!v)}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">เปิดใช้งานกิจกรรมนี้</p>
                    <p className="text-[11px] text-slate-400">กิจกรรมที่เปิดใช้จะปรากฏให้เลือกในแบบฟอร์ม Checklist</p>
                  </div>
                </div>
                <Badge variant="outline" className={formActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs' : 'bg-slate-100 text-slate-500 text-xs'}>
                  {formActive ? 'Active' : 'Inactive'}
                </Badge>
              </label>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-9 px-4"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="gradient-primary border-0 text-white h-9 px-5 font-semibold hover:opacity-95 shadow-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> กำลังบันทึก...
                  </>
                ) : (
                  editId ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
