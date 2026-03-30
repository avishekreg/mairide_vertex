'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveDriver(driverId: string) {
  const supabase = await createClient()
  await supabase.from('drivers').update({ verified: true }).eq('user_id', driverId)
  await supabase.from('users').update({ verified: true }).eq('id', driverId)
  revalidatePath('/admin')
}

// NEW: Toggle User Suspension
export async function toggleSuspendUser(userId: string, currentStatus: string) {
  const supabase = await createClient()
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
  await supabase.from('users').update({ account_status: newStatus }).eq('id', userId)
  revalidatePath('/admin')
}

// NEW: Update User Details
export async function updateUserRecord(formData: FormData) {
  const supabase = await createClient()
  const userId = formData.get('user_id') as string
  await supabase.from('users').update({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email')
  }).eq('id', userId)
  revalidatePath('/admin')
}