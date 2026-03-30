import { createClient } from '@/utils/supabase/server'
import { submitPayment } from './actions'
import { Lock, Unlock, MessageCircle, Phone, ShieldCheck, QrCode } from 'lucide-react'

export default async function ActiveRidePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const rideId = params.id;

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ride } = await supabase.from('rides').select('*').eq('id', rideId).single()
  
  if (!ride || !user) return <div className="p-10 text-center text-xl font-bold bg-white text-black h-screen flex items-center justify-center">Ride not found in database.</div>

  const isTraveler = ride.traveler_id === user.id
  const waitingForDriver = ride.driver_id === null;

  const iHavePaid = isTraveler ? ride.traveler_paid : ride.driver_paid
  const theyHavePaid = isTraveler ? ride.driver_paid : ride.traveler_paid
  
  const isUnlocked = ride.status === 'in_progress' || ride.status === 'completed' || (!waitingForDriver && iHavePaid && theyHavePaid)

  const upiId = "mairide@upi"
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${upiId}&pn=MaiRide&am=100.00`
  
  // REPLACE THIS WITH YOUR ACTUAL API KEY
  const GOOGLE_MAPS_KEY = "AIzaSyDoYmgzIaJvCVlbjyc_Fersh1QNSqfniqY"

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-slate-900 text-white overflow-hidden">
      
      {/* LEFT SIDE: THE LIVE MAP AREA */}
      <div className="flex-1 relative bg-slate-800">
        
        {/* LIVE MAP EMBED */}
        <div className="absolute inset-0">
          <iframe 
            width="100%" 
            height="100%" 
            loading="lazy" 
            allowFullScreen 
            className={`transition-all duration-1000 ${isUnlocked ? 'grayscale-0' : 'grayscale'}`}
            src={`https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_KEY}&origin=${encodeURIComponent(ride.pickup_location)}&destination=${encodeURIComponent(ride.drop_location)}&mode=driving`}
          ></iframe>
        </div>

        {/* STATE 0: WAITING FOR DRIVER */}
        {waitingForDriver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-900/80 backdrop-blur-md p-6 text-center">
            <div className="bg-white text-black p-8 rounded-3xl max-w-md w-full shadow-2xl border-4 border-slate-100">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-3xl font-extrabold mb-2 text-slate-900">Finding a Driver</h2>
              <p className="text-slate-500 mb-6 font-medium">Broadcasting your route to verified drivers in the area. Please wait...</p>
              <a href="/" className="text-blue-600 font-bold hover:underline">← Go back to Dashboard</a>
            </div>
          </div>
        )}

        {/* STATE 1: LOCKED (PAYMENT PENDING) */}
        {!isUnlocked && !waitingForDriver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
            <div className="bg-white text-black p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-4 border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <Lock className="w-16 h-16 mx-auto mb-4 text-slate-800" />
              <h2 className="text-3xl font-extrabold mb-2 text-slate-900">Ride Locked</h2>
              <p className="text-slate-500 font-medium mb-6">Pay the ₹100 platform fee to unlock live details.</p>

              {iHavePaid ? (
                <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex flex-col items-center">
                  <div className="bg-green-500 text-white p-3 rounded-full mb-3"><ShieldCheck className="w-8 h-8"/></div>
                  <h3 className="font-bold text-green-800 text-lg">Your Payment Verified!</h3>
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <img src={qrUrl} alt="QR" className="w-32 h-32 object-contain mx-auto mb-4" />
                  <form action={async (formData) => { 'use server'; await submitPayment(ride.id, formData.get('txnId') as string) }}>
                    <input name="txnId" required placeholder="Enter UPI Txn ID" className="w-full border-2 border-slate-200 p-3 rounded-xl mb-3 text-center" />
                    <button className="w-full bg-black text-white p-4 rounded-xl font-bold">Verify Payment</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATE 2: UNLOCKED (ACTIVE) */}
        {isUnlocked && ride.status !== 'completed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-6">
             <div className="bg-blue-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold shadow-2xl mb-10 pointer-events-auto">
                <Unlock className="w-5 h-5 inline mr-2" /> Live Map Unlocked
             </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDE: CHAT & DETAILS */}
      <div className="w-full md:w-[400px] bg-white text-black flex flex-col border-l border-slate-200 shadow-2xl z-20">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-extrabold text-xl text-slate-900">Ride Details</h3>
          <p className="text-slate-500 text-sm mt-1">Status: {ride.status}</p>
        </div>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
           <p className="text-slate-400">Driver/Traveler Chat Interface</p>
        </div>
      </div>
    </div>
  )
}