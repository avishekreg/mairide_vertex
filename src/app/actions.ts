'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function requestRide(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  // For Phase 1, we take text inputs and mock the exact GPS for simplicity. 
  // In Phase 2, this ties into the Google Maps API key you'll put in your Admin panel.
  const pickupLocation = formData.get('pickup') as string
  const dropLocation = formData.get('dropoff') as string

  const { data: newRide, error } = await supabase.from('rides').insert({
    traveler_id: user.id,
    pickup_lat: 28.7041, // Mock Lat
    pickup_lng: 77.1025, // Mock Lng
    drop_lat: 19.0760,   // Mock Lat
    drop_lng: 72.8777,   // Mock Lng
    status: 'payment_pending'
    // Notice driver_id is left EMPTY. It is waiting for a driver!
  }).select().single()

  if (error) throw new Error(error.message)
  
  redirect(`/ride/${newRide.id}`)
}

export async function acceptRide(rideId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  // Driver claims the empty ride!
  await supabase.from('rides').update({
    driver_id: user.id
  }).eq('id', rideId)

  redirect(`/ride/${rideId}`)
}