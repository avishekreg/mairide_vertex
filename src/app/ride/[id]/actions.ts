'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. PAYMENT FUNCTION
export async function submitPayment(rideId: string, txnId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  const { data: ride } = await supabase.from('rides').select('*').eq('id', rideId).single()
  if (!ride) throw new Error("Ride not found")

  const isTraveler = ride.traveler_id === user.id
  const isDriver = ride.driver_id === user.id

  if (!isTraveler && !isDriver) throw new Error("You are not part of this ride")

  // Prepare the update payload
  const updateData: any = {}

  if (isTraveler) {
    updateData.traveler_paid = true
    updateData.payment_txn_id_traveler = txnId
  }
  
  if (isDriver) {
    updateData.driver_paid = true
    updateData.payment_txn_id_driver = txnId
  }

  await supabase.from('rides').update(updateData).eq('id', rideId)

  // Check if BOTH have paid now
  const { data: updatedRide } = await supabase.from('rides').select('*').eq('id', rideId).single()
  
  if (updatedRide?.traveler_paid && updatedRide?.driver_paid) {
    // UNLOCK THE RIDE!
    await supabase.from('rides').update({ status: 'in_progress' }).eq('id', rideId)
  }

  revalidatePath(`/ride/${rideId}`)
}

// 2. COMPLETE RIDE & WALLET REWARD FUNCTION
export async function completeRideAndRate(rideId: string, rating: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")

  // 1. Mark ride as completed
  await supabase.from('rides').update({ status: 'completed' }).eq('id', rideId)

  // 2. Save the rating (Grabbing the error safely instead of using .catch)
  const { error: ratingError } = await supabase.from('ratings').insert({
    ride_id: rideId,
    driver_rating: rating, 
    comments: "Great ride!"
  })
  if (ratingError) console.log("Skipped rating: ", ratingError.message) 

  // 3. SECURE WALLET CREDIT LOGIC 🪙
  const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', user.id).single()

  if (wallet) {
    // Add 25 to existing balance
    await supabase.from('wallets').update({ 
      balance: Number(wallet.balance) + 25 
    }).eq('user_id', user.id)
  } else {
    // Create new wallet with 25 coins
    await supabase.from('wallets').insert({ 
      user_id: user.id, 
      balance: 25 
    })
  }

  // 4. Refresh page to show the success screen
  revalidatePath(`/ride/${rideId}`)
  revalidatePath('/') 
}