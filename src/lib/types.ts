export type UserRole = 'admin' | 'supervisor' | 'viewer'

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  phone?: string | null
  department?: string | null
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  code: string | null
  created_at: string
}

export interface Contractor {
  id: string
  name: string
  company_id: string | null
  company_name: string | null
  employee_type: 'employee' | 'contractor'
  position: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  companies?: Company
}

export interface Activity {
  id: string
  code?: string | null
  name: string
  tasks?: string | null // กิจกรรม / ระบบงาน เช่น งานปูกระเบื้อง (ใส่ได้หลายงาน)
  location: string | null
  is_active: boolean
  created_at: string
}

export type ALCResult = '0%' | '>0%' | 'ไม่ได้ตรวจ'
export type EntryStatus = 'active' | 'checked_out' | 'cancelled'

export interface ChecklistEntry {
  id: string
  entry_date: string
  contractor_id: string | null
  contractor_name: string
  company_name: string | null
  supervisor: string | null
  purpose: string | null
  check_in_time: string | null
  check_out_time: string | null
  card_code: string | null
  card_name: string | null
  activity_id: string | null
  activity_name: string | null
  location: string | null
  alc_result: ALCResult
  ppe_helmet: boolean
  ppe_vest: boolean
  ppe_shirt: boolean
  ppe_gloves: boolean
  ppe_shoes: boolean
  is_blacklisted: boolean
  noise_area: boolean
  daily_wage: number | null
  meal_allowance: boolean
  status: EntryStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  contractors?: Contractor
  activities?: Activity
}

export interface ChecklistEntryFormData {
  contractor_id?: string
  contractor_name: string
  company_name?: string
  supervisor?: string
  purpose?: string
  check_in_time?: string
  check_out_time?: string
  card_code?: string
  card_name?: string
  activity_id?: string
  activity_name?: string
  location?: string
  alc_result: ALCResult
  ppe_helmet: boolean
  ppe_vest: boolean
  ppe_shirt: boolean
  ppe_gloves: boolean
  ppe_shoes: boolean
  is_blacklisted: boolean
  noise_area: boolean
  daily_wage?: number | null
  meal_allowance: boolean
  notes?: string
}

export interface DashboardStats {
  total_today: number
  checked_out: number
  active: number
  alc_positive: number
  ppe_incomplete: number
  blacklisted: number
}
