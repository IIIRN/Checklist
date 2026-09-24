'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistEntry, Contractor, Company, Activity, ALCResult } from '@/lib/types'
import { getContractorAlcRisk, getContractorDailyWage } from '@/lib/types'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Building2, Users, Check, X, Plus, Search, Sparkles,
  Save, Clock, RotateCcw, Loader2, CheckCircle2, AlertTriangle, Wine, ChevronDown
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

// รายการระบบงานหลัก สำหรับคลิกเลือกด่วน หรือแสดงในดรอปดาวน์
const COMMON_TASK_PRESETS = [
  'งานปูกระเบื้อง',
  'งานฝ้าเพดาน',
  'งานก่ออิฐฉาบปูน',
  'งานทาสี',
  'งานระบบไฟฟ้า',
  'งานเชื่อมโครงสร้าง',
  'งานประปา / สุขาภิบาล',
  'งานโครงสร้างเหล็ก',
  'งานเทคอนกรีต',
  'งานติดตั้งกระจก/อะลูมิเนียม',
  'งานติดตั้งแอร์',
  'งานกันซึม / หลังคา',
  'งานทั่วไป',
]

// รายการตัวเลือกแจ้งความประสงค์ด่วน
const PURPOSE_PRESETS = [
  'ขอเข้า 08:30',
  'ขอเข้า 09:00',
  'ขอเข้า 09:30',
  'ขอเข้า 10:00',
  'ขอเข้าช่วงบ่าย (13:00)',
  'ขอออกก่อนเวลา (16:00)',
  'ขอทำงานล่วงเวลา (OT ถึง 20:00)',
  'ขอทำงานกะดึก',
  'เข้าปฏิบัติงานตามปกติ',
]

const FALLBACK_ACTIVITIES: Activity[] = [
  {
    id: 'act-sample-1',
    code: 'ACT-01',
    name: 'งานสถาปัตย์และต่อเติมอาคาร',
    tasks: 'งานปูกระเบื้อง, งานฝ้าเพดาน, งานทาสี, งานก่ออิฐฉาบปูน',
    location: 'อาคารหลัก',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'act-sample-2',
    code: 'ACT-02',
    name: 'งานระบบไฟฟ้าและแอร์',
    tasks: 'งานระบบไฟฟ้า, งานติดตั้งแอร์, งานเดินสายไฟ, งานซ่อมบำรุง',
    location: 'ทุกโซน',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'act-sample-3',
    code: 'ACT-03',
    name: 'งานโครงสร้างและเชื่อมโลหะ',
    tasks: 'งานเชื่อมโครงสร้าง, งานโครงสร้างเหล็ก, งานเทคอนกรีต, งานประปา / สุขาภิบาล',
    location: 'ลานภายนอก',
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

interface QuickTeamChecklistProps {
  date: string
  entries: ChecklistEntry[]
  onRefreshEntries: () => void
}

interface RowChecklistState {
  alc_result: ALCResult
  ppe_helmet: boolean
  ppe_vest: boolean
  ppe_shirt: boolean
  ppe_gloves: boolean
  ppe_shoes: boolean
  activity_id?: string
  activity_name?: string
  purpose?: string
  location?: string
  notes?: string
}

export function QuickTeamChecklist({ date, entries, onRefreshEntries }: QuickTeamChecklistProps) {
  const supabase = useMemo(() => createClient(), [])

  const [contractors, setContractors] = useState<Contractor[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [savingRowId, setSavingRowId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)

  // Filtering
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [searchAffiliation, setSearchAffiliation] = useState('')
  const [searchMember, setSearchMember] = useState('')

  // Presets: กำหนดเวลาเข้า-ออก และค่าเริ่มต้นของทีม
  const [defaultCheckIn, setDefaultCheckIn] = useState('08:00')
  const [defaultCheckOut, setDefaultCheckOut] = useState('17:00')
  const [defaultSupervisor, setDefaultSupervisor] = useState('')
  const [defaultActivityId, setDefaultActivityId] = useState('')
  const [defaultActivityName, setDefaultActivityName] = useState('')
  const [defaultLocation, setDefaultLocation] = useState('')

  // Row states
  const [rowStates, setRowStates] = useState<Record<string, RowChecklistState>>({})

  // Quick Add Member Dialog
  const [newMemberOpen, setNewMemberOpen] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPosition, setNewMemberPosition] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [savingNewMember, setSavingNewMember] = useState(false)

  // Fetch Master Data
  const loadMasterData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: cData, error: cErr }, { data: coData, error: coErr }, { data: aData, error: aErr }] =
        await Promise.all([
          supabase.from('contractors').select('*').eq('is_active', true).order('name'),
          supabase.from('companies').select('*').order('name'),
          supabase.from('activities').select('*').eq('is_active', true).order('name'),
        ])

      if (cErr) throw cErr
      if (coErr) throw coErr
      const loadedActivities = (aData && aData.length > 0) ? aData : FALLBACK_ACTIVITIES
      setContractors(cData ?? [])
      setCompanies(coData ?? [])
      setActivities(loadedActivities)

      if (loadedActivities.length > 0 && !defaultActivityId) {
        const firstAct = loadedActivities[0]
        setDefaultActivityId(firstAct.id)
        const firstTasks = firstAct.tasks ? (firstAct.tasks as string).split(/[,;\n]/).map((s: string) => s.trim()).filter(Boolean) : []
        setDefaultActivityName(firstTasks[0] || firstAct.name)
        setDefaultLocation(firstAct.location ?? '')
      }
    } catch (err: unknown) {
      console.error('Master data load error:', err)
      toast.error('ไม่สามารถโหลดข้อมูลหลักได้')
    } finally {
      setLoading(false)
    }
  }, [supabase, defaultActivityId])

  // Helper เพื่อดึงรายชื่องานของกิจกรรมนั้น ๆ โดยตรงจากข้อมูลกิจกรรม (tasks)
  const getTasksForActivity = useCallback((activityId?: string) => {
    const targetId = activityId || defaultActivityId
    const act = activities.find(a => a.id === targetId)
    if (!act) return []

    const actTasks = act.tasks
      ? (act.tasks as string).split(/[,;\n]/).map((s: string) => s.trim()).filter(Boolean)
      : []

    if (actTasks.length > 0) {
      return Array.from(new Set(actTasks))
    }

    return [act.name]
  }, [activities, defaultActivityId])

  useEffect(() => {
    loadMasterData()
  }, [loadMasterData])

  // Sync Supabase entries into rowStates
  useEffect(() => {
    const newStates: Record<string, RowChecklistState> = {}

    contractors.forEach(c => {
      const entry = entries.find(
        e => (e.contractor_id && e.contractor_id === c.id) || e.contractor_name === c.name
      )

      if (entry) {
        newStates[c.id] = {
          alc_result: entry.alc_result,
          ppe_helmet: entry.ppe_helmet ?? false,
          ppe_vest: entry.ppe_vest ?? false,
          ppe_shirt: entry.ppe_shirt ?? false,
          ppe_gloves: entry.ppe_gloves ?? false,
          ppe_shoes: entry.ppe_shoes ?? false,
          activity_id: entry.activity_id ?? undefined,
          activity_name: entry.activity_name ?? undefined,
          purpose: entry.purpose ?? undefined,
          location: entry.location ?? undefined,
          notes: entry.notes ?? undefined,
        }
      } else {
        newStates[c.id] = newStates[c.id] || {
          alc_result: '0%',
          ppe_helmet: true,
          ppe_vest: true,
          ppe_shirt: true,
          ppe_gloves: true,
          ppe_shoes: true,
          activity_id: defaultActivityId || undefined,
          activity_name: defaultActivityName || undefined,
          location: defaultLocation || undefined,
        }
      }
    })

    setRowStates(prev => ({ ...newStates, ...prev }))
  }, [contractors, entries, defaultActivityId, defaultActivityName, defaultLocation])

  // Affiliation summary for LEFT COLUMN
  const affiliationList = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; total: number; checked: number }>()

    companies.forEach(co => {
      map.set(co.name.trim(), {
        id: co.id,
        name: co.name.trim(),
        total: 0,
        checked: 0,
      })
    })

    contractors.forEach(c => {
      const compName = (c.company_name || 'ไม่ระบุสังกัด').trim()
      if (!map.has(compName)) {
        map.set(compName, {
          id: c.company_id ?? undefined,
          name: compName,
          total: 0,
          checked: 0,
        })
      }
      const entry = map.get(compName)!
      entry.total += 1

      const isChecked = entries.some(
        e => (e.contractor_id && e.contractor_id === c.id) || e.contractor_name === c.name
      )
      if (isChecked) entry.checked += 1
    })

    const allItems = Array.from(map.values()).sort((a, b) => {
      if (a.name === 'ไม่ระบุสังกัด') return 1
      if (b.name === 'ไม่ระบุสังกัด') return -1
      return a.name.localeCompare(b.name, 'th')
    })

    if (!searchAffiliation) return allItems
    return allItems.filter(item =>
      item.name.toLowerCase().includes(searchAffiliation.toLowerCase())
    )
  }, [companies, contractors, entries, searchAffiliation])

  // Filtered members for current company
  const currentTeamMembers = useMemo(() => {
    return contractors.filter(c => {
      const compName = (c.company_name || 'ไม่ระบุสังกัด').trim()
      const matchComp = selectedCompany === 'all' || compName === selectedCompany
      const matchSearch =
        !searchMember ||
        c.name.toLowerCase().includes(searchMember.toLowerCase()) ||
        (c.position && c.position.toLowerCase().includes(searchMember.toLowerCase())) ||
        (c.phone && c.phone.includes(searchMember))
      return matchComp && matchSearch
    })
  }, [contractors, selectedCompany, searchMember])

  const getEntryForContractor = useCallback(
    (c: Contractor): ChecklistEntry | undefined => {
      return entries.find(
        e => (e.contractor_id && e.contractor_id === c.id) || e.contractor_name === c.name
      )
    },
    [entries]
  )

  const getRowState = (contractorId: string): RowChecklistState => {
    return (
      rowStates[contractorId] || {
        alc_result: '0%',
        ppe_helmet: true,
        ppe_vest: true,
        ppe_shirt: true,
        ppe_gloves: true,
        ppe_shoes: true,
        activity_id: defaultActivityId || undefined,
        activity_name: defaultActivityName || undefined,
        location: defaultLocation || undefined,
      }
    )
  }

  const updateRow = (contractorId: string, updates: Partial<RowChecklistState>) => {
    setRowStates(prev => {
      const cur = prev[contractorId] || {
        alc_result: '0%',
        ppe_helmet: true,
        ppe_vest: true,
        ppe_shirt: true,
        ppe_gloves: true,
        ppe_shoes: true,
      }
      return {
        ...prev,
        [contractorId]: { ...cur, ...updates },
      }
    })
  }

  // Toggle row PPE
  const togglePassAllRow = (contractorId: string) => {
    const cur = getRowState(contractorId)
    const isAllPass =
      cur.ppe_helmet && cur.ppe_vest && cur.ppe_shirt && cur.ppe_gloves && cur.ppe_shoes && cur.alc_result === '0%'
    const targetState = !isAllPass

    updateRow(contractorId, {
      alc_result: '0%',
      ppe_helmet: targetState,
      ppe_vest: targetState,
      ppe_shirt: targetState,
      ppe_gloves: targetState,
      ppe_shoes: targetState,
    })
  }

  // Bulk column toggles
  const bulkToggleColumn = (
    key: 'ppe_helmet' | 'ppe_vest' | 'ppe_shirt' | 'ppe_gloves' | 'ppe_shoes'
  ) => {
    const allCurrentTrue = currentTeamMembers.every(c => getRowState(c.id)[key])
    const nextVal = !allCurrentTrue

    setRowStates(prev => {
      const updated = { ...prev }
      currentTeamMembers.forEach(c => {
        const cur = updated[c.id] || {
          alc_result: '0%',
          ppe_helmet: true,
          ppe_vest: true,
          ppe_shirt: true,
          ppe_gloves: true,
          ppe_shoes: true,
        }
        updated[c.id] = { ...cur, [key]: nextVal }
      })
      return updated
    })
  }

  const bulkToggleALC = () => {
    const all0 = currentTeamMembers.every(c => getRowState(c.id).alc_result === '0%')
    const nextVal: ALCResult = all0 ? '>0%' : '0%'

    setRowStates(prev => {
      const updated = { ...prev }
      currentTeamMembers.forEach(c => {
        const cur = updated[c.id] || {
          alc_result: '0%',
          ppe_helmet: true,
          ppe_vest: true,
          ppe_shirt: true,
          ppe_gloves: true,
          ppe_shoes: true,
        }
        updated[c.id] = { ...cur, alc_result: nextVal }
      })
      return updated
    })
  }

  const handlePassAllTeam = () => {
    setRowStates(prev => {
      const updated = { ...prev }
      currentTeamMembers.forEach(c => {
        const cur = updated[c.id] || {}
        updated[c.id] = {
          ...cur,
          alc_result: '0%',
          ppe_helmet: true,
          ppe_vest: true,
          ppe_shirt: true,
          ppe_gloves: true,
          ppe_shoes: true,
          activity_id: cur.activity_id || defaultActivityId || undefined,
          activity_name: cur.activity_name || defaultActivityName || undefined,
          location: cur.location || defaultLocation || undefined,
        }
      })
      return updated
    })
    toast.success('ตั้งค่าให้ลูกทีมทุกคนผ่าน Checklist ครบทุกข้อแล้ว')
  }

  // Save single row
  const handleSaveRow = async (contractor: Contractor) => {
    setSavingRowId(contractor.id)
    const st = getRowState(contractor.id)
    const existingEntry = getEntryForContractor(contractor)

    const memberWage = getContractorDailyWage(contractor)

    const payload = {
      entry_date: date,
      contractor_id: contractor.id,
      contractor_name: contractor.name,
      company_name: contractor.company_name || (selectedCompany !== 'all' ? selectedCompany : null),
      supervisor: defaultSupervisor || null,
      purpose: st.purpose?.trim() || null,
      activity_id: st.activity_id || defaultActivityId || null,
      activity_name: st.activity_name || defaultActivityName || null,
      location: st.location || defaultLocation || null,
      check_in_time: defaultCheckIn,
      check_out_time: defaultCheckOut,
      alc_result: st.alc_result,
      ppe_helmet: st.ppe_helmet,
      ppe_vest: st.ppe_vest,
      ppe_shirt: st.ppe_shirt,
      ppe_gloves: st.ppe_gloves,
      ppe_shoes: st.ppe_shoes,
      daily_wage: memberWage || existingEntry?.daily_wage || null,
      status: 'active' as const,
      is_blacklisted: false,
      meal_allowance: false,
      notes: st.notes || null,
    }

    try {
      if (existingEntry) {
        const { error } = await supabase
          .from('checklist_entries')
          .update(payload)
          .eq('id', existingEntry.id)
        if (error) throw error
        toast.success(`อัปเดต ${contractor.name} สำเร็จ`)
      } else {
        const { error } = await supabase.from('checklist_entries').insert(payload)
        if (error) throw error
        toast.success(`บันทึก ${contractor.name} สำเร็จ`)
      }
      onRefreshEntries()
    } catch (err: unknown) {
      console.error('Save checklist error:', err)
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSavingRowId(null)
    }
  }

  // Save all rows
  const handleSaveAll = async () => {
    setSavingAll(true)
    try {
      const inserts: any[] = []
      const updates: { id: string; payload: any }[] = []

      currentTeamMembers.forEach(c => {
        const st = getRowState(c.id)
        const existingEntry = getEntryForContractor(c)
        const memberWage = getContractorDailyWage(c)
        const payload = {
          entry_date: date,
          contractor_id: c.id,
          contractor_name: c.name,
          company_name: c.company_name || (selectedCompany !== 'all' ? selectedCompany : null),
          supervisor: defaultSupervisor || null,
          purpose: st.purpose?.trim() || null,
          activity_id: st.activity_id || defaultActivityId || null,
          activity_name: st.activity_name || defaultActivityName || null,
          location: st.location || defaultLocation || null,
          check_in_time: defaultCheckIn,
          check_out_time: defaultCheckOut,
          alc_result: st.alc_result,
          ppe_helmet: st.ppe_helmet,
          ppe_vest: st.ppe_vest,
          ppe_shirt: st.ppe_shirt,
          ppe_gloves: st.ppe_gloves,
          ppe_shoes: st.ppe_shoes,
          daily_wage: memberWage || existingEntry?.daily_wage || null,
          status: 'active',
          is_blacklisted: false,
          meal_allowance: false,
          notes: st.notes || null,
        }

        if (existingEntry) {
          updates.push({ id: existingEntry.id, payload })
        } else {
          inserts.push(payload)
        }
      })

      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from('checklist_entries').insert(inserts)
        if (insErr) throw insErr
      }

      for (const u of updates) {
        await supabase.from('checklist_entries').update(u.payload).eq('id', u.id)
      }

      toast.success(`บันทึก Checklist ${currentTeamMembers.length} คนเรียบร้อยแล้ว`)
      onRefreshEntries()
    } catch (err: unknown) {
      console.error('Save all checklist error:', err)
      toast.error('บันทึกไม่สำเร็จ')
    } finally {
      setSavingAll(false)
    }
  }

  const handleDeleteRowEntry = async (entryId: string, name: string) => {
    if (!confirm(`ต้องการยกเลิกการบันทึก Checklist ของ "${name}" ใช่หรือไม่?`)) return
    try {
      const { error } = await supabase.from('checklist_entries').delete().eq('id', entryId)
      if (error) throw error
      toast.info(`ยกเลิกผลการตรวจของ ${name} แล้ว`)
      onRefreshEntries()
    } catch (err: unknown) {
      console.error('Delete entry error:', err)
      toast.error('ยกเลิกไม่สำเร็จ')
    }
  }

  const handleSaveNewMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName.trim()) {
      toast.error('กรุณากรอกชื่อลูกทีม')
      return
    }

    setSavingNewMember(true)
    const compName = selectedCompany !== 'all' ? selectedCompany : ''
    const compObj = companies.find(c => c.name.trim() === compName)

    try {
      const { data, error } = await supabase
        .from('contractors')
        .insert({
          name: newMemberName.trim(),
          company_id: compObj ? compObj.id : null,
          company_name: compName || null,
          position: newMemberPosition.trim() || null,
          phone: newMemberPhone.trim() || null,
          employee_type: 'contractor',
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`เพิ่ม "${newMemberName}" เข้าทีมสำเร็จ`)
      setContractors(prev => [...prev, data])
      setNewMemberName('')
      setNewMemberPosition('')
      setNewMemberPhone('')
      setNewMemberOpen(false)
    } catch (err: unknown) {
      console.error('Add member error:', err)
      toast.error('เพิ่มลูกทีมไม่สำเร็จ')
    } finally {
      setSavingNewMember(false)
    }
  }

  const totalContractorsCount = contractors.length
  const totalEntriesCount = entries.length
  const checkedCount = currentTeamMembers.filter(c => getEntryForContractor(c)).length
  const totalCount = currentTeamMembers.length

  if (loading) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">กำลังโหลดข้อมูล Checklist...</p>
      </div>
    )
  }

  return (
    /* ══════════════════════════════════════════════════════════════════════════
       SPREADSHEET LAYOUT:
       - LEFT: Grey Sidebar Column (สังกัด / บริษัท)
       - RIGHT: Compact, Eye-friendly Checklist Grid Table with Crisp Dividers
    ══════════════════════════════════════════════════════════════════════════ */
    <div className="flex flex-col lg:flex-row items-stretch border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs flex-1 min-h-0 h-full">

      {/* ────────────────────────────────────────────────────────────────
          LEFT COLUMN: แถบสีเทาเลือกสังกัด / บริษัท (Grey Sidebar Column)
      ──────────────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-64 xl:w-72 shrink-0 bg-slate-100 border-b lg:border-b-0 lg:border-r border-slate-300 flex flex-col h-full min-h-0">
        {/* Header of Left Column */}
        <div className="p-2.5 bg-slate-200/80 border-b border-slate-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
            <Building2 className="w-3.5 h-3.5 text-slate-800" />
            <span>สังกัด / บริษัท</span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-900 border border-slate-300">
            {affiliationList.length}
          </span>
        </div>

        {/* Compact Search Box */}
        <div className="p-2 border-b border-slate-200 shrink-0">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาสังกัด..."
              value={searchAffiliation}
              onChange={e => setSearchAffiliation(e.target.value)}
              className="w-full text-xs pl-6 pr-2 py-1 rounded border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 font-normal focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {searchAffiliation && (
              <button
                onClick={() => setSearchAffiliation('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Vertical Affiliation List */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-200 scrollbar-thin">
          {/* 'All' Button */}
          <button
            onClick={() => setSelectedCompany('all')}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
              selectedCompany === 'all'
                ? 'bg-white font-semibold text-blue-950 border-l-4 border-l-blue-600 shadow-2xs'
                : 'hover:bg-slate-200/80 text-slate-800 font-normal'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Users className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span className="truncate">ทุกลูกทีม (ทั้งหมด)</span>
            </div>
            <span className="text-[10px] font-mono px-1 rounded bg-slate-200 text-slate-900 font-semibold shrink-0 ml-1">
              {totalEntriesCount}/{totalContractorsCount}
            </span>
          </button>

          {/* Individual Companies */}
          {affiliationList.map(item => {
            const isSelected = selectedCompany === item.name
            const isCompleted = item.total > 0 && item.checked === item.total

            return (
              <button
                key={item.name}
                onClick={() => setSelectedCompany(item.name)}
                className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-white font-semibold text-blue-950 border-l-4 border-l-blue-600 shadow-2xs'
                    : 'hover:bg-slate-200/80 text-slate-800 font-normal'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600'
                        : item.checked > 0
                        ? 'bg-amber-600'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-[10px] font-mono px-1 rounded bg-slate-200 text-slate-900 font-semibold shrink-0 ml-1">
                  {item.checked}/{item.total}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer of Left Column */}
        <div className="p-2 bg-slate-200/70 border-t border-slate-300 flex items-center justify-between text-[11px]">
          <span className="text-slate-700 font-normal">
            ตรวจแล้ว <strong className="text-emerald-900 font-bold">{totalEntriesCount}</strong> คน
          </span>
          <button
            onClick={() => setNewMemberOpen(true)}
            className="text-blue-700 hover:text-blue-950 font-bold inline-flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" /> เพิ่มคน
          </button>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────────────
          RIGHT COLUMN: ตาราง CHECKLIST กระชับ สบายตา (Spreadsheet Grid)
      ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden h-full min-h-0">

        {/* ── Compact Toolbar Above Grid ── */}
        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          {/* Left: Current Selection & Counts */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-950 text-xs">
              {selectedCompany === 'all' ? 'ทุกสังกัด' : selectedCompany}
            </span>
            <span className="text-slate-300 font-normal">|</span>
            <span className="text-slate-700 text-[11px] font-normal">
              ตรวจแล้ว <strong className="text-emerald-900 font-bold">{checkedCount}</strong>/{totalCount} คน
            </span>
          </div>

          {/* Center: Shift Hours Preset & Activity Preset */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-300 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="font-normal text-slate-700">เวลา:</span>
              <input
                type="time"
                value={defaultCheckIn}
                onChange={e => setDefaultCheckIn(e.target.value)}
                className="font-bold text-slate-950 text-xs w-[84px] border-none outline-none px-1 bg-transparent cursor-pointer"
              />
              <span className="text-slate-400 font-bold mx-0.5">-</span>
              <input
                type="time"
                value={defaultCheckOut}
                onChange={e => setDefaultCheckOut(e.target.value)}
                className="font-bold text-slate-950 text-xs w-[84px] border-none outline-none px-1 bg-transparent cursor-pointer"
              />
            </div>

            {/* Team Activity Preset Selector */}
            <div className="flex items-center gap-1 text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-300">
              <span className="font-normal text-slate-700">กิจกรรมทีม:</span>
              <select
                value={defaultActivityId}
                onChange={e => {
                  const actId = e.target.value
                  const act = activities.find(a => a.id === actId)
                  const rawTasks = act?.tasks ? act.tasks.split(/[,;\n]/).map(s => s.trim()).filter(Boolean) : []
                  const firstTask = rawTasks[0] || act?.name || ''
                  setDefaultActivityId(actId)
                  setDefaultActivityName(firstTask)
                  if (act?.location) setDefaultLocation(act.location)

                  // Apply to current members in view
                  setRowStates(prev => {
                    const next = { ...prev }
                    currentTeamMembers.forEach(m => {
                      const cur = next[m.id] || {}
                      next[m.id] = {
                        ...cur,
                        activity_id: actId || undefined,
                        activity_name: firstTask,
                        location: act?.location || cur.location,
                      }
                    })
                    return next
                  })
                }}
                className="text-xs font-semibold text-slate-950 bg-transparent border-none outline-none cursor-pointer max-w-[170px] truncate"
              >
                <option value="">-- เลือกกิจกรรมทีม --</option>
                {activities.map(act => (
                  <option key={act.id} value={act.id}>
                    {act.code ? `[${act.code}] ` : ''}{act.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Quick Batch Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePassAllTeam}
              title="ตั้งค่าให้ทุกคนในตารางผ่านทุกข้อ"
              className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-400 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-emerald-700" />
              <span>ตรวจผ่านทุกคน (100%)</span>
            </button>

            <button
              onClick={handleSaveAll}
              disabled={savingAll || currentTeamMembers.length === 0}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50"
            >
              {savingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              <span>บันทึกทั้งหมด ({currentTeamMembers.length})</span>
            </button>
          </div>
        </div>

        {/* ── Table Grid with Clean Vertical & Horizontal Lines ── */}
        <div className="flex-1 overflow-auto min-h-0 scrollbar-thin">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10 select-none">
              <tr className="border-b border-slate-300 text-slate-900 text-[11px]">
                <th className="py-2 px-2 w-10 text-center font-bold border-r border-slate-300">#</th>
                <th className="py-2 px-3 min-w-[130px] font-bold border-r border-slate-300">ชื่อ - สกุล</th>
                <th className="py-2 px-2 min-w-[150px] font-bold border-r border-slate-300">กิจกรรม</th>
                <th className="py-2 px-2 min-w-[150px] font-bold border-r border-slate-300">งานที่ปฏิบัติ</th>
                <th className="py-2 px-2 min-w-[135px] font-bold border-r border-slate-300">แจ้งความประสงค์</th>

                {/* ALC */}
                <th className="py-1 px-1.5 text-center min-w-[75px] font-bold border-r border-slate-300 bg-slate-100/90">
                  <div className="flex flex-col items-center">
                    <span>ALC</span>
                    <button
                      onClick={bulkToggleALC}
                      className="text-[9px] font-semibold text-blue-700 hover:text-blue-900 leading-none mt-0.5"
                    >
                      สลับทุกคน
                    </button>
                  </div>
                </th>

                {/* PPE 1: หมวก */}
                <th className="py-1 px-1 text-center min-w-[48px] font-bold border-r border-slate-300">
                  <div className="flex flex-col items-center">
                    <span>หมวก</span>
                    <button
                      onClick={() => bulkToggleColumn('ppe_helmet')}
                      className="text-[9px] font-semibold text-blue-700 hover:text-blue-900 leading-none mt-0.5"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                </th>

                {/* PPE 2: กั๊ก */}
                <th className="py-1 px-1 text-center min-w-[48px] font-bold border-r border-slate-300">
                  <div className="flex flex-col items-center">
                    <span>กั๊ก</span>
                    <button
                      onClick={() => bulkToggleColumn('ppe_vest')}
                      className="text-[9px] font-semibold text-blue-700 hover:text-blue-900 leading-none mt-0.5"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                </th>

                {/* PPE 3: เสื้อ */}
                <th className="py-1 px-1 text-center min-w-[48px] font-bold border-r border-slate-300">
                  <div className="flex flex-col items-center">
                    <span>เสื้อ</span>
                    <button
                      onClick={() => bulkToggleColumn('ppe_shirt')}
                      className="text-[9px] font-semibold text-blue-700 hover:text-blue-900 leading-none mt-0.5"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                </th>

                {/* PPE 4: ถุงมือ */}
                <th className="py-1 px-1 text-center min-w-[48px] font-bold border-r border-slate-300">
                  <div className="flex flex-col items-center">
                    <span>ถุงมือ</span>
                    <button
                      onClick={() => bulkToggleColumn('ppe_gloves')}
                      className="text-[9px] font-semibold text-blue-700 hover:text-blue-900 leading-none mt-0.5"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                </th>

                {/* PPE 5: รองเท้า */}
                <th className="py-1 px-1 text-center min-w-[48px] font-bold border-r border-slate-300">
                  <div className="flex flex-col items-center">
                    <span>รองเท้า</span>
                    <button
                      onClick={() => bulkToggleColumn('ppe_shoes')}
                      className="text-[9px] font-semibold text-blue-700 hover:text-blue-900 leading-none mt-0.5"
                    >
                      ทั้งหมด
                    </button>
                  </div>
                </th>

                {/* ผลตรวจ */}
                <th className="py-2 px-2 text-center min-w-[85px] font-bold border-r border-slate-300">ผล Checklist</th>

                {/* บันทึก */}
                <th className="py-2 px-2 text-center min-w-[95px] font-bold">การบันทึก</th>
              </tr>
            </thead>

            <tbody>
              {currentTeamMembers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-slate-500 text-xs">
                    ไม่พบข้อมูลลูกทีมในสังกัดนี้
                  </td>
                </tr>
              ) : (
                currentTeamMembers.map((member, idx) => {
                  const entry = getEntryForContractor(member)
                  const isSaved = !!entry
                  const st = getRowState(member.id)
                  const isRowSaving = savingRowId === member.id

                  const ppePassedCount = [
                    st.ppe_helmet,
                    st.ppe_vest,
                    st.ppe_shirt,
                    st.ppe_gloves,
                    st.ppe_shoes,
                  ].filter(Boolean).length

                  const isAllPpePassed = ppePassedCount === 5
                  const isSafe = isAllPpePassed && st.alc_result === '0%'

                  const effectiveActivityId = st.activity_id || defaultActivityId
                  const tasksForMember = getTasksForActivity(effectiveActivityId)
                  const selectedTaskValue = st.activity_name || ''
                  const hasAlcRisk = getContractorAlcRisk(member)

                  return (
                    <tr
                      key={member.id}
                      className={`border-b border-slate-200 transition-colors ${
                        isSaved ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      {/* # */}
                      <td className="py-1.5 px-2 text-center text-slate-800 font-mono font-normal text-[11px] border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* ชื่อ - สกุล (พื้นหลังสีเหลืองจางหากมีความเสี่ยง ALC) */}
                      <td className={`py-1.5 px-3 border-r border-slate-200 ${hasAlcRisk ? 'bg-amber-100/70' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          {isSaved && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 stroke-[2.5]" />}
                          <span className="font-normal text-slate-950 text-xs truncate">
                            {member.name}
                          </span>
                        </div>
                      </td>

                      {/* กิจกรรม (Dropdown รหัส + ชื่อกิจกรรม) */}
                      <td className="py-1 px-1.5 border-r border-slate-200">
                        <div className="relative flex items-center">
                          <select
                            value={st.activity_id || defaultActivityId || ''}
                            onChange={e => {
                              const actId = e.target.value
                              const act = activities.find(a => a.id === actId)
                              const rawTasks = act?.tasks ? act.tasks.split(/[,;\n]/).map(s => s.trim()).filter(Boolean) : []
                              const firstTask = rawTasks[0] || act?.name || ''
                              updateRow(member.id, {
                                activity_id: actId || undefined,
                                activity_name: firstTask,
                                location: act?.location || st.location,
                              })
                            }}
                            className="w-full text-[11px] pl-1.5 pr-5 py-0.5 rounded border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal text-slate-900 cursor-pointer appearance-none truncate"
                          >
                            <option value="">-- เลือกกิจกรรม --</option>
                            {activities.map(act => (
                              <option key={act.id} value={act.id}>
                                {act.code ? `[${act.code}] ` : ''}{act.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 pointer-events-none" />
                        </div>
                      </td>

                      {/* งานที่ปฏิบัติ (Dropdown ดึงตัวเลือกมาจากกิจกรรมที่เลือก) */}
                      <td className="py-1 px-1.5 border-r border-slate-200">
                        <div className="relative flex items-center">
                          <select
                            value={
                              tasksForMember.includes(selectedTaskValue)
                                ? selectedTaskValue
                                : selectedTaskValue
                                ? '__custom_val__'
                                : ''
                            }
                            onChange={e => {
                              const val = e.target.value
                              if (val === '__custom__') {
                                const customVal = window.prompt('ระบุชื่องานที่ต้องการ:', selectedTaskValue || '')
                                if (customVal !== null && customVal.trim() !== '') {
                                  updateRow(member.id, { activity_name: customVal.trim() })
                                }
                              } else if (val === '__custom_val__') {
                                // keep current
                              } else {
                                updateRow(member.id, { activity_name: val })
                              }
                            }}
                            className="w-full text-[11px] pl-1.5 pr-5 py-0.5 rounded border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal text-slate-900 cursor-pointer appearance-none truncate"
                          >
                            <option value="">-- เลือกงาน --</option>
                            {tasksForMember.map(t => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                            {selectedTaskValue && !tasksForMember.includes(selectedTaskValue) && (
                              <option value="__custom_val__">
                                {selectedTaskValue} (ระบุเอง)
                              </option>
                            )}
                            <option value="__custom__">+ พิมพ์ระบุงานเอง...</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 pointer-events-none" />
                        </div>
                      </td>

                      {/* แจ้งความประสงค์ (เช่น ขอเข้า 9.00 เป็นต้น) */}
                      <td className="py-1 px-1.5 border-r border-slate-200">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            list={`purpose-list-${member.id}`}
                            placeholder="เช่น ขอเข้า 9.00..."
                            value={st.purpose || ''}
                            onChange={e => updateRow(member.id, { purpose: e.target.value })}
                            className="w-full text-[11px] pl-1.5 pr-6 py-0.5 rounded border border-slate-300 bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal text-slate-900 placeholder:text-slate-400"
                          />
                          <datalist id={`purpose-list-${member.id}`}>
                            {PURPOSE_PRESETS.map(p => (
                              <option key={p} value={p} />
                            ))}
                          </datalist>
                          <select
                            aria-label="เลือกความประสงค์"
                            value=""
                            onChange={e => {
                              if (e.target.value) {
                                updateRow(member.id, { purpose: e.target.value })
                              }
                            }}
                            className="absolute right-0 top-0 bottom-0 w-6 opacity-0 cursor-pointer"
                            title="คลิกเพื่อเลือกจากรายการแนะนำ"
                          >
                            <option value="">-- เลือกรายการ --</option>
                            {PURPOSE_PRESETS.map(p => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 absolute right-1.5 pointer-events-none" />
                        </div>
                      </td>

                      {/* ALC */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            updateRow(member.id, {
                              alc_result: st.alc_result === '0%' ? '>0%' : '0%',
                            })
                          }
                          className={`w-full py-0.5 px-1 rounded text-[10px] font-bold border transition-colors ${
                            st.alc_result === '0%'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                              : 'bg-red-100 text-red-900 border-red-500 animate-pulse'
                          }`}
                        >
                          {st.alc_result === '0%' ? '0% ผ่าน' : '>0% เกิน'}
                        </button>
                      </td>

                      {/* PPE 1: หมวก */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateRow(member.id, { ppe_helmet: !st.ppe_helmet })}
                          className={`w-5 h-5 rounded mx-auto border flex items-center justify-center transition-all ${
                            st.ppe_helmet
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-300 border-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {st.ppe_helmet && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </td>

                      {/* PPE 2: กั๊ก */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateRow(member.id, { ppe_vest: !st.ppe_vest })}
                          className={`w-5 h-5 rounded mx-auto border flex items-center justify-center transition-all ${
                            st.ppe_vest
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-300 border-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {st.ppe_vest && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </td>

                      {/* PPE 3: เสื้อ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateRow(member.id, { ppe_shirt: !st.ppe_shirt })}
                          className={`w-5 h-5 rounded mx-auto border flex items-center justify-center transition-all ${
                            st.ppe_shirt
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-300 border-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {st.ppe_shirt && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </td>

                      {/* PPE 4: ถุงมือ */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateRow(member.id, { ppe_gloves: !st.ppe_gloves })}
                          className={`w-5 h-5 rounded mx-auto border flex items-center justify-center transition-all ${
                            st.ppe_gloves
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-300 border-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {st.ppe_gloves && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </td>

                      {/* PPE 5: รองเท้า */}
                      <td className="py-1 px-1 text-center border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => updateRow(member.id, { ppe_shoes: !st.ppe_shoes })}
                          className={`w-5 h-5 rounded mx-auto border flex items-center justify-center transition-all ${
                            st.ppe_shoes
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white text-slate-300 border-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {st.ppe_shoes && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </td>

                      {/* ผลตรวจ (PPE ผ่านกี่ชิ้น) */}
                      <td className="py-1 px-1.5 text-center border-r border-slate-200">
                        <button
                          type="button"
                          onClick={() => togglePassAllRow(member.id)}
                          title="คลิกเพื่อสลับผ่านครบทั้งแถว"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                            isSafe
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                              : 'bg-amber-100 text-amber-900 border-amber-400'
                          }`}
                        >
                          {isSafe ? '✓ ผ่านครบ' : `${ppePassedCount}/5 ไม่ครบ`}
                        </button>
                      </td>

                      {/* บันทึก */}
                      <td className="py-1 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isSaved ? (
                            <>
                              <button
                                onClick={() => handleSaveRow(member)}
                                disabled={isRowSaving}
                                title="อัปเดตผล"
                                className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                              >
                                {isRowSaving ? '...' : '✓ แล้ว'}
                              </button>
                              <button
                                onClick={() => handleDeleteRowEntry(entry.id, member.name)}
                                title="ยกเลิกการบันทึก"
                                className="text-slate-500 hover:text-red-700 p-0.5 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleSaveRow(member)}
                              disabled={isRowSaving}
                              className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors disabled:opacity-50"
                            >
                              {isRowSaving ? '...' : 'บันทึก'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Bottom Info Strip ── */}
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-800 font-normal">
          <span>
            แสดงลูกทีม <strong className="text-slate-950 font-bold">{currentTeamMembers.length}</strong> คน • ตรวจบันทึกแล้ว <strong className="text-emerald-900 font-bold">{checkedCount}</strong> คน
          </span>
          <span>
            เวลาบันทึกมาตรฐาน: <span className="font-semibold text-slate-900">{defaultCheckIn} - {defaultCheckOut} น.</span>
          </span>
        </div>
      </main>

      {/* ── Dialog เพิ่มลูกทีมใหม่เข้าสังกัด ── */}
      <Dialog open={newMemberOpen} onOpenChange={setNewMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveNewMember}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                เพิ่มลูกทีมใหม่เข้าสังกัด
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  สังกัด / บริษัท
                </label>
                <input
                  type="text"
                  disabled
                  value={selectedCompany !== 'all' ? selectedCompany : 'ไม่ระบุสังกัด'}
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-200 bg-slate-100 text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  ชื่อ-นามสกุลลูกทีม <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายประสิทธิ์ มั่นคง"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">ตำแหน่ง</label>
                  <input
                    type="text"
                    placeholder="เช่น ช่างเชื่อม"
                    value={newMemberPosition}
                    onChange={e => setNewMemberPosition(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 block">เบอร์โทร</label>
                  <input
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={newMemberPhone}
                    onChange={e => setNewMemberPhone(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setNewMemberOpen(false)}
                className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingNewMember}
                className="px-3.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                {savingNewMember ? 'กำลังบันทึก...' : 'บันทึกเข้าทีม'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
