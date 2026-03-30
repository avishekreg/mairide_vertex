import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requestRide, acceptRide } from '../actions'
import { Car, MapPin, ShieldAlert, ShieldCheck, LogOut, User, Wallet, Navigation, Settings, Search, CheckCircle } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-black text-white p-6">
        <div className="text-center max-w-lg">
          <div className="flex justify-center mb-6"><div className="bg-white p-4 rounded-full shadow-2xl"><Car className="w-12 h-12 text-black" /></div></div>
          <h1 className="text-5xl font-extrabold mb-4 tracking-tight">MaiRide <span className="text-blue-500">Pro</span></h1>
          <p className="text-gray-400 text-lg mb-10">Premium long-distance rides. Secure, affordable, and verified.</p>
          <Link href="/login" className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-200 transition">Get Started</Link>
        </div>
      </main>
    )
  }

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()

  // 1. SAFELY FETCH AVAILABLE RIDES (Bypassing the confusing name lookup)
  const { data: availableRides } = await supabase.from('rides')
    .select('*')
    .is('driver_id', null)
    .eq('status', 'payment_pending')

  // 2. SAFELY FETCH ACTIVE RIDE FOR BOTH TRAVELER AND DRIVER
  const { data: myActiveRide } = await supabase.from('rides')
    .select('*')
    .or(`traveler_id.eq.${user.id},driver_id.eq.${user.id}`)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!profile) return <div className="p-10 text-center animate-pulse">Loading secure profile...</div>

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black p-2 rounded-xl"><Car className="w-6 h-6 text-white" /></div>
            <span className="text-xl font-extrabold tracking-tight">MaiRide</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
              <User className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">{profile.name}</span>
            </div>
            <form action={async () => { 'use server'; const supabase = await createClient(); await supabase.auth.signOut(); redirect('/'); }}>
              <button className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-full font-bold transition text-sm"><LogOut className="w-4 h-4" /> <span className="hidden md:inline">Log Out</span></button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Welcome back, {profile.name.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 mt-1">Here is what is happening with your account today.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {profile.user_type === 'admin' && (
              <Link href="/admin" className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm shadow-purple-600/20 hover:bg-purple-700 transition">
                <Settings className="w-4 h-4"/> Admin Portal
              </Link>
            )}
            <span className="bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm capitalize">
              {profile.user_type === 'driver' ? <Car className="w-4 h-4"/> : <MapPin className="w-4 h-4"/>}
              {profile.user_type}
            </span>
            <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border ${profile.verified ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {profile.verified ? <ShieldCheck className="w-4 h-4"/> : <ShieldAlert className="w-4 h-4"/>}
              {profile.verified ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            
            {/* ACTIVE RIDE BANNER (Shows for both Driver and Traveler if they are in a ride!) */}
            {myActiveRide && (
              <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl shadow-blue-600/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                <div className="relative z-10">
                  <h4 className="font-extrabold text-2xl mb-1 flex items-center gap-2"><Navigation className="w-6 h-6"/> Active Ride in Progress!</h4>
                  <p className="text-blue-100 font-medium">You have an ongoing ride. Please complete the trip to earn Maicoins.</p>
                </div>
                <Link href={`/ride/${myActiveRide.id}`} className="bg-white text-blue-700 px-8 py-4 rounded-full font-bold hover:scale-105 transition shadow-lg whitespace-nowrap relative z-10">
                  View Live Map →
                </Link>
                <MapPin className="absolute -right-10 -bottom-10 w-48 h-48 text-white/10 rotate-12" />
              </div>
            )}

            {/* --- TRAVELER VIEW (Only show if NO active ride) --- */}
            {!myActiveRide && (profile.user_type === 'traveler' || profile.user_type === 'admin') && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <h3 className="font-extrabold text-2xl mb-6 flex items-center gap-3">
                  <Navigation className="text-blue-500" /> Request a Long-Distance Ride
                </h3>

                <form action={requestRide} className="space-y-4 relative z-10">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Pickup Location</label>
                      <input name="pickup" required placeholder="Enter City or Address" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Dropoff Location</label>
                      <input name="dropoff" required placeholder="Enter Destination City" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <button className="w-full bg-black hover:bg-slate-800 text-white p-4 rounded-xl font-bold text-lg transition shadow-xl mt-2 flex justify-center items-center gap-2">
                    <Search className="w-5 h-5" /> Find a Verified Driver
                  </button>
                </form>
                <MapPin className="absolute -bottom-10 -right-10 w-64 h-64 text-slate-50 rotate-12 -z-0" />
              </div>
            )}

            {/* --- DRIVER VIEW (Only show if NO active ride) --- */}
            {!myActiveRide && profile.user_type === 'driver' && profile.verified && (
               <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                 <h3 className="font-extrabold text-2xl mb-6 flex items-center gap-3">
                   <Search className="text-orange-500" /> Available Empty-Leg Rides
                 </h3>
                 
                 {!availableRides || availableRides.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Car className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500 font-semibold">No rides available right now.</p>
                      <p className="text-sm text-slate-400">Keep this app open, new rides will appear here.</p>
                    </div>
                 ) : (
                    <div className="space-y-4">
                      {availableRides.map((ride: any) => (
                        <div key={ride.id} className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="font-bold text-slate-700">New Traveler Request</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                              <MapPin className="w-4 h-4 text-green-500" /> Pickup 
                              <span className="text-slate-400 mx-2">→</span>
                              <MapPin className="w-4 h-4 text-red-500" /> Dropoff
                            </div>
                          </div>
                          <form action={async () => {
                            'use server'
                            await acceptRide(ride.id)
                          }}>
                            <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-green-600/20 flex items-center gap-2 w-full md:w-auto">
                              <CheckCircle className="w-5 h-5"/> Accept Ride
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                 )}
               </div>
            )}

            {/* UNVERIFIED DRIVER WARNING */}
            {profile.user_type === 'driver' && !profile.verified && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-8 rounded-3xl text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="bg-white/20 w-fit p-3 rounded-2xl mb-4 backdrop-blur-sm"><ShieldAlert className="w-8 h-8 text-white" /></div>
                  <h3 className="font-extrabold text-2xl mb-2">Verification Required</h3>
                  <p className="text-white/90 mb-6 max-w-md text-lg">You must verify your vehicle documents and KYC before accepting rides.</p>
                  <Link href="/verify" className="bg-white text-orange-600 px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform inline-block shadow-lg">Complete KYC Now →</Link>
                </div>
              </div>
            )}
          </div>

          {/* WALLET */}
          <div className="space-y-6">
            <div className="bg-black text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-gray-400">
                  <Wallet className="w-5 h-5" />
                  <span className="font-semibold text-sm uppercase tracking-wider">Maicoin Wallet</span>
                </div>
                <p className="text-5xl font-extrabold mb-1">🪙 {wallet?.balance || '0.00'}</p>
                <p className="text-gray-400 text-sm mb-6">Available Balance</p>
                <button className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold backdrop-blur-md transition">View History</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}