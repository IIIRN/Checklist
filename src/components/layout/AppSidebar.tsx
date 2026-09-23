'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, ClipboardCheck, History, HardHat,
  UserCheck, Layers, Building2, LogOut, ShieldCheck,
  ChevronRight, Sparkles
} from 'lucide-react'
import type { UserRole } from '@/lib/types'

interface NavItem {
  label: string
  sublabel: string
  href: string
  icon: React.ElementType
  roles?: UserRole[]
  section: string
  color: string
  badge?: string
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard ภาพรวม',
    sublabel: 'สถิติและข้อมูลสรุปประจำวัน',
    href: '/dashboard',
    icon: LayoutDashboard,
    section: 'เมนูหลัก',
    color: 'text-sky-400 group-hover:text-sky-300',
  },
  {
    label: 'Checklist วันนี้',
    sublabel: 'บันทึกเข้า-ออก และตรวจ PPE',
    href: '/checklist',
    icon: ClipboardCheck,
    section: 'เมนูหลัก',
    color: 'text-emerald-400 group-hover:text-emerald-300',
    badge: 'LIVE',
  },
  {
    label: 'ประวัติการตรวจ',
    sublabel: 'ค้นหาและดูรายงานย้อนหลัง',
    href: '/history',
    icon: History,
    section: 'เมนูหลัก',
    color: 'text-amber-400 group-hover:text-amber-300',
  },
  {
    label: 'ผู้รับเหมา / ช่างหน้างาน',
    sublabel: 'ข้อมูลช่างและคนงานในโครงการ',
    href: '/contractors',
    icon: HardHat,
    section: 'ข้อมูลระบบ (Master Data)',
    color: 'text-orange-400 group-hover:text-orange-300',
  },
  {
    label: 'พนักงาน (ผู้ใช้งานระบบ)',
    sublabel: 'เจ้าหน้าที่, Supervisor, Admin',
    href: '/employees',
    icon: UserCheck,
    section: 'ข้อมูลระบบ (Master Data)',
    color: 'text-indigo-400 group-hover:text-indigo-300',
  },
  {
    label: 'กิจกรรมและสถานที่',
    sublabel: 'รหัสกิจกรรมและพื้นที่โรงงาน',
    href: '/activities',
    icon: Layers,
    section: 'ข้อมูลระบบ (Master Data)',
    color: 'text-purple-400 group-hover:text-purple-300',
  },
  {
    label: 'บริษัท / แผนก',
    sublabel: 'ผู้รับเหมาหลักและคู่ค้า',
    href: '/companies',
    icon: Building2,
    roles: ['admin'],
    section: 'ข้อมูลระบบ (Master Data)',
    color: 'text-teal-400 group-hover:text-teal-300',
  },
]

const roleLabel: Record<UserRole, { label: string; badgeCls: string }> = {
  admin: { label: 'ผู้ดูแลระบบ (Admin)', badgeCls: 'bg-purple-900/60 text-purple-300 border-purple-700/50' },
  supervisor: { label: 'หัวหน้างาน (Supervisor)', badgeCls: 'bg-blue-900/60 text-blue-300 border-blue-700/50' },
  viewer: { label: 'ผู้ตรวจสอบ (Viewer)', badgeCls: 'bg-slate-800 text-slate-300 border-slate-700' },
}

interface AppSidebarProps {
  role: UserRole
  initials?: string
  email?: string
  name?: string
}

export function AppSidebar({ role, initials = '?', email = '', name = '' }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('ออกจากระบบแล้ว')
    router.push('/login')
    router.refresh()
  }

  const visibleItems = navItems.filter(i => !i.roles || i.roles.includes(role))
  const sections = [...new Set(visibleItems.map(i => i.section))]
  const roleInfo = roleLabel[role] || roleLabel.viewer

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-68 shrink-0 bg-slate-900 border-r border-slate-800/80 h-screen sticky top-0 z-40 select-none">
        
        {/* Logo Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 ring-2 ring-white/10">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-white tracking-tight">SiteCheck</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 truncate">
              ระบบตรวจสอบเข้า-ออกโครงการ
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {sections.map(section => (
            <div key={section} className="space-y-1.5">
              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                {section}
              </div>

              <div className="space-y-1">
                {visibleItems.filter(i => i.section === section).map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative',
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30 ring-1 ring-blue-400/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      )}
                    >
                      {/* Icon Box */}
                      <div
                        className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all',
                          isActive
                            ? 'bg-white/20 text-white shadow-inner'
                            : cn('bg-slate-800/90 group-hover:bg-slate-700/80', item.color)
                        )}
                      >
                        <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                      </div>

                      {/* Text info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={cn(
                            'text-xs tracking-tight truncate',
                            isActive ? 'font-bold text-white' : 'font-medium text-slate-200 group-hover:text-white'
                          )}>
                            {item.label}
                          </p>
                          {item.badge && (
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider',
                              isActive
                                ? 'bg-white text-blue-700'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          'text-[10px] truncate leading-tight mt-0.5',
                          isActive ? 'text-blue-100 font-normal' : 'text-slate-400'
                        )}>
                          {item.sublabel}
                        </p>
                      </div>

                      {/* Active Indicator Arrow */}
                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {name || email.split('@')[0]}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={cn('text-[10px] px-1.5 py-0.2 rounded border font-medium', roleInfo.badgeCls)}>
                  {roleInfo.label.split(' ')[0]}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 md:hidden flex items-center justify-around px-2 py-1.5 shadow-2xl">
        {visibleItems.slice(0, 5).map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all text-[11px] font-medium min-w-14',
                isActive
                  ? 'text-blue-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800/80 text-slate-400'
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] truncate max-w-16 leading-tight">
                {item.label.split(' ')[0]}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
