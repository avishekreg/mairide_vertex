'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { MapPin, ArrowRight } from 'lucide-react'

export default function BookRidePage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleBookRide(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { alert("Please login"); return }

    const { data, error } = await supabase.from('rides').insert({
      traveler_id: user.id,
      pickup_location: formData.get('pickup'),
      drop_location: formData.get('drop'),
      status: 'booked'
    }).select().single()

    if (error) { alert("Error: " + error.message); setLoading(false) }
    else { router.push(`/ride/${data.id}`) }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <form onSubmit={handleBookRide} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200">
        <h1 className="text-2xl font-black mb-6 text-slate-800">Where to?</h1>
        <input name="pickup" placeholder="Pickup Location" required className="w-full p-4 mb-4 border rounded-xl" />
        <input name="drop" placeholder="Drop Location" required className="w-full p-4 mb-6 border rounded-xl" />
        <button disabled={loading} className="w-full bg-[#fb8500] text-white p-4 rounded-xl font-bold">
          {loading ? 'Requesting...' : 'Find a Ride'}
        </button>
      </form>
    </div>
  )
}