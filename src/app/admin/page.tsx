import { createClient } from '@/utils/supabase/server'
import { approveDriver, toggleSuspendUser, updateUserRecord, deleteUserAction } from './actions'
import { Activity, Settings, Save, Ban, Trash2, CheckCircle, BarChart3, Coins, TrendingUp, AlertTriangle, LogOut, Car, Users } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminPage(props: { searchParams: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const view = searchParams.view || 'dashboard';
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>Access Denied</div>
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') redirect('/')

  // Fetch Data
  const { data: allUsers } = await supabase.from('users').select('*').order('created_at', { ascending: false })
  const { data: pendingDrivers } = await supabase.from('drivers').select('*, users ( name, email, phone )').eq('verified', false)
  const { data: allRides } = await supabase.from('rides').select('*')
  const { data: allWallets } = await supabase.from('wallets').select('balance')

  // Analytics Logic
  const rides24h = allRides || [];
  const completed24h = rides24h.filter(r => r.status === 'completed').length;
  const ongoing24h = rides24h.filter(r => r.status === 'in-progress' || r.status === 'booked').length;
  const collectedRevenue = (allRides?.filter(r => r.traveler_paid && r.driver_paid).length || 0) * 200;
  const pendingRevenue = (allRides?.filter(r => !r.traveler_paid || !r.driver_paid).length || 0) * 200;
  const totalMaicoins = allWallets?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;
  const isNegativeCashflow = totalMaicoins > collectedRevenue;

  async function handleLogout() { 'use server'; const s = await createClient(); await s.auth.signOut(); redirect('/login') }

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
      {/* HEADER */}
      <header className="flex justify-between items-center bg-[#023047] p-6 rounded-3xl text-white shadow-xl mb-8">
        <div>
            <h1 className="text-3xl font-black flex items-center gap-3"><Activity className="text-[#ffb703]" /> Central Command</h1>
            <p className="text-blue-200 mt-1">Platform Analytics & Operations</p>
        </div>
        <div className="flex gap-3">
            <Link href="/admin/config" className="h-12 px-6 rounded-xl bg-[#fb8500] hover:bg-[#ffb703] font-bold flex items-center gap-2 transition">
                <Settings size={18}/> Settings
            </Link>
            <form action={handleLogout}>
                <button type="submit" className="h-12 px-6 rounded-xl bg-red-500 hover:bg-red-600 font-bold flex items-center gap-2 transition">
                    <LogOut size={18}/> Logout
                </button>
            </form>
        </div>
      </header>

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div className="space-y-8">
            {isNegativeCashflow && <div className="bg-red-100 text-red-800 p-6 rounded-2xl border-l-8 border-red-500 font-bold flex gap-4"><AlertTriangle/> CRITICAL: Negative Cashflow Risk Detected.</div>}
            
            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Link href="?view=kyc" className="bg-white p-6 rounded-3xl border shadow-sm hover:border-[#fb8500] transition">
                    <div className="text-slate-400 font-bold text-sm">KYC PENDING</div>
                    <div className="text-4xl font-black mt-2">{pendingDrivers?.length || 0}</div>
                </Link>
                <Link href="?view=rides" className="bg-white p-6 rounded-3xl border shadow-sm hover:border-blue-500 transition">
                    <div className="text-slate-400 font-bold text-sm">RIDES (24H)</div>
                    <div className="text-4xl font-black mt-2">{completed24h + ongoing24h}</div>
                </Link>
                <Link href="?view=revenue" className="bg-white p-6 rounded-3xl border shadow-sm hover:border-green-500 transition">
                    <div className="text-slate-400 font-bold text-sm">REVENUE</div>
                    <div className="text-4xl font-black mt-2 text-green-600">₹{collectedRevenue}</div>
                </Link>
                <Link href="?view=users" className="bg-white p-6 rounded-3xl border shadow-sm hover:border-purple-500 transition">
                    <div className="text-slate-400 font-bold text-sm">TOTAL USERS</div>
                    <div className="text-4xl font-black mt-2">{allUsers?.length || 0}</div>
                </Link>
            </div>

            {/* GRAPHS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <h2 className="font-bold mb-6 flex items-center gap-2"><BarChart3 className="text-blue-500"/> Live 24H Ride Status</h2>
                <div className="flex items-end gap-8 h-32 mt-4 border-b pb-2">
                  <div className="w-1/2 text-center"><div className="text-2xl font-black text-emerald-500">{completed24h}</div><div className="text-sm font-bold text-slate-500">Completed</div></div>
                  <div className="w-1/2 text-center"><div className="text-2xl font-black text-amber-500">{ongoing24h}</div><div className="text-sm font-bold text-slate-500">On-going</div></div>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border shadow-sm">
                <h2 className="font-bold mb-6 flex items-center gap-2"><Coins className="text-green-500"/> Revenue Funnel</h2>
                <div className="flex items-end gap-8 h-32 mt-4 border-b pb-2">
                  <div className="w-1/2 text-center"><div className="text-2xl font-black text-blue-600">₹{collectedRevenue}</div><div className="text-sm font-bold text-slate-500">Collected</div></div>
                  <div className="w-1/2 text-center"><div className="text-2xl font-black text-purple-500">₹{pendingRevenue}</div><div className="text-sm font-bold text-slate-500">In Funnel</div></div>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* VIEW: USER MANAGEMENT (With Edit/Delete) */}
      {view === 'users' && (
        <div className="bg-white p-8 rounded-3xl border shadow-sm">
          <Link href="?" className="text-[#fb8500] font-bold mb-6 block">← Back to Dashboard</Link>
          <h2 className="text-2xl font-bold mb-6">User Directory</h2>
          <div className="space-y-4">
            {allUsers?.map(u => (
              <div key={u.id} className="grid grid-cols-4 items-center gap-4 border-b pb-4">
                <form action={updateUserRecord} className="col-span-3 grid grid-cols-3 gap-4">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input name="name" defaultValue={u.name} className="border p-3 rounded-xl" />
                    <span className="text-slate-500 truncate">{u.email}</span>
                    <select name="role" defaultValue={u.user_type} className="border p-3 rounded-xl">
                        <option value="traveler">Traveler</option><option value="driver">Driver</option>
                        <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
                    </select>
                </form>
                <div className="flex gap-2 justify-end">
                    <form action={updateUserRecord}><input type="hidden" name="user_id" value={u.id}/><button type="submit" className="bg-blue-50 text-blue-600 p-3 rounded-xl"><Save size={20}/></button></form>
                    <form action={async () => { 'use server'; await toggleSuspendUser(u.id, u.account_status || 'active') }}><button type="submit" className="bg-orange-50 text-orange-600 p-3 rounded-xl"><Ban size={20}/></button></form>
                    <form action={deleteUserAction}><input type="hidden" name="user_id" value={u.id}/><button type="submit" className="bg-red-50 text-red-600 p-3 rounded-xl"><Trash2 size={20}/></button></form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}