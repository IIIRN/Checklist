'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Contractor, Company } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Users, UserCheck, Building2, Phone, Wrench,
  LayoutGrid, List, Plus, Pencil, Trash2, Search,
  Loader2, RefreshCw, HardHat, ChevronDown
} from 'lucide-react'

interface ContractorFormData {
  name: string
  company_id: string
  company_name: string
  employee_type: 'contractor'
  position: string
  phone: string
  is_active: boolean
}

const defaultForm: ContractorFormData = {
  name: '',
  company_id: '',
  company_name: '',
  employee_type: 'contractor',
  position: '',
  phone: '',
  is_active: true,
}

// Quick presets for common construction & technician roles
const POSITION_PRESETS = [
  'ช่างไฟฟ้า',
  'ช่างเชื่อม',
  'ช่างแอร์',
  'ช่างสี',
  'ช่างปูน/กระเบื้อง',
  'ช่างยนต์/เครื่องกล',
  'โฟร์แมน',
  'วิศวกร',
  'จป.วิชาชีพ',
  'ช่างทั่วไป',
]

export default function ContractorsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters & State
  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ContractorFormData>(defaultForm)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const [{ data: cData, error: cErr }, { data: coData, error: coErr }] = await Promise.all([
        supabase.from('contractors').select('*').order('name'),
        supabase.from('companies').select('*').order('name'),
      ])

      if (cErr) throw cErr
      if (coErr) throw coErr

      setContractors(cData ?? [])
      setCompanies(coData ?? [])
    } catch (err: unknown) {
      console.error('Fetch contractors error:', err)
      const message = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้'
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', { description: message })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Statistics calculation (ช่าง / ผู้รับเหมา)
  const stats = useMemo(() => {
    const technicianList = contractors.filter(c => c.employee_type !== 'employee')
    const total = technicianList.length
    const active = technicianList.filter(c => c.is_active).length
    const inactive = total - active
    const withCompany = technicianList.filter(c => !!c.company_name).length
    return { total, active, inactive, withCompany }
  }, [contractors])

  // Filtered List (เอาพนักงานประจำออก)
  const filteredList = useMemo(() => {
    return contractors
      .filter(c => c.employee_type !== 'employee')
      .filter(c => {
        // Status filter
        if (statusFilter === 'active' && !c.is_active) return false
        if (statusFilter === 'inactive' && c.is_active) return false

        // Company filter
        if (companyFilter !== 'all' && c.company_id !== companyFilter) return false

        // Search term
        if (search.trim()) {
          const q = search.toLowerCase()
          const nameMatch = c.name.toLowerCase().includes(q)
          const compMatch = (c.company_name ?? '').toLowerCase().includes(q)
          const posMatch = (c.position ?? '').toLowerCase().includes(q)
          const phoneMatch = (c.phone ?? '').toLowerCase().includes(q)
          if (!nameMatch && !compMatch && !posMatch && !phoneMatch) return false
        }

        return true
      })
  }, [contractors, statusFilter, companyFilter, search])

  // Open Create Dialog
  const openCreate = () => {
    setEditId(null)
    setFormData(defaultForm)
    setDialogOpen(true)
  }

  // Open Edit Dialog
  const openEdit = (c: Contractor) => {
    setEditId(c.id)
    setFormData({
      name: c.name,
      company_id: c.company_id ?? '',
      company_name: c.company_name ?? '',
      employee_type: 'contractor',
      position: c.position ?? '',
      phone: c.phone ?? '',
      is_active: c.is_active,
    })
    setDialogOpen(true)
  }

  const handleCompanySelect = (companyId: string) => {
    if (companyId === '__none__') {
      setFormData(prev => ({ ...prev, company_id: '', company_name: '' }))
    } else {
      const co = companies.find(c => c.id === companyId)
      setFormData(prev => ({ ...prev, company_id: companyId, company_name: co?.name ?? '' }))
    }
  }

  // Save (Create or Update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อ-นามสกุล')
      return
    }

    setSaving(true)
    const payload = {
      name: formData.name.trim(),
      company_id: formData.company_id || null,
      company_name: formData.company_name.trim() || null,
      employee_type: 'contractor',
      position: formData.position.trim() || null,
      phone: formData.phone.trim() || null,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }

    try {
      if (editId) {
        const { error } = await supabase
          .from('contractors')
          .update(payload)
          .eq('id', editId)
        if (error) throw error
        toast.success('แก้ไขข้อมูลช่างเรียบร้อยแล้ว')
      } else {
        const { error } = await supabase
          .from('contractors')
          .insert(payload)
        if (error) throw error
        toast.success('เพิ่มข้อมูลช่างเรียบร้อยแล้ว')
      }

      setDialogOpen(false)
      fetchData(true)
    } catch (err: unknown) {
      console.error('Save contractor error:', err)
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      toast.error('บันทึกไม่สำเร็จ', { description: message })
    } finally {
      setSaving(false)
    }
  }

  // Toggle is_active status directly
  const handleToggleActive = async (c: Contractor) => {
    try {
      const nextActive = !c.is_active
      const { error } = await supabase
        .from('contractors')
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq('id', c.id)

      if (error) throw error
      setContractors(prev => prev.map(item => item.id === c.id ? { ...item, is_active: nextActive } : item))
      toast.success(nextActive ? `เปิดใช้งาน ${c.name} แล้ว` : `ปิดการใช้งาน ${c.name} แล้ว`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      toast.error('ไม่สามารถเปลี่ยนสถานะได้', { description: message })
    }
  }

  // Delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบ "${name}" ออกจากระบบหรือไม่?`)) return

    try {
      const { error } = await supabase.from('contractors').delete().eq('id', id)
      if (error) throw error
      toast.success(`ลบ "${name}" สำเร็จ`)
      setContractors(prev => prev.filter(c => c.id !== id))
    } catch (err: unknown) {
      console.error('Delete contractor error:', err)
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
      toast.error('ลบไม่สำเร็จ', { description: message })
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                ข้อมูลผู้รับเหมา / ช่าง
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                ฐานข้อมูลผู้รับเหมาและช่างภายนอก สำหรับบันทึก Checklist ประจำวัน
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="h-9 px-3"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => openCreate()}
            className="gradient-primary border-0 text-white shadow-sm h-9 px-4 font-medium hover:opacity-95"
          >
            <Plus className="w-4 h-4 mr-1.5" /> เพิ่มช่าง / ผู้รับเหมา
          </Button>
        </div>
      </div>

      {/* ── Summary Stats (ช่าง / ผู้รับเหมา) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-xs border border-border/80 hover:border-border transition-colors">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-bold">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-medium">ช่าง / ผู้รับเหมาทั้งหมด</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-emerald-100 hover:border-emerald-200 transition-colors">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-emerald-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground font-medium">พร้อมปฏิบัติงาน</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-slate-100 hover:border-slate-200 transition-colors">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-600">{stats.inactive}</p>
              <p className="text-xs text-muted-foreground font-medium">ปิดใช้งานชั่วคราว</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-blue-100 hover:border-blue-200 transition-colors">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-blue-600">{stats.withCompany}</p>
              <p className="text-xs text-muted-foreground font-medium">สังกัดบริษัท / แผนก</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Status Tabs & Controls Bar ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2">
          {/* Status quick tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              พร้อมปฏิบัติงาน ({stats.active})
            </button>
            {stats.inactive > 0 && (
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  statusFilter === 'inactive'
                    ? 'bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ปิดใช้งาน ({stats.inactive})
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
            <Button
              variant="ghost"
              size="icon"
              className={`w-7 h-7 rounded-md ${viewMode === 'grid' ? 'bg-white text-foreground shadow-xs' : 'text-muted-foreground'}`}
              onClick={() => setViewMode('grid')}
              title="มุมมองการ์ด (Grid View)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`w-7 h-7 rounded-md ${viewMode === 'table' ? 'bg-white text-foreground shadow-xs' : 'text-muted-foreground'}`}
              onClick={() => setViewMode('table')}
              title="มุมมองตาราง (Table View)"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Search & Company Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5">
          {/* Search text input */}
          <div className="relative md:col-span-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อช่าง, แผนก, ตำแหน่ง หรือเบอร์โทร..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white"
            />
          </div>

          {/* Company filter */}
          <div className="md:col-span-4">
            <Select
              value={companyFilter}
              onValueChange={(val: string | null) => setCompanyFilter(val ?? 'all')}
            >
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="ทุกบริษัท / แผนก" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกบริษัท / สังกัด</SelectItem>
                {companies.map(co => (
                  <SelectItem key={co.id} value={co.id}>
                    {co.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
          <p className="text-xs text-muted-foreground">กำลังโหลดข้อมูลช่างและผู้รับเหมา...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <HardHat className="w-6 h-6 opacity-60" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">ไม่พบข้อมูลช่าง / ผู้รับเหมา</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {search || companyFilter !== 'all' || statusFilter !== 'all'
              ? 'ลองปรับคำค้นหาหรือตัวกรองใหม่อีกครั้ง'
              : 'ยังไม่มีข้อมูลช่างในระบบ คลิก "เพิ่มช่าง / ผู้รับเหมา" เพื่อเริ่มต้น'}
          </p>
          <Button
            onClick={() => openCreate()}
            size="sm"
            className="mt-4 gradient-primary border-0 text-white font-medium"
          >
            <Plus className="w-4 h-4 mr-1.5" /> เพิ่มช่าง / ผู้รับเหมา
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ══════════════════════════════════════════════
           GRID VIEW
        ══════════════════════════════════════════════ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredList.map(c => {
            return (
              <Card
                key={c.id}
                className={`overflow-hidden transition-all duration-200 border hover:shadow-md ${
                  !c.is_active
                    ? 'opacity-60 bg-slate-50/70 border-slate-200'
                    : 'bg-white border-border/80 hover:border-amber-300'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top Bar: Avatar + Name + Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                          !c.is_active
                            ? 'bg-slate-200 text-slate-500'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {c.name.trim().charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-sm text-foreground truncate">{c.name}</h3>
                          {!c.is_active && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-400 bg-slate-100">
                              ปิดใช้งาน
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {c.company_name || 'ไม่ระบุบริษัท / รับจ้างอิสระ'}
                        </p>
                      </div>
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <HardHat className="w-3 h-3" /> ช่าง / ผู้รับเหมา
                      </span>
                    </div>
                  </div>

                  {/* Details section */}
                  <div className="space-y-1.5 py-2 border-t border-b border-border/50 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-slate-400" />
                        ตำแหน่ง / สายงาน:
                      </span>
                      <span className="font-medium text-foreground">
                        {c.position || 'ช่างทั่วไป'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        เบอร์ติดต่อ:
                      </span>
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 border-t border-border/50">
                  <button
                    onClick={() => handleToggleActive(c)}
                    className={`text-xs font-medium inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      c.is_active
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        c.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {c.is_active ? 'เปิดใช้งานอยู่' : 'ปิดการใช้งาน'}
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => openEdit(c)}
                      title="แก้ไข"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(c.id, c.name)}
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* ══════════════════════════════════════════════
           TABLE VIEW
        ══════════════════════════════════════════════ */
        <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-4">ตำแหน่ง / ความชำนาญ</th>
                  <th className="py-3 px-4">บริษัท / สังกัด</th>
                  <th className="py-3 px-4">เบอร์โทร</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                  <th className="py-3 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredList.map((c, idx) => {
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-muted/20 transition-colors ${!c.is_active ? 'bg-slate-50/50 opacity-75' : ''}`}
                    >
                      <td className="py-3 px-3 text-center text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              !c.is_active
                                ? 'bg-slate-200 text-slate-500'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {c.name.trim().charAt(0) || '?'}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground text-sm block">
                              {c.name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {c.position || '-'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {c.company_name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" /> {c.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                            c.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {c.is_active ? 'ใช้งาน' : 'ปิด'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7"
                            onClick={() => openEdit(c)}
                            title="แก้ไข"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(c.id, c.name)}
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Dialog: Add & Edit Contractor / Technician ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg p-6 bg-white rounded-2xl shadow-2xl border-0 ring-0">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 bg-amber-100 text-amber-700">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {editId ? 'แก้ไขข้อมูลช่าง / ผู้รับเหมา' : 'เพิ่มข้อมูลช่าง / ผู้รับเหมา'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  กำหนดข้อมูลช่างหรือผู้รับเหมาสำหรับตรวจเช็คชื่อและ PPE หน้างาน
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">ชื่อ - นามสกุล *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="เช่น นายสมชาย ใจดี"
                className="h-10 bg-white border-slate-300 font-medium text-slate-900"
                autoFocus
              />
            </div>

            {/* Company / Department */}
            <div className="space-y-1.5">
              <Label htmlFor="modal_company" className="text-xs font-semibold text-slate-700">
                บริษัท / สังกัด / แผนก
              </Label>
              <div className="relative">
                <select
                  id="modal_company"
                  value={formData.company_id || ''}
                  onChange={e => handleCompanySelect(e.target.value || '__none__')}
                  className="w-full h-10 px-3 pr-9 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- ไม่ระบุ / รับจ้างอิสระ --</option>
                  {companies.map(co => (
                    <option key={co.id} value={co.id}>
                      {co.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Position with quick preset chips */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                ตำแหน่ง / สายงานช่าง / ความชำนาญ
              </Label>
              <Input
                value={formData.position}
                onChange={e => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="เช่น ช่างไฟฟ้า, ช่างเชื่อม, โฟร์แมน..."
                className="h-10 bg-white border-slate-300 text-slate-900"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {POSITION_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, position: preset }))}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                      formData.position === preset
                        ? 'bg-amber-600 border-amber-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">เบอร์โทรศัพท์ติดต่อ</Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="เช่น 081-234-5678"
                className="h-10 bg-white border-slate-300 text-slate-900"
                type="tel"
              />
            </div>

            {/* Active Toggle Card */}
            <label
              htmlFor="modal_is_active"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 cursor-pointer transition-all mt-1"
            >
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="modal_is_active"
                  checked={formData.is_active}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, is_active: !!v }))}
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">เปิดสถานะพร้อมปฏิบัติงาน (Active Status)</p>
                  <p className="text-[11px] text-slate-400">ช่างที่เปิดใช้งานจะแสดงในรายชื่อสำหรับการลงชื่อ Checklist หน้างาน</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  formData.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold'
                    : 'bg-slate-100 text-slate-500 text-xs'
                }
              >
                {formData.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </label>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-10 px-4 bg-white text-slate-700 border-slate-300 hover:bg-slate-50 font-medium"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-6 font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> กำลังบันทึก...
                </>
              ) : (
                editId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
