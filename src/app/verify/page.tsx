'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { submitDriverKyc } from './actions'
import { Camera, Car, ShieldCheck, Loader2, MapPin } from 'lucide-react'

export default function VerifyPage() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [gpsStatus, setGpsStatus] = useState('Waiting for GPS...')
  const supabase = createClient()

  async function uploadFile(file: File, folderName: string) {
    if (!file || file.size === 0) return ''
    const fileName = `${folderName}-${Date.now()}-${file.name.replace(/\s/g, '_')}`
    const { data, error } = await supabase.storage.from('kyc-documents').upload(fileName, file)
    if (error) throw error
    const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  // Securely get exact GPS coordinates
  const getGpsLocation = (): Promise<{lat: number, lng: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('GPS not supported by browser'))
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (err) => reject(new Error('You must allow Location Access to verify your account.')),
        { enableHighAccuracy: true } // Forces exact GPS
      )
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setGpsStatus('Acquiring secure GPS location...')

    try {
      // 1. Force GPS Location Check FIRST
      const coords = await getGpsLocation()
      setGpsStatus(`GPS Secured: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)

      const form = new FormData(e.currentTarget)

      // 2. Upload ALL images (including new live selfies)
      const [
        rcFrontUrl, rcBackUrl, dlFrontUrl, dlBackUrl, aadharFrontUrl, aadharBackUrl,
        selfieFaceUrl, selfieVehicleUrl
      ] = await Promise.all([
        uploadFile(form.get('rc_front') as File, 'rc'),
        uploadFile(form.get('rc_back') as File, 'rc'),
        uploadFile(form.get('dl_front') as File, 'dl'),
        uploadFile(form.get('dl_back') as File, 'dl'),
        uploadFile(form.get('aadhar_front') as File, 'aadhar'),
        uploadFile(form.get('aadhar_back') as File, 'aadhar'),
        uploadFile(form.get('selfie_face') as File, 'selfie_face'),
        uploadFile(form.get('selfie_vehicle') as File, 'selfie_vehicle')
      ])

      // 3. Save data + Exact GPS Timestamp
      const kycData = {
        vehicle_make: form.get('vehicle_make'),
        vehicle_model: form.get('vehicle_model'),
        vehicle_capacity: parseInt(form.get('vehicle_capacity') as string),
        fuel_type: form.get('fuel_type'),
        insurance_type: form.get('insurance_type'),
        insurance_validity: form.get('insurance_validity'),
        chassis_number: form.get('chassis_number'),
        rc_front: rcFrontUrl, rc_back: rcBackUrl,
        dl_front: dlFrontUrl, dl_back: dlBackUrl,
        aadhar_front: aadharFrontUrl, aadhar_back: aadharBackUrl,
        selfie_face: selfieFaceUrl,
        selfie_vehicle: selfieVehicleUrl,
        geo_tag_lat: coords.lat, // Securely grabbed from GPS device
        geo_tag_lng: coords.lng
      }

      const result = await submitDriverKyc(kycData)
      if (result.error) throw new Error(result.error)

      window.location.href = '/'

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Something went wrong. Ensure location is enabled.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 text-black">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        
        <div className="flex items-center gap-4 mb-8 pb-6 border-b">
          <div className="bg-orange-100 p-3 rounded-full">
            <ShieldCheck className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Live Driver Verification</h1>
            <p className="text-slate-500 text-sm flex items-center gap-1"><MapPin className="w-4 h-4"/> Location tracking enabled for security.</p>
          </div>
        </div>

        {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-semibold border border-red-200">❌ {errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* LIVE SELFIES (New) */}
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Camera className="w-5 h-5"/> Live Photo Verification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <div>
                <label className="font-semibold text-sm mb-2 block">Live Face Selfie *</label>
                {/* capture="user" forces front camera on phones! */}
                <input type="file" name="selfie_face" accept="image/*" capture="user" required className="w-full text-sm bg-white p-2 rounded-lg border border-blue-200" />
              </div>
              <div>
                <label className="font-semibold text-sm mb-2 block">Selfie with Vehicle *</label>
                {/* capture="environment" forces back camera! */}
                <input type="file" name="selfie_vehicle" accept="image/*" capture="environment" required className="w-full text-sm bg-white p-2 rounded-lg border border-blue-200" />
              </div>
            </div>
          </div>

          {/* VEHICLE DETAILS */}
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Car className="w-5 h-5"/> Vehicle Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="vehicle_make" placeholder="Make (e.g. Maruti Suzuki)" required className="border p-3 rounded-xl bg-slate-50" />
              <input name="vehicle_model" placeholder="Model (e.g. Swift Dzire)" required className="border p-3 rounded-xl bg-slate-50" />
              <input name="vehicle_capacity" type="number" placeholder="Seat Capacity (e.g. 4)" required className="border p-3 rounded-xl bg-slate-50" />
              <select name="fuel_type" required className="border p-3 rounded-xl bg-slate-50">
                <option value="">Select Fuel Type</option>
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="EV">Electric (EV)</option>
              </select>
              <select name="insurance_type" required className="border p-3 rounded-xl bg-slate-50">
                <option value="">Insurance Type</option>
                <option value="1st Party">1st Party (Comprehensive)</option>
                <option value="3rd Party">3rd Party</option>
              </select>
              <input name="insurance_validity" type="date" required className="border p-3 rounded-xl bg-slate-50" />
              <input name="chassis_number" placeholder="Chassis Number" required className="border p-3 rounded-xl bg-slate-50 md:col-span-2" />
            </div>
          </div>

          {/* DOCUMENT UPLOADS */}
          <div>
            <h2 className="text-lg font-bold mb-4">Live Document Scan</h2>
            <p className="text-xs text-slate-500 mb-4">Please place documents on a flat surface. Camera will open automatically.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="border p-4 rounded-xl bg-slate-50">
                <label className="font-semibold text-sm mb-2 block">RC (Front & Back) *</label>
                <input type="file" name="rc_front" accept="image/*" capture="environment" required className="mb-2 w-full text-sm" />
                <input type="file" name="rc_back" accept="image/*" capture="environment" required className="w-full text-sm" />
              </div>

              <div className="border p-4 rounded-xl bg-slate-50">
                <label className="font-semibold text-sm mb-2 block">Driving License (Front & Back) *</label>
                <input type="file" name="dl_front" accept="image/*" capture="environment" required className="mb-2 w-full text-sm" />
                <input type="file" name="dl_back" accept="image/*" capture="environment" required className="w-full text-sm" />
              </div>

              <div className="border p-4 rounded-xl bg-slate-50 md:col-span-2">
                <label className="font-semibold text-sm mb-2 block">Aadhar Card (Front & Back) *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="file" name="aadhar_front" accept="image/*" capture="environment" required className="w-full text-sm" />
                  <input type="file" name="aadhar_back" accept="image/*" capture="environment" required className="w-full text-sm" />
                </div>
              </div>

            </div>
          </div>

          <button disabled={loading} className="w-full bg-black text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-lg">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> {gpsStatus}</> : 'Capture & Submit Secure KYC'}
          </button>

        </form>
      </div>
    </div>
  )
}