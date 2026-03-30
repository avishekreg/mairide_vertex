import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Settings, Save, CreditCard, Link as LinkIcon, Coins, Lock, Smartphone, Mail, ShieldAlert, Key } from 'lucide-react'
import Link from 'next/link'

export default async function ConfigPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient()

  // 1. Base Security Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>Access Denied.</div>
  const { data: profile } = await supabase.from('users').select('user_type').eq('id', user.id).single()
  if (profile?.user_type !== 'admin') redirect('/')

  // Fetch the configurations
  const { data: config } = await supabase.from('platform_config').select('*').eq('id', 1).single()

  // 2. CHECK MASTER PASSWORD LOCK
  const cookieStore = await cookies()
  const isUnlocked = cookieStore.get('config_unlocked')?.value === 'true'

  // ACTION: Unlock the page
  async function unlockConfig(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: c } = await supabase.from('platform_config').select('config_password').eq('id', 1).single()
    
    if (formData.get('password') === c?.config_password) {
      const cookieStore = await cookies()
      cookieStore.set('config_unlocked', 'true', { maxAge: 3600 }) // Unlocks for 1 hour
      redirect('/admin/config')
    } else {
      redirect('/admin/config?error=Incorrect Master Password')
    }
  }

  // ACTION: Lock the page
  async function lockConfig() {
    'use server'
    const cookieStore = await cookies()
    cookieStore.delete('config_unlocked')
    redirect('/admin')
  }

  // ACTION: Save all API configs
  async function updateConfig(formData: FormData) {
    'use server'
    const supabase = await createClient()
    await supabase.from('platform_config').update({
      upi_id: formData.get('upi_id'),
      maintenance_fee: parseInt(formData.get('maintenance_fee') as string),
      referral_reward_amount: parseInt(formData.get('referral_reward_amount') as string),
      referral_reward_tier2: parseInt(formData.get('referral_reward_tier2') as string),
      google_maps_api_key: formData.get('google_maps_api_key'),
      razorpay_key: formData.get('razorpay_key'),
      mobile_otp_api_url: formData.get('mobile_otp_api_url'),
      mobile_otp_api_key: formData.get('mobile_otp_api_key'),
      email_otp_api_url: formData.get('email_otp_api_url'),
      email_otp_api_key: formData.get('email_otp_api_key'),
      config_password: formData.get('config_password')
    }).eq('id', 1)
    
    revalidatePath('/admin/config')
  }

  // --- RENDER LOCK SCREEN ---
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="bg-slate-800 p-10 rounded-3xl shadow-2xl max-w-md w-full border border-slate-700 text-center">
          <div className="bg-red-500/20 p-4 rounded-full w-fit mx-auto mb-6"><Lock className="w-10 h-10 text-red-500"/></div>
          <h1 className="text-2xl font-extrabold mb-2">Restricted Area</h1>
          <p className="text-slate-400 mb-8">Enter the Master Password to access platform APIs and core variables.</p>
          
          {searchParams.error && <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-6 font-bold">{searchParams.error}</div>}
          
          <form action={unlockConfig}>
            <input name="password" type="password" required placeholder="Master Password" className="w-full bg-slate-900 border border-slate-600 p-4 rounded-xl mb-4 text-center font-bold tracking-widest focus:border-blue-500 outline-none" />
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-bold transition shadow-lg shadow-blue-600/20">Unlock Dashboard</button>
          </form>
          <Link href="/admin" className="block mt-6 text-slate-500 hover:text-white transition text-sm">← Back to Safety</Link>
        </div>
      </div>
    )
  }

  // --- RENDER UNLOCKED CONFIG DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-50 p-8 text-black pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-600" /> Super Admin Config
          </h1>
          <div className="flex gap-3">
            <Link href="/admin" className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-3 rounded-xl font-bold transition">← Analytics</Link>
            <form action={lockConfig}>
              <button className="bg-red-100 hover:bg-red-200 text-red-600 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2">
                <Lock className="w-4 h-4"/> Lock 
              </button>
            </form>
          </div>
        </div>

        <form action={updateConfig} className="space-y-6">
          
          {/* Core Payments */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold border-b pb-4 mb-6 flex items-center gap-2"><CreditCard className="w-6 h-6 text-blue-500"/> Revenue & Payments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Platform UPI ID (For QR)</label>
                <input name="upi_id" defaultValue={config?.upi_id} className="w-full bg-slate-50 border p-3 rounded-xl font-mono" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Maintenance Fee Amount (₹)</label>
                <input name="maintenance_fee" type="number" defaultValue={config?.maintenance_fee} className="w-full bg-slate-50 border p-3 rounded-xl font-mono" />
              </div>
            </div>
          </div>

          {/* Referrals */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold border-b pb-4 mb-6 flex items-center gap-2"><Coins className="w-6 h-6 text-yellow-500"/> Referral Engine (Maicoins)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Tier 1 Reward (Direct Invite)</label>
                <input name="referral_reward_amount" type="number" defaultValue={config?.referral_reward_amount} className="w-full bg-slate-50 border p-3 rounded-xl font-mono" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Tier 2 Reward (Indirect Invite)</label>
                <input name="referral_reward_tier2" type="number" defaultValue={config?.referral_reward_tier2} className="w-full bg-slate-50 border p-3 rounded-xl font-mono" />
              </div>
            </div>
          </div>

          {/* OTP Integrations */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold border-b pb-4 mb-6 flex items-center gap-2"><ShieldAlert className="w-6 h-6 text-emerald-500"/> Security & OTP Integrations</h2>
            
            <div className="space-y-8">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-slate-700"><Smartphone className="w-5 h-5"/> Mobile SMS OTP API</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input name="mobile_otp_api_url" defaultValue={config?.mobile_otp_api_url} placeholder="https://api.sms-provider.com/v1/send" className="w-full bg-white border p-3 rounded-xl font-mono text-sm" />
                  <input name="mobile_otp_api_key" defaultValue={config?.mobile_otp_api_key} placeholder="API Key / Token" className="w-full bg-white border p-3 rounded-xl font-mono text-sm" />
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-slate-700"><Mail className="w-5 h-5"/> Email OTP API</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input name="email_otp_api_url" defaultValue={config?.email_otp_api_url} placeholder="https://api.sendgrid.com/..." className="w-full bg-white border p-3 rounded-xl font-mono text-sm" />
                  <input name="email_otp_api_key" defaultValue={config?.email_otp_api_key} placeholder="API Key / Token" className="w-full bg-white border p-3 rounded-xl font-mono text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* General APIs & Master Password */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold border-b pb-4 mb-6 flex items-center gap-2"><LinkIcon className="w-6 h-6 text-indigo-500"/> 3rd Party APIs & Access</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Google Maps API Key</label>
                <input name="google_maps_api_key" defaultValue={config?.google_maps_api_key} placeholder="AIzaSy..." className="w-full bg-slate-50 border p-3 rounded-xl font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2">Razorpay Key ID</label>
                <input name="razorpay_key" defaultValue={config?.razorpay_key} placeholder="rzp_live_..." className="w-full bg-slate-50 border p-3 rounded-xl font-mono text-sm" />
              </div>
              <div className="md:col-span-2 pt-4">
                <label className="block text-sm font-bold text-red-500 mb-2 flex items-center gap-2"><Key className="w-4 h-4"/> Change Master Password</label>
                <input name="config_password" defaultValue={config?.config_password} className="w-full bg-red-50 border-red-200 border p-3 rounded-xl font-mono text-sm text-red-900" />
              </div>
            </div>
          </div>

          {/* Floating Save Button */}
          <div className="sticky bottom-6 z-50">
            <button className="w-full max-w-2xl mx-auto block bg-black hover:bg-slate-800 text-white p-5 rounded-2xl font-extrabold text-xl transition shadow-2xl shadow-black/30 flex justify-center items-center gap-3">
              <Save className="w-6 h-6" /> Save Live Configurations
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}