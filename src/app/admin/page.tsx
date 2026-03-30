import { createClient } from '@/utils/supabase/server'
import { approveDriver, toggleSuspendUser, updateUserRecord, deleteUserAction } from './actions'
import { Activity, Settings, Save, Ban, Trash2, CheckCircle, BarChart3, Coins, TrendingUp, AlertTriangle, LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export default async function AdminPage(props: { searchParams: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const view = searchParams.view || 'dashboard';
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>Access Denied</div>
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  if (profile?.user_type !== 'admin' && profile?.user_type !== 'super_admin') redirect('/')

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
  
  async function handleLogout() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-[#023047]">
      <header className="flex justify-between bg-[#023047] p-6 rounded-2xl text-white mb-8 shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3"><Activity /> Central Command</h1>
        <div className="flex gap-4">
            <Link href="/admin/config" className="bg-[#fb8500] px-4 py-2 rounded-lg font-bold">API Config</Link>
            <form action={handleLogout}><button type="submit" className="bg-red-500 px-4 py-2 rounded-lg font-bold flex items-center gap-2"><LogOut size={16}/> Logout</button></form>
        </div>
      </header>

      {view === 'dashboard' && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border-l-8 border-l-[#fb8500] shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><CheckCircle/> KYC Approval Queue</h2>
            {pendingDrivers?.length === 0 ? <p className="text-slate-500">No pending verifications.</p> : pendingDrivers?.map(d => (
              <div key={d.user_id} className="flex justify-between items-center border-b p-4">
                <span className="font-semibold">{d.users?.name || 'Unknown'}</span>
                <form action={async () => { 'use server'; await approveDriver(d.user_id) }}><button className="bg-[#fb8500] text-white px-4 py-2 rounded-lg font-bold">Approve</button></form>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link href="?view=rides" className="bg-white p-6 rounded-2xl shadow-sm border">Rides Data →</Link>
            <Link href="?view=users" className="bg-white p-6 rounded-2xl shadow-sm border">User Directory →</Link>
          </div>
        </div>
      )}

      {view === 'users' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm">
          <Link href="?" className="text-[#fb8500] font-bold mb-6 block">← Back to Dashboard</Link>
          <div className="space-y-4">
            {allUsers?.map(u => (
              <div key={u.id} className="grid grid-cols-4 items-center gap-4 border-b pb-4">
                <form action={updateUserRecord} className="col-span-3 grid grid-cols-3 gap-4">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input name="name" defaultValue={u.name} className="border p-2 rounded" />
                    <span className="text-slate-500">{u.email}</span>
                    <select name="role" defaultValue={u.user_type} className="border p-2 rounded">
                        <option value="traveler">Traveler</option><option value="driver">Driver</option>
                        <option value="admin">Admin</option><option value="super_admin">Super Admin</option>
                    </select>
                </form>
                <div className="flex gap-2">
                    <button formAction={updateUserRecord} className="bg-blue-100 p-2 rounded"><Save className="w-5 h-5"/></button>
                    <button onClick={async () => { 'use server'; await toggleSuspendUser(u.id, u.account_status || 'active') }} className="bg-orange-100 p-2 rounded"><Ban className="w-5 h-5"/></button>
                    <button onClick={async () => { 'use server'; await deleteUserAction(u.id) }} className="bg-red-100 p-2 rounded"><Trash2 className="w-5 h-5"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}