import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppSidebar, AppHeader } from '@/components/layout'

import type { UserRole } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: fetchedProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  let profile = fetchedProfile
  if (!profile && user) {
    const { data: created } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: user.email?.split('@')[0] ?? 'Admin',
        role: 'admin',
      })
      .select('*')
      .maybeSingle()
    if (created) profile = created
  }

  const role = (profile?.role ?? 'admin') as UserRole
  const displayName = profile?.full_name ?? user.email?.split('@')[0] ?? 'User'
  const initials = displayName.substring(0, 2).toUpperCase()

  return (
    <div className="app-layout">
      <AppSidebar
        role={role}
        initials={initials}
        email={user.email ?? ''}
        name={displayName}
      />
      <div className="app-main">
        <AppHeader user={user} profile={profile} />
        <main className="page-content pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
