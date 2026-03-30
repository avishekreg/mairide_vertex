import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requestRide, acceptRide } from '../actions'
import LocationTracker from '@/components/LocationTracker'
import MapComponent from '@/components/map/MapComponent'
import { Car, MapPin, LogOut, User, Wallet, Navigation, Settings, Search, CheckCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()
  const { data: config } = await supabase.from('platform_config').select('google_maps_api_key').eq('id', 1).single()

  const { data: availableRides } = await supabase.from('rides').select('*').is('driver_id', null).eq('status', 'payment_pending')
  const { data: myActiveRide } = await supabase.from('rides').select('*').or(`traveler_id.eq.${user.id},driver_id.eq.${user.id}`).neq('status', 'completed').order('created_at', { ascending: false }).limit(1).single()

  return (
    <main className="min-h-screen bg-[#F6F3C2] text-[#023047] font-sans pb-20">
      {profile.user_type === 'driver' && profile.verified && <LocationTracker driverId={user.id} />}
      
      <nav className="bg-[#023047] text-white border-b border-[#219ebc] sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="bg-[#fb8500] p-2 rounded-xl"><Car className="w-6 h-6" /></div><span className="text-xl font-extrabold tracking-tight">MaiRide</span></div>
          <form action={async () => { 'use server'; const supabase = await createClient(); await supabase.auth.signOut(); redirect('/'); }}>
            <button className="flex items-center gap-2 text-[#8ecae6] hover:text-white transition text-sm"><LogOut className="w-4 h-4" /> Log Out</button>
          </form>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {myActiveRide && (
              <div className="bg-[#fb8500] p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div><h4 className="font-extrabold text-2xl flex items-center gap-2"><Navigation className="w-6 h-6"/> Active Ride!</h4><p className="text-white/80">Continue your trip.</p></div>
                <Link href={`/ride/${myActiveRide.id}`} className="bg-white text-[#fb8500] px-8 py-4 rounded-full font-bold hover:bg-[#ffb703] transition">View Live Map</Link>
              </div>
            )}
            
            {!myActiveRide && (profile.user_type === 'traveler' || profile.user_type === 'admin') && (
              <div className="bg-white p-8 rounded-3xl border-2 border-[#219ebc] shadow-sm">
                <h3 className="font-extrabold text-2xl mb-6 text-[#219ebc]">Request a Ride</h3>
                <MapComponent apiKey={config?.google_maps_api_key || ''} lat={28.7041} lng={77.1025} />
                <form action={requestRide} className="space-y-4 mt-6">
                  <div className="flex gap-4">
                    <input name="pickup" required placeholder="Pickup City" className="w-full bg-[#8ecae6]/20 border p-4 rounded-xl" />
                    <input name="dropoff" required placeholder="Dropoff City" className="w-full bg-[#8ecae6]/20 border p-4 rounded-xl" />
                  </div>
                  <button className="w-full bg-[#fb8500] text-white p-4 rounded-xl font-bold text-lg hover:bg-[#ffb703] transition">Find Driver</button>
                </form>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[#023047] text-white p-6 rounded-3xl shadow-xl">
              <div className="text-[#8ecae6] mb-4 font-semibold text-sm">WALLET BALANCE</div>
              <p className="text-5xl font-extrabold mb-1">🪙 {wallet?.balance || '0.00'}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}