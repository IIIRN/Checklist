'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserProfile, UserRole } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Users, UserCheck, Shield, ShieldCheck, Eye, Search,
  Plus, Pencil, Trash2, RefreshCw, Loader2, Mail, Phone,
  Building2, LayoutGrid, List, CheckCircle2, UserCog
} from 'lucide-react'

interface UserFormData {
  full_name: string
  email: string
  role: UserRole
  department: string
  phone: string
  is_active: boolean
}

const defaultForm: UserFormData = {
  full_name: '',
  email: '',
  role: 'supervisor',
  department: '',
  phone: '',
  is_active: true,
}

const ROLE_CONFIG: Record<UserRole, { label: string; desc: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  admin: {
    label: 'ผู้ดูแลระบบ (Admin)',
    desc: 'จัดการข้อมูลทั้งหมด สิทธิ์ผู้ใช้ และตั้งค่าระบบ',
    icon: Shield,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  supervisor: {
    label: 'หัวหน้างาน / ผู้ตรวจ (Supervisor)',
    desc: 'ตรวจเช็คชื่อ บันทึกแอลกอฮอล์ และอนุมัติ Checklist',
    icon: ShieldCheck,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  viewer: {
    label: 'ผู้ตรวจสอบ / ทั่วไป (Viewer)',
    desc: 'ดูรายงาน สถิติ และส่งออกข้อมูลได้เท่านั้น',
    icon: Eye,
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
}

export default function EmployeesPage() {
  const supabase = useMemo(() => createClient(), [])

  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState<UserFormData>(defaultForm)

  // Fetch Users
  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers((data as UserProfile[]) ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลผู้ใช้งานได้'
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล', { description: message })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = (u.full_name ?? '').toLowerCase().includes(q)
        const emailMatch = (u.email ?? '').toLowerCase().includes(q)
        const deptMatch = (u.department ?? '').toLowerCase().includes(q)
        const phoneMatch = (u.phone ?? '').toLowerCase().includes(q)
        if (!nameMatch && !emailMatch && !deptMatch && !phoneMatch) return false
      }
      return true
    })
  }, [users, roleFilter, search])

  // Stats
  const stats = useMemo(() => {
    const total = users.length
    const admins = users.filter(u => u.role === 'admin').length
    const supervisors = users.filter(u => u.role === 'supervisor').length
    const viewers = users.filter(u => u.role === 'viewer').length
    const active = users.filter(u => u.is_active !== false).length
    return { total, admins, supervisors, viewers, active }
  }, [users])

  // Open Create Dialog
  const openCreate = () => {
    setEditId(null)
    setFormData(defaultForm)
    setDialogOpen(true)
  }

  // Open Edit Dialog
  const openEdit = (u: UserProfile) => {
    setEditId(u.id)
    setFormData({
      full_name: u.full_name ?? '',
      email: u.email ?? '',
      role: u.role,
      department: u.department ?? '',
      phone: u.phone ?? '',
      is_active: u.is_active !== false,
    })
    setDialogOpen(true)
  }

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim()) {
      toast.error('กรุณาระบุชื่อ-นามสกุล')
      return
    }
    if (!formData.email.trim()) {
      toast.error('กรุณาระบุอีเมลผู้ใช้งาน')
      return
    }

    setSaving(true)
    const payload = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      department: formData.department.trim() || null,
      phone: formData.phone.trim() || null,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }

    try {
      if (editId) {
        const { error } = await supabase.from('user_profiles').update(payload).eq('id', editId)
        if (error) throw error
        toast.success('แก้ไขข้อมูลผู้ใช้งานสำเร็จ')
      } else {
        const { error } = await supabase.from('user_profiles').insert(payload)
        if (error) throw error
        toast.success('เพิ่มผู้ใช้งานระบบใหม่สำเร็จ')
      }
      setDialogOpen(false)
      fetchData(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก'
      toast.error('บันทึกไม่สำเร็จ', { description: message })
    } finally {
      setSaving(false)
    }
  }

  // Delete User Profile
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบผู้ใช้งาน "${name}" ออกจากระบบหรือไม่?\nการดำเนินการนี้ไม่สามารถยกเลิกได้`)) return

    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', id)
      if (error) throw error
      toast.success(`ลบ "${name}" เรียบร้อยแล้ว`)
      fetchData(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบ'
      toast.error('ลบไม่สำเร็จ', { description: message })
    }
  }

  // Toggle Active
  const handleToggleActive = async (u: UserProfile) => {
    const nextStatus = u.is_active === false ? true : false
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', u.id)

      if (error) throw error
      toast.success(nextStatus ? `เปิดใช้งาน "${u.full_name}" แล้ว` : `ปิดใช้งาน "${u.full_name}" แล้ว`)
      setUsers(prev => prev.map(item => (item.id === u.id ? { ...item, is_active: nextStatus } : item)))
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
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold shadow-xs">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              จัดการพนักงาน (ผู้ใช้งานระบบ)
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              รายชื่อเจ้าหน้าที่, หัวหน้างาน (Supervisor), และผู้ดูแลระบบ (Admin) ที่มีสิทธิ์ล็อกอินใช้งาน
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
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 px-4 font-semibold transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> เพิ่มผู้ใช้งานระบบ
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500 font-medium">ผู้ใช้งานระบบทั้งหมด</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-purple-700">{stats.admins}</p>
              <p className="text-xs text-slate-500 font-medium">ผู้ดูแลระบบ (Admin)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-blue-700">{stats.supervisors}</p>
              <p className="text-xs text-slate-500 font-medium">หัวหน้างาน (Supervisor)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-white">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-emerald-600">{stats.active}</p>
              <p className="text-xs text-slate-500 font-medium">เปิดใช้งาน (Active)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl shadow-xs border-0">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="ค้นหาชื่อ, อีเมล, แผนก, เบอร์โทร..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Role Filter Buttons */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({stats.total})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                roleFilter === 'admin' ? 'bg-white text-purple-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin ({stats.admins})
            </button>
            <button
              onClick={() => setRoleFilter('supervisor')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                roleFilter === 'supervisor' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Supervisor ({stats.supervisors})
            </button>
            <button
              onClick={() => setRoleFilter('viewer')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                roleFilter === 'viewer' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Viewer ({stats.viewers})
            </button>
          </div>

          {/* Toggle View Mode */}
          <div className="hidden sm:flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="มุมมองตาราง"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-xs text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs">กำลังโหลดข้อมูลผู้ใช้งานระบบ...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-xs text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <UserCog className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">ไม่พบข้อมูลผู้ใช้งานระบบ</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {search ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา ลองตรวจสอบคำค้นหาอีกครั้ง' : 'ยังไม่มีผู้ใช้งานในระบบ เริ่มต้นสร้างบัญชีพนักงานคนแรกได้เลย'}
          </p>
          <Button onClick={openCreate} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9">
            <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มผู้ใช้งานใหม่
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW ── */
        <div className="bg-white rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                  <th className="py-3 px-4">อีเมล (บัญชีเข้าใช้)</th>
                  <th className="py-3 px-4">บทบาท / สิทธิ์</th>
                  <th className="py-3 px-4">แผนก / สังกัด</th>
                  <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                  <th className="py-3 px-4 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredUsers.map(u => {
                  const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.viewer
                  const RoleIcon = roleCfg.icon
                  const isActive = u.is_active !== false

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${roleCfg.bg} ${roleCfg.color}`}>
                            {u.full_name ? u.full_name.substring(0, 2).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.full_name || 'ไม่ระบุชื่อ'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-600 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {u.email || '-'}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`${roleCfg.bg} ${roleCfg.color} ${roleCfg.border} font-semibold text-xs flex items-center gap-1 w-fit`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {roleCfg.label}
                        </Badge>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {u.department || '-'}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {u.phone || '-'}
                        </span>
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="คลิกเพื่อสลับสถานะ"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => openEdit(u)}
                            title="แก้ไขข้อมูล"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(u.id, u.full_name || u.email || 'ผู้ใช้')}
                            title="ลบผู้ใช้งาน"
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
      ) : (
        /* ── CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredUsers.map(u => {
            const roleCfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.viewer
            const RoleIcon = roleCfg.icon
            const isActive = u.is_active !== false

            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between border-0"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${roleCfg.bg} ${roleCfg.color}`}>
                        {u.full_name ? u.full_name.substring(0, 2).toUpperCase() : '?'}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{u.full_name || 'ไม่ระบุชื่อ'}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {u.email || '-'}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold cursor-pointer ${
                        isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}
                      onClick={() => handleToggleActive(u)}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">บทบาท:</span>
                      <Badge
                        variant="outline"
                        className={`${roleCfg.bg} ${roleCfg.color} ${roleCfg.border} font-semibold text-[11px] flex items-center gap-1`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {roleCfg.label}
                      </Badge>
                    </div>
                    {u.department && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">แผนก:</span>
                        <span className="font-medium text-slate-800">{u.department}</span>
                      </div>
                    )}
                    {u.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">เบอร์โทร:</span>
                        <span className="font-medium text-slate-800">{u.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold bg-white text-slate-700 border-slate-200"
                    onClick={() => openEdit(u)}
                  >
                    <Pencil className="w-3 h-3 mr-1" /> แก้ไข
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    onClick={() => handleDelete(u.id, u.full_name || u.email || 'ผู้ใช้')}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> ลบ
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Dialog Form (เพิ่ม / แก้ไข ผู้ใช้งานระบบ) ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border-0 ring-0 p-6">
          <form onSubmit={handleSave}>
            <DialogHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {editId ? 'แก้ไขข้อมูลพนักงาน (ผู้ใช้ระบบ)' : 'เพิ่มพนักงาน (ผู้ใช้งานระบบใหม่)'}
                  </DialogTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กำหนดบทบาทและสิทธิ์ในการเข้าถึงระบบ Checklist
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* ชื่อ - นามสกุล */}
              <div className="space-y-1.5">
                <Label htmlFor="user_name" className="text-xs font-semibold text-slate-700">
                  ชื่อ - นามสกุล <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="user_name"
                  value={formData.full_name}
                  onChange={e => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="เช่น นายสมศักดิ์ ปลอดภัย"
                  required
                  className="h-10 bg-white"
                  autoFocus
                />
              </div>

              {/* อีเมลผู้ใช้ */}
              <div className="space-y-1.5">
                <Label htmlFor="user_email" className="text-xs font-semibold text-slate-700">
                  อีเมล (Login Account) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="user_email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="เช่น somsak@company.com"
                  required
                  className="h-10 bg-white"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  สิทธิ์การใช้งาน (Role) <span className="text-rose-500">*</span>
                </Label>
                <div className="space-y-2">
                  {(['admin', 'supervisor', 'viewer'] as const).map(r => {
                    const cfg = ROLE_CONFIG[r]
                    const Icon = cfg.icon
                    const isSelected = formData.role === r

                    return (
                      <div
                        key={r}
                        onClick={() => setFormData(prev => ({ ...prev, role: r }))}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'border-2 border-blue-600 bg-blue-50/70 text-slate-900 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{cfg.label}</p>
                          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{cfg.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* แผนก / สังกัด */}
              <div className="space-y-1.5">
                <Label htmlFor="user_dept" className="text-xs font-semibold text-slate-700">
                  แผนก / สังกัด
                </Label>
                <Input
                  id="user_dept"
                  value={formData.department}
                  onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  placeholder="เช่น ฝ่ายความปลอดภัย (จป.), วิศวกรรม..."
                  className="h-10 bg-white"
                />
              </div>

              {/* เบอร์โทรศัพท์ */}
              <div className="space-y-1.5">
                <Label htmlFor="user_phone" className="text-xs font-semibold text-slate-700">
                  เบอร์โทรศัพท์ติดต่อ
                </Label>
                <Input
                  id="user_phone"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="เช่น 089-123-4567"
                  className="h-10 bg-white"
                  type="tel"
                />
              </div>

              {/* Active Toggle */}
              <label
                htmlFor="user_active"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 cursor-pointer transition-all mt-1"
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="user_active"
                    checked={formData.is_active}
                    onCheckedChange={v => setFormData(prev => ({ ...prev, is_active: !!v }))}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800">เปิดสถานะพร้อมปฏิบัติงาน (Active Status)</p>
                    <p className="text-[11px] text-slate-400">บัญชีที่เปิดใช้งานจะสามารถเข้าสู่ระบบและบันทึกงานได้</p>
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
                className="h-10 px-4 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-medium"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-10 px-6 font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> กำลังบันทึก...
                  </>
                ) : (
                  editId ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
