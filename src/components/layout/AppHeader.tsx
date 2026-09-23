'use client'

import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Bell, LogOut, ChevronDown, Calendar } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { UserProfile, UserRole } from '@/lib/types'

interface AppHeaderProps {
  user: SupabaseUser
  profile: UserProfile | null
}

const roleBadge: Record<UserRole, { label: string; cls: string }> = {
  admin:      { label: 'Admin',      cls: 'badge-purple' },
  supervisor: { label: 'Supervisor', cls: 'badge-brand'  },
  viewer:     { label: 'Viewer',     cls: 'badge-cancel' },
}

export function AppHeader({ user, profile }: AppHeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const role = (profile?.role ?? 'viewer') as UserRole
  const today = format(new Date(), 'EEEE, d MMM yyyy', { locale: th })
  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'User'
  const initials = displayName.substring(0, 2).toUpperCase()

  const { label: rlLabel, cls: rlCls } = roleBadge[role]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="app-header">
      {/* Date pill */}
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded"
        style={{ background: 'hsl(var(--c-bg))' }}>
        <Calendar className="w-3.5 h-3.5" style={{ color: 'hsl(var(--c-brand))' }} />
        <span className="text-[11px] font-semibold" style={{ color: 'hsl(var(--c-fg-3))' }}>
          {today}
        </span>
      </div>

      <div className="flex-1" />

      {/* Notification */}
      <button
        className="relative w-9 h-9 flex-center rounded-md transition-colors"
        style={{ border: '1px solid hsl(var(--c-border))' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220 14% 96%)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <Bell className="w-4 h-4" style={{ color: 'hsl(var(--c-fg-3))' }} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{ background: 'hsl(var(--c-danger))' }} />
      </button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 px-2 py-1.5 rounded-md outline-none transition-colors"
          style={{ border: '1px solid hsl(var(--c-border))' }}
        >
          <div className="avatar">{initials}</div>
          <div className="hidden md:block text-left">
            <p className="text-[12px] font-semibold leading-tight" style={{ color: 'hsl(var(--c-fg))' }}>
              {displayName}
            </p>
            <p className="text-[11px] leading-tight" style={{ color: 'hsl(var(--c-fg-4))' }}>
              {user.email}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 hidden md:block" style={{ color: 'hsl(var(--c-fg-4))' }} />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <div className="px-3 py-2.5">
            <p className="text-[12px] font-bold" style={{ color: 'hsl(var(--c-fg))' }}>{displayName}</p>
            <p className="text-[11px]" style={{ color: 'hsl(var(--c-fg-4))' }}>{user.email}</p>
            <div className="mt-2">
              <span className={`badge ${rlCls}`}>{rlLabel}</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}
            className="flex items-center gap-2 text-red-600">
            <LogOut className="w-3.5 h-3.5" /> ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
