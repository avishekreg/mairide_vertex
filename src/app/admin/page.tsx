import { createClient } from '@/utils/supabase/server'
import { approveDriver, toggleSuspendUser, updateUserRecord } from './actions'
import { ShieldAlert, CheckCircle, Car, MapPin, UserCheck, TrendingUp, Coins, Activity, Settings, Users, Ban, Edit, ArrowLeft } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage(props: { searchParams: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const view = searchParams.view || 'dashboard';

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>Access Denied.</div>

  const { data: profile } = await supabase.from('users').select('user_type').eq('id', user.id).single()
  if (profile?.user_type !== 'admin') redirect('/')

  // FETCH ALL DATA
  const { data: allUsers } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  const { data: pendingDrivers } = await supabase.from('drivers').select('*, users ( name, email, phone )').eq('verified', false)
  const { data: allRides } = await supabase.from('rides').select('*, traveler:users!rides_traveler_id_fkey(name), driver:users!rides_driver_id_fkey(name)').order('created_at', { ascending: false })
  const { data: allWallets } = await supabase.from('wallets').select('balance')

  const totalRides = allRides?.length || 0
  const paidRides = allRides?.filter(r => r.traveler_paid && r.driver_paid).length || 0
  const totalRevenue = paidRides * 200 
  const totalMaicoins = allWallets?.reduce((sum, wallet) => sum + Number(wallet.balance), 0) || 0

  // COLOR PALETTE MAP:
  // Background: #F6F3C2 (Cream)
  // Primary Teal: #4B9DA9
  // Light Teal: #91C6BC
  // Orange Accent: #E37434

  return (
    <div className="min-h-screen bg-[#F6F3C2] p-8 text-slate-900 font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-[#91C6BC]/30">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-[#4B9DA9]">
              <Activity className="w-8 h-8" /> Central Command
            </h1>
            <p className="text-slate-500 mt-1">Platform Analytics & User Management</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/config" className="bg-[#4B9DA9] hover:bg-[#3A7E88] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition">
              <Settings className="w-4 h-4"/> API Config
            </Link>
          </div>
        </header>

        {/* CONDITIONAL RENDERING BASED ON CLICKED CARDS */}
        {view === 'dashboard' && (
          <>
            {/* CLICKABLE KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link href="?view=revenue" className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[#4B9DA9] transition cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#91C6BC]/20 p-3 rounded-xl"><TrendingUp className="w-6 h-6 text-[#4B9DA9]"/></div>
                  <span className="text-xs font-bold text-[#E37434] bg-[#E37434]/10 px-2 py-1 rounded-md">View Details →</span>
                </div>
                <p className="text-slate-500 text-sm font-semibold mb-1">Platform Revenue</p>
                <h3 className="text-3xl font-extrabold text-[#4B9DA9]">₹{totalRevenue}</h3>
              </Link>

              <Link href="?view=rides" className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[#4B9DA9] transition cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#91C6BC]/20 p-3 rounded-xl"><Car className="w-6 h-6 text-[#4B9DA9]"/></div>
                  <span className="text-xs font-bold text-[#E37434] bg-[#E37434]/10 px-2 py-1 rounded-md">View Details →</span>
                </div>
                <p className="text-slate-500 text-sm font-semibold mb-1">Total Rides</p>
                <h3 className="text-3xl font-extrabold text-[#4B9DA9]">{totalRides}</h3>
              </Link>

              <Link href="?view=users" className="bg-white p-6 rounded-2xl shadow-sm border border-transparent hover:border-[#4B9DA9] transition cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#91C6BC]/20 p-3 rounded-xl"><Users className="w-6 h-6 text-[#4B9DA9]"/></div>
                  <span className="text-xs font-bold text-[#E37434] bg-[#E37434]/10 px-2 py-1 rounded-md">Manage Users →</span>
                </div>
                <p className="text-slate-500 text-sm font-semibold mb-1">Registered Users</p>
                <h3 className="text-3xl font-extrabold text-[#4B9DA9]">{allUsers?.length || 0}</h3>
              </Link>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-transparent">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-[#E37434]/20 p-3 rounded-xl"><Coins className="w-6 h-6 text-[#E37434]"/></div>
                </div>
                <p className="text-slate-500 text-sm font-semibold mb-1">Maicoins Issued</p>
                <h3 className="text-3xl font-extrabold text-[#E37434]">🪙 {totalMaicoins}</h3>
              </div>
            </div>

            {/* APPROVAL QUEUE */}
            <div className="bg-white p-8 rounded-3xl shadow-sm">
              <h2 className="text-2xl font-extrabold text-[#4B9DA9] flex items-center gap-2 mb-6"><UserCheck className="w-6 h-6"/> KYC Approval Queue</h2>
              {(!pendingDrivers || pendingDrivers.length === 0) ? (
                <p className="text-slate-500 italic">No pending verifications.</p>
              ) : (
                <div className="space-y-4">
                  {pendingDrivers.map((driver) => (
                    <div key={driver.user_id} className="border border-[#91C6BC]/50 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="font-bold">{driver.users.name} <span className="text-sm font-normal text-slate-500">({driver.users.phone})</span></p>
                        <p className="text-sm text-slate-600">Vehicle: {driver.vehicle_make} | GPS: {driver.geo_tag_lat}, {driver.geo_tag_lng}</p>
                      </div>
                      <form action={async () => { 'use server'; await approveDriver(driver.user_id); }}>
                        <button className="bg-[#4B9DA9] text-white px-4 py-2 rounded-lg font-bold">Approve</button>
                      </form>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- DETAILED USERS VIEW (USER MANAGEMENT) --- */}
        {view === 'users' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-[#4B9DA9] flex items-center gap-2"><Users className="w-6 h-6"/> User Management</h2>
              <Link href="?" className="text-[#E37434] font-bold flex items-center gap-1 hover:underline"><ArrowLeft className="w-4 h-4"/> Back</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#91C6BC]/20 text-[#4B9DA9]">
                    <th className="p-4 rounded-tl-xl">Name</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers?.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 font-bold">{u.name}</td>
                      <td className="p-4 text-sm">{u.email}<br/>{u.phone}</td>
                      <td className="p-4 capitalize"><span className="bg-slate-200 px-2 py-1 rounded text-xs">{u.user_type}</span></td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.account_status === 'suspended' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {u.account_status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="p-4 flex gap-2">
                        {/* Suspend Action */}
                        <form action={async () => { 'use server'; await toggleSuspendUser(u.id, u.account_status || 'active'); }}>
                          <button className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg tooltip" title="Suspend/Unsuspend">
                            <Ban className="w-4 h-4"/>
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- DETAILED RIDES VIEW --- */}
        {view === 'rides' && (
          <div className="bg-white p-8 rounded-3xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-[#4B9DA9] flex items-center gap-2"><Car className="w-6 h-6"/> Ride Ledger</h2>
              <Link href="?" className="text-[#E37434] font-bold flex items-center gap-1 hover:underline"><ArrowLeft className="w-4 h-4"/> Back</Link>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#91C6BC]/20 text-[#4B9DA9]">
                  <th className="p-4 rounded-tl-xl">Traveler</th>
                  <th className="p-4">Driver</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-tr-xl">Payments (T/D)</th>
                </tr>
              </thead>
              <tbody>
                {allRides?.map(r => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="p-4 font-semibold">{r.traveler?.name || 'Unknown'}</td>
                    <td className="p-4 font-semibold">{r.driver?.name || 'Waiting...'}</td>
                    <td className="p-4 capitalize">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-[#E37434]/20 text-[#E37434]'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-mono">
                      {r.traveler_paid ? '✅' : '❌'} / {r.driver_paid ? '✅' : '❌'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}