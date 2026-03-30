import { createClient } from '@/utils/supabase/server'
import { submitPayment } from './actions'
import { Lock, Unlock, Map as MapIcon, MessageCircle, Phone, ShieldCheck, QrCode } from 'lucide-react'

export default async function ActiveRidePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const rideId = params.id;

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ride } = await supabase.from('rides').select('*').eq('id', rideId).single()
  
  if (!ride || !user) return <div className="p-10 text-center text-xl font-bold bg-white text-black h-screen flex items-center justify-center">Ride not found in database.</div>

  const isTraveler = ride.traveler_id === user.id
  
  // NEW: Check if we are waiting for a driver to accept the ride
  const waitingForDriver = ride.driver_id === null;

  const iHavePaid = isTraveler ? ride.traveler_paid : ride.driver_paid
  const theyHavePaid = isTraveler ? ride.driver_paid : ride.traveler_paid
  
  // Only unlock if a driver exists AND both paid (or if it's already completed)
  const isUnlocked = ride.status === 'in_progress' || ride.status === 'completed' || (!waitingForDriver && iHavePaid && theyHavePaid)

  const upiId = "mairide@upi"
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${upiId}&pn=MaiRide&am=100.00`

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-slate-900 text-white overflow-hidden">
      
      {/* LEFT SIDE: THE MAP AREA */}
      <div className="flex-1 relative bg-slate-800">
        <div className={`absolute inset-0 bg-[url('https://snazzy-maps-cdn.imgix.net/explore/style-151-light-monochrome.png?auto=compress')] bg-cover bg-center transition-all duration-1000 ${isUnlocked ? 'blur-none opacity-100' : 'blur-xl opacity-30 grayscale'}`} />

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

        {/* STATE 1: LOCKED (PAYMENT PENDING) - Only show if a driver HAS accepted! */}
        {!isUnlocked && !waitingForDriver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
            <div className="bg-white text-black p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-4 border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
              
              <Lock className="w-16 h-16 mx-auto mb-4 text-slate-800" />
              <h2 className="text-3xl font-extrabold mb-2 text-slate-900">Ride Locked</h2>
              <p className="text-slate-500 font-medium mb-6">Pay the ₹100 platform fee to unlock live GPS, driver details, and chat.</p>

              {iHavePaid ? (
                <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex flex-col items-center">
                  <div className="bg-green-500 text-white p-3 rounded-full mb-3"><ShieldCheck className="w-8 h-8"/></div>
                  <h3 className="font-bold text-green-800 text-lg">Your Payment Verified!</h3>
                  <p className="text-green-600 text-sm mt-1">Waiting for the other party to pay their ₹100 fee. The ride will unlock automatically.</p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-bold text-green-700 animate-pulse">
                    <div className="w-2 h-2 bg-green-500 rounded-full" /> Waiting...
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                  <div className="bg-white p-4 rounded-xl shadow-sm inline-block mb-4 border border-slate-100">
                    <img src={qrUrl} alt="UPI QR Code" className="w-40 h-40 object-contain mx-auto" />
                  </div>
                  <h3 className="font-extrabold text-xl mb-1 text-slate-800 flex items-center justify-center gap-2"><QrCode className="w-5 h-5"/> Scan to Pay ₹100</h3>
                  <p className="text-sm text-slate-500 mb-6">UPI ID: {upiId}</p>

                  <form action={async (formData) => {
                    'use server'
                    await submitPayment(ride.id, formData.get('txnId') as string)
                  }}>
                    <input name="txnId" required placeholder="Enter 12-digit UPI Txn ID" className="w-full border-2 border-slate-200 p-3 rounded-xl mb-3 text-center font-bold tracking-widest bg-white" />
                    <button className="w-full bg-black hover:bg-slate-800 text-white p-4 rounded-xl font-bold text-lg transition shadow-lg">
                      Verify Payment
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATE 2: UNLOCKED (IN PROGRESS) */}
        {isUnlocked && ride.status !== 'completed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none p-6">
             <div className="bg-blue-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold text-lg flex items-center gap-3 shadow-2xl pointer-events-auto shadow-blue-500/50 mb-10">
                <Unlock className="w-6 h-6" /> Live GPS Tracking Active
             </div>
             
             {/* DRIVER RIDE CONTROLS */}
             <div className="bg-white p-6 rounded-3xl shadow-2xl pointer-events-auto text-black text-center max-w-sm w-full border border-slate-200">
               <h3 className="font-extrabold text-xl mb-2 text-slate-900">End Trip</h3>
               <p className="text-slate-500 text-sm mb-6">Have you reached the destination?</p>
               
               <form action={async () => {
                 'use server'
                 const { completeRideAndRate } = await import('./actions')
                 await completeRideAndRate(ride.id, 5)
               }}>
                 <button className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl font-bold text-lg transition shadow-lg shadow-red-600/20">
                   Complete Ride & Claim Reward
                 </button>
               </form>
             </div>
          </div>
        )}

        {/* STATE 3: COMPLETED */}
        {ride.status === 'completed' && (
           <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-slate-900/90 backdrop-blur-xl p-6 text-center">
             <div className="bg-white text-black p-8 rounded-3xl max-w-md w-full shadow-2xl border-4 border-slate-100">
               <div className="text-6xl mb-4">🌟</div>
               <h2 className="text-3xl font-extrabold mb-2 text-slate-900">Ride Completed!</h2>
               <p className="text-slate-500 mb-6 font-medium">Thank you for using MaiRide. <strong className="text-black">25 Maicoins</strong> have been securely credited to your wallet!</p>
               <a href="/" className="bg-black text-white px-8 py-4 rounded-xl font-bold inline-block w-full hover:bg-slate-800 transition shadow-lg">
                 Return to Dashboard
               </a>
             </div>
           </div>
        )}
      </div>

      {/* RIGHT SIDE: CHAT & DETAILS */}
      <div className="w-full md:w-[400px] bg-white text-black flex flex-col border-l border-slate-200 shadow-2xl z-20">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-extrabold text-xl text-slate-900">Ride Details</h3>
          <p className="text-slate-500 text-sm mt-1">
            Status: {ride.status === 'completed' ? <span className="text-blue-600 font-bold">Completed</span> : waitingForDriver ? <span className="text-slate-500 font-bold animate-pulse">Searching for Driver...</span> : isUnlocked ? <span className="text-green-600 font-bold">In Progress</span> : <span className="text-orange-500 font-bold">Payment Pending</span>}
          </p>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 relative overflow-hidden">
          {isUnlocked ? (
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 text-left">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-2xl rounded-tl-none w-[80%] text-sm">Hello! I am on my way to the pickup location. 🚗</div>
                <div className="bg-black text-white p-3 rounded-2xl rounded-tr-none w-[80%] text-sm ml-auto">Perfect, I am waiting outside!</div>
              </div>
              <div className="flex gap-2">
                <input disabled={ride.status === 'completed'} placeholder={ride.status === 'completed' ? "Chat disabled" : "Type a message..."} className="flex-1 bg-slate-100 border-none p-4 rounded-full text-sm outline-none disabled:opacity-50" />
                <button disabled={ride.status === 'completed'} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:bg-slate-400"><MessageCircle className="w-5 h-5"/></button>
              </div>
            </div>
          ) : (
             <div className="text-slate-400 max-w-[250px]">
               <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-slate-300" />
               <h4 className="font-bold text-slate-600 text-lg mb-2">Chat is Disabled</h4>
               <p className="text-sm">{waitingForDriver ? "Chat will unlock once a driver is found and payments are verified." : "Complete the ₹100 payment to securely communicate."}</p>
             </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <button disabled={!isUnlocked || ride.status === 'completed'} className={`w-full p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${(isUnlocked && ride.status !== 'completed') ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
            <Phone className="w-5 h-5" /> Call {isTraveler ? 'Driver' : 'Traveler'}
          </button>
        </div>
      </div>
    </div>
  )
}