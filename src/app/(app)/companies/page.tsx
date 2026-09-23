'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search, Building2, Loader2 } from 'lucide-react'

interface CompanyData { id: string; name: string; code: string | null; created_at: string }

export default function CompaniesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('companies').select('*').order('name')
    setCompanies(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { setEditId(null); setFormName(''); setFormCode(''); setDialogOpen(true) }
  const openEdit = (c: CompanyData) => { setEditId(c.id); setFormName(c.name); setFormCode(c.code ?? ''); setDialogOpen(true) }

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('กรุณากรอกชื่อบริษัท'); return }
    setSaving(true)
    const payload = { name: formName, code: formCode || null }
    let error
    if (editId) {
      ;({ error } = await supabase.from('companies').update(payload).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('companies').insert(payload))
    }
    if (error) toast.error('บันทึกไม่สำเร็จ', { description: error.message })
    else { toast.success(editId ? 'แก้ไขแล้ว' : 'เพิ่มแล้ว'); setDialogOpen(false); fetchData() }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบบริษัทนี้?')) return
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) toast.error('ลบไม่สำเร็จ')
    else { toast.success('ลบแล้ว'); fetchData() }
  }

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" /> จัดการบริษัท / แผนก
          </h1>
          <p className="text-sm text-muted-foreground">Master data รายชื่อบริษัทและแผนก</p>
        </div>
        <Button onClick={openCreate} className="gradient-primary border-0 text-white hover:opacity-90">
          <Plus className="w-4 h-4 mr-1.5" /> เพิ่มบริษัท
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white shadow-sm" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>ไม่พบบริษัท</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.name}</p>
                    {c.code && <p className="text-xs text-muted-foreground font-mono">{c.code}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm bg-white rounded-2xl shadow-2xl border-0 ring-0">
          <DialogHeader><DialogTitle>{editId ? 'แก้ไขบริษัท' : 'เพิ่มบริษัท'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>ชื่อบริษัท / แผนก *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="ช.หลุยส์, ช.ป๊อบ..." className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>รหัสย่อ (Code)</Label>
              <Input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="CHL, CPP..." className="h-10 font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary border-0 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
