'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserRecord(formData: FormData) {
  const supabase = await createClient()
  const userId = formData.get('user_id') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as string

  await supabase.from('users').update({ name, user_type: role }).eq('id', userId)
  revalidatePath('/admin')
}

export async function toggleSuspendUser(userId: string, currentStatus: string) {
  const supabase = await createClient()
  const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
  await supabase.from('users').update({ account_status: newStatus }).eq('id', userId)
  revalidatePath('/admin')
}

export async function deleteUserAction(userId: string) {
  const supabase = await createClient()
  await supabase.from('drivers').delete().eq('user_id', userId)
  await supabase.from('users').delete().eq('id', userId)
  revalidatePath('/admin')
}

export async function approveDriver(driverId: string) {
    const supabase = await createClient()
    await supabase.from('drivers').update({ verified: true }).eq('user_id', driverId)
    revalidatePath('/admin')
}