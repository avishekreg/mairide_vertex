import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Settings, Save, Lock, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export default async function ConfigPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div>Access Denied. Please Login.</div>

  const { data: dbUser } = await supabase.from('users').select('user_type').eq('id', user.id).single()
  if (!dbUser || (dbUser.user_type !== 'admin' && dbUser.user_type !== 'super_admin')) {
    redirect('/')
  }

  const { data: config } = await supabase.from('platform_config').select('*').eq('id', 1).single()
  const cookieStore = await cookies()
  const isUnlocked = cookieStore.get('config_unlocked')?.value === 'true'

  async function unlockConfig(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: c } = await supabase.from('platform_config').select('config_password').eq('id', 1).single()
    if (formData.get('password') === c?.config_password) {
      (await cookies()).set('config_unlocked', 'true', { maxAge: 3600 })
      redirect('/admin/config')
    } else { redirect('/admin/config?error=Incorrect Password') }
  }

  async function updateConfig(formData: FormData) {
    'use server'
    const supabase = await createClient()
    let qrUrl = config?.qr_code_url;
    const file = formData.get('qr_file') as File;

    if (file && file.size > 0) {
      const fileName = `qr-${Date.now()}.png`
      const { data: uploadData } = await supabase.storage.from('kyc-documents').upload(fileName, file)
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(uploadData.path)
        qrUrl = urlData.publicUrl
      }
    }

    await supabase.from('platform_config').update({
      upi_id: formData.get('upi_id'),
      maintenance_fee: parseInt(formData.get('maintenance_fee') as string) || 100,
      referral_reward_amount: parseInt(formData.get('referral_reward_amount') as string) || 25,
      qr_code_url: qrUrl,
      config_password: formData.get('config_password'),
      map_api_key: formData.get('map_api_key'),
      payment_gateway_key: formData.get('payment_gateway_key'),
      sms_webhook_url: formData.get('sms_webhook_url'),
      support_email: formData.get('support_email'),
      app_domain_url: formData.get('app_domain_url')
    }).eq('id', 1)
    
    revalidatePath('/admin/config')
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="bg-slate-800 p-10 rounded-3xl max-w-md w-full border border-slate-700 text-center">
          <Lock className="w-16 h-16 mx-auto mb-6 text-red-500"/>
          <h1 className="text-2xl font-extrabold mb-8">System Locked</h1>
          <form action={unlockConfig}>
            <input name="password" type="password" required placeholder="Master Password" className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl mb-4 text-center font-bold" />
            <button className="w-full bg-blue-600 p-4 rounded-xl font-bold">Unlock</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-black pb-20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6"><Link href="/admin" className="text-slate-500 hover:text-blue-600 font-bold">← Back to Dashboard</Link></div>
        <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3"><Settings className="text-purple-600" /> API & Platform Configuration</h1>
        
        <form action={updateConfig} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
          
          {/* Section 1: Core Financials */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Core Financials & QR</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-bold text-slate-600 mb-2">Platform UPI ID</label><input name="upi_id" defaultValue={config?.upi_id} className="w-full border p-3 rounded-xl" /></div>
              <div><label className="block text-sm font-bold text-slate-600 mb-2">Maintenance Fee (₹)</label><input name="maintenance_fee" type="number" defaultValue={config?.maintenance_fee} className="w-full border p-3 rounded-xl" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-2">Upload Payment QR Code</label><div className="flex items-center gap-4">{config?.qr_code_url && <img src={config.qr_code_url} alt="QR" className="w-16 h-16 rounded border"/>}<input type="file" name="qr_file" accept="image/*" className="w-full border p-3 rounded-xl bg-white" /></div></div>
            </div>
          </div>

          {/* Section 2: External APIs & Webhooks */}
          <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
            <h2 className="text-lg font-bold text-orange-900 mb-4">External APIs & Webhooks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-bold text-slate-600 mb-2">Google Maps API Key</label><input name="map_api_key" defaultValue={config?.map_api_key} className="w-full border p-3 rounded-xl" placeholder="AIzaSy..." /></div>
              <div><label className="block text-sm font-bold text-slate-600 mb-2">Payment Gateway Key (Razorpay)</label><input name="payment_gateway_key" defaultValue={config?.payment_gateway_key} className="w-full border p-3 rounded-xl" placeholder="rzp_live_..." /></div>
              <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-2">SMS/WhatsApp Webhook URL</label><input name="sms_webhook_url" defaultValue={config?.sms_webhook_url} className="w-full border p-3 rounded-xl" placeholder="https://api.twilio.com/..." /></div>
            </div>
          </div>

          {/* Section 3: Platform Meta */}
          <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Platform Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-bold text-slate-600 mb-2">Support Email</label><input name="support_email" defaultValue={config?.support_email} className="w-full border p-3 rounded-xl" placeholder="support@mairide.com" /></div>
              <div><label className="block text-sm font-bold text-slate-600 mb-2">App Domain URL</label><input name="app_domain_url" defaultValue={config?.app_domain_url} className="w-full border p-3 rounded-xl" placeholder="https://mairide.com" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-bold text-slate-600 mb-2">Change Master Password</label><input name="config_password" type="password" defaultValue={config?.config_password} className="w-full border p-3 rounded-xl" /></div>
            </div>
          </div>

          <button className="w-full bg-black text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition shadow-lg">Save All Configurations</button>
        </form>
      </div>
    </div>
  )
}