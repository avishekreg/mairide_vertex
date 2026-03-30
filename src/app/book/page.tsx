import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // If they are logged in, send to dashboard
    redirect('/dashboard')
  } else {
    // If they are not logged in, send to login
    redirect('/login')
  }
}