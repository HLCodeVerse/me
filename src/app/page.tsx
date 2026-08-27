import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const cookieStore = await cookies()
  const hasDirectSession = cookieStore.get('nirmaan_session')?.value === 'true'

  if (hasDirectSession) {
    redirect('/dashboard')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/onboarding')
  }
}

