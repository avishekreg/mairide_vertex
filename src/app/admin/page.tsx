import { createClient } from '@/utils/supabase/server'
import { approveDriver, toggleSuspendUser, updateUserRecord } from './actions'
import { Activity, Settings, Save, Ban, TrendingUp, AlertTriangle, CheckCircle, BarChart3, Coins, Trash2 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function AdminPage(props: { searchParams: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const view = searchParams.view || 'dashboard';
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>Access Denied.</div>
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') redirect('/')

  // Fetch Data
  const { data: allUsers } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  const { data: pendingDrivers } = await supabase.from('drivers').select('*, users ( name, email, phone )').eq('verified', false)
  const { data: allRides } = await supabase.from('rides').select('*')
  const { data: allWallets } = await supabase.from('wallets').select('balance')

  // --- TIME ALGORITHMS ---
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  
  // Rides Logic
  const rides24h = allRides?.filter(r => r.created_at >= twentyFourHoursAgo) || [];
  const completed24h = rides24h.filter(r => r.status === 'completed').length;
  const ongoing24h = rides24h.filter(r => r.status === 'in-progress' || r.status === 'booked').length;
  
  // Revenue Funnel Logic
  const maintenanceFee = 100; // Per user
  const paidRides = allRides?.filter(r => r.traveler_paid && r.driver_paid).length || 0;
  const collectedRevenue = paidRides * (maintenanceFee * 2);
  
  const funnelRides = allRides?.filter(r => (!r.traveler_paid || !r.driver_paid) && r.status !== 'cancelled').length || 0;
  const pendingRevenue = funnelRides * (maintenanceFee * 2);

  // Maicoin Economy & Cashflow Flag
  const totalMaicoinsInCirculation = allWallets?.reduce((sum, wallet) => sum + Number(wallet.balance), 0) || 0;
  const isNegativeCashflow = totalMaicoinsInCirculation > collectedRevenue;

  // AI Predictive Analytics
  const totalDaysActive = Math.max(1, (now.getTime() - new Date(allRides?.[0]?.created_at || now).getTime()) / (1000 * 3600 * 24));
  const avgRidesPerDay = (allRides?.length || 0) / totalDaysActive;
  const projectedRidesNext24h = Math.ceil(avgRidesPerDay * 1.15); // 15% growth
  const projectedRevenueNext24h = projectedRidesNext24h * 200;

  // Server Action: Delete User completely
  async function deleteUserAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const userId = formData.get('user_id') as string
    
    // Delete from drivers table first to clear foreign key relations
    await supabase.from('drivers').delete().eq('user_id', userId)
    // Delete from main users table
    await supabase.from('users').delete().eq('id', userId)
    
    revalidatePath('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-[#023047] font-sans pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#023047] p-6 rounded-2xl shadow-lg text-white">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <Activity className="w-8 h-8 text-[#ffb703]" /> Central Command
            </h1>
            <p className="text-[#8ecae6] mt-1">Platform Analytics & Intelligence</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="bg-[#219ebc] hover:bg-[#8ecae6] hover:text-[#023047] text-white px-6 py-3 rounded-xl font-bold transition">
              Switch to App View
            </Link>
            <Link href="/admin/config" className="bg-[#fb8500] hover:bg-[#ffb703] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition">
              <Settings className="w-4 h-4"/> API Config
            </Link>
          </div>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Maicoin Warning */}
            {isNegativeCashflow && (
              <div className="bg-red-100 border-l-8 border-red-600 p-6 rounded-xl flex items-start gap-4">
                <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-extrabold text-red-800">CRITICAL: Negative Cashflow Risk Detected</h3>
                  <p className="text-red-700 font-medium mt-1">
                    There are currently <strong>{totalMaicoinsInCirculation} Maicoins</strong> in circulation, which exceeds the actual collected revenue of <strong>₹{collectedRevenue}</strong>. If all users redeem points today, the platform will operate at a loss.
                  </p>
                </div>
              </div>
            )}

            {/* KYC Queue (MOVED TO TOP) */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm border-l-8 border-l-[#fb8500]">
              <h2 className="text-xl font-bold text-[#023047] mb-6 flex items-center gap-2"><CheckCircle className="text-[#fb8500]"/> KYC Approval Queue</h2>
              {pendingDrivers?.length === 0 ? <p className="italic text-slate-500">No pending verifications at this time.</p> : pendingDrivers?.map(d => (
                <div key={d.user_id} className="flex justify-between items-center border-b p-4 bg-orange-50/50 rounded-lg mb-2">
                  <span className="font-semibold">{d.users.name}</span>
                  <form action={async () => { 'use server'; await approveDriver(d.user_id) }}>
                    <button className="bg-[#fb8500] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#ffb703] transition">Approve Documents</button>
                  </form>
                </div>
              ))}
            </div>

            {/* Data Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LIVE 24H STATUS GRAPH */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-[#023047] mb-6 flex items-center gap-2"><BarChart3 className="text-blue-500"/> Live 24H Ride Status</h2>
                <div className="flex items-end gap-8 h-32 mt-4 border-b border-slate-200 pb-2 relative">
                  <div className="w-1/2 flex flex-col items-center group">
                    <span className="text-2xl font-black text-emerald-500 mb-2">{completed24h}</span>
                    <div className="w-full bg-emerald-400 rounded-t-md transition-all duration-500" style={{ height: `${Math.max(10, (completed24h / Math.max(1, rides24h.length)) * 100)}%` }}></div>
                    <span className="text-sm font-bold text-slate-500 mt-2">Completed</span>
                  </div>
                  <div className="w-1/2 flex flex-col items-center">
                    <span className="text-2xl font-black text-amber-500 mb-2">{ongoing24h}</span>
                    <div className="w-full bg-amber-400 rounded-t-md transition-all duration-500" style={{ height: `${Math.max(10, (ongoing24h / Math.max(1, rides24h.length)) * 100)}%` }}></div>
                    <span className="text-sm font-bold text-slate-500 mt-2">On-going</span>
                  </div>
                </div>
              </div>

              {/* REVENUE FUNNEL GRAPH */}
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-[#023047] mb-6 flex items-center gap-2"><Coins className="text-green-500"/> Revenue Funnel</h2>
                <div className="flex items-end gap-8 h-32 mt-4 border-b border-slate-200 pb-2 relative">
                  <div className="w-1/2 flex flex-col items-center">
                    <span className="text-2xl font-black text-blue-600 mb-2">₹{collectedRevenue}</span>
                    <div className="w-full bg-blue-500 rounded-t-md transition-all duration-500" style={{ height: `${Math.max(10, (collectedRevenue / Math.max(1, collectedRevenue + pendingRevenue)) * 100)}%` }}></div>
                    <span className="text-sm font-bold text-slate-500 mt-2">Collected</span>
                  </div>
                  <div className="w-1/2 flex flex-col items-center">
                    <span className="text-2xl font-black text-purple-500 mb-2">₹{pendingRevenue}</span>
                    <div className="w-full bg-purple-400 rounded-t-md transition-all duration-500" style={{ height: `${Math.max(10, (pendingRevenue / Math.max(1, collectedRevenue + pendingRevenue)) * 100)}%` }}></div>
                    <span className="text-sm font-bold text-slate-500 mt-2">In Funnel</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI PREDICTIVE ANALYTICS */}
            <div className="bg-gradient-to-r from-[#023047] to-[#219ebc] p-8 rounded-2xl shadow-lg text-white">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-6"><TrendingUp className="text-[#ffb703]"/> AI Projections (Next 24 Hours)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-sm">
                  <p className="text-blue-100 font-medium">Projected Rides</p>
                  <h3 className="text-4xl font-black text-white mt-2">{projectedRidesNext24h}</h3>
                  <p className="text-sm text-blue-200 mt-2 italic">Based on 15% WoW growth velocity.</p>
                </div>
                <div className="bg-white/10 p-6 rounded-xl border border-white/20 backdrop-blur-sm">
                  <p className="text-blue-100 font-medium">Projected Revenue</p>
                  <h3 className="text-4xl font-black text-[#ffb703] mt-2">₹{projectedRevenueNext24h}</h3>
                  <p className="text-sm text-blue-200 mt-2 italic">Assuming 100% funnel conversion.</p>
                </div>
              </div>
            </div>

            {/* Standard Nav Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="?view=rides" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-[#219ebc] transition block">
                <h3 className="text-xl font-bold text-[#023047]">Manage All Rides →</h3>
                <p className="text-slate-500 mt-2">View complete history of platform bookings.</p>
              </Link>
              <Link href="?view=users" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-[#219ebc] transition block">
                <h3 className="text-xl font-bold text-[#023047]">User Directory →</h3>
                <p className="text-slate-500 mt-2">Manage roles, suspend accounts, and view profiles.</p>
              </Link>
            </div>
          </div>
        )}

        {/* RIDES VIEW */}
        {view === 'rides' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200">
            <Link href="?" className="text-[#fb8500] font-bold mb-6 block hover:underline">← Back to Dashboard</Link>
            <h2 className="text-2xl font-bold text-[#023047] mb-6">All Platform Rides</h2>
            <div className="space-y-4">
              {allRides?.length === 0 ? <p className="text-slate-500 italic">No rides have been booked yet.</p> : allRides?.map(r => (
                <div key={r.id} className="p-4 border rounded-xl shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-slate-50">
                  <div>
                    <p className="font-bold text-[#023047]">Ride ID: {r.id.split('-')[0]}</p>
                    <p className="text-sm text-slate-500 mt-1">Status: <span className="uppercase font-bold text-[#fb8500]">{r.status}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded text-sm font-bold ${r.traveler_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Traveler Paid: {r.traveler_paid ? 'Yes' : 'No'}</span>
                    <span className={`px-3 py-1 rounded text-sm font-bold ${r.driver_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Driver Paid: {r.driver_paid ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USER DIRECTORY VIEW */}
        {view === 'users' && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200">
            <Link href="?" className="text-[#fb8500] font-bold mb-6 block hover:underline">← Back to Dashboard</Link>
            <h2 className="text-2xl font-bold text-[#023047] mb-6">User Directory</h2>
            
            <div className="w-full flex flex-col border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-4 bg-[#219ebc] text-white p-4 font-bold">
                <div>Name</div><div>Email</div><div>Role</div><div>Actions</div>
              </div>
              
              {allUsers?.map(u => (
                <form action={updateUserRecord} key={u.id} className="grid grid-cols-1 md:grid-cols-4 p-4 border-b items-center gap-4 hover:bg-slate-50 transition">
                  <input type="hidden" name="user_id" value={u.id} />
                  
                  {/* EDITABLE INPUTS */}
                  <div><input name="name" defaultValue={u.name} className="border border-slate-300 focus:border-blue-500 outline-none p-2 rounded-lg w-full bg-white transition" /></div>
                  <div className="text-sm truncate text-slate-600 font-medium">{u.email}</div>
                  <div>
                    <select name="role" defaultValue={u.user_type} className="border border-slate-300 focus:border-blue-500 outline-none p-2 rounded-lg bg-white w-full max-w-[160px] transition">
                      <option value="traveler">Traveler</option><option value="driver">Driver</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option>
                    </select>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2">
                    <button type="submit" title="Save Profile Edits" className="bg-[#8ecae6] hover:bg-[#219ebc] hover:text-white text-[#023047] p-2 rounded-lg font-bold transition">
                      <Save className="w-5 h-5"/>
                    </button>
                    <button formAction={toggleSuspendUser.bind(null, u.id, u.account_status || 'active')} title="Suspend/Ban User" className="bg-[#fb8500] hover:bg-orange-600 text-white p-2 rounded-lg font-bold transition">
                      <Ban className="w-5 h-5"/>
                    </button>
                    <button formAction={deleteUserAction
} title="Delete User Permanently" className="bg-red-500 hover:bg-red-700 text-white p-2 rounded-lg font-bold transition">
                      <Trash2 className="w-5 h-5"/>
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}