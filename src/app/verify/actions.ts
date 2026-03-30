'use server'

import { createClient } from '@/utils/supabase/server'

export async function submitDriverKyc(kycData: any) {
  const supabase = await createClient()
  
  // 1. Get the current logged-in driver
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "You must be logged in." }

  // 2. Save all the vehicle and document data to the database
  const { error } = await supabase.from('drivers').insert({
    user_id: user.id,
    ...kycData
  })

  if (error) {
    console.error("KYC INSERT ERROR:", error)
    return { error: error.message }
  }

  return { success: true }
}