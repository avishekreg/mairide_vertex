'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Car, Lock, Mail, User, Phone, ChevronRight } from 'lucide-react'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-[#023047] flex items-center justify-center p-4">
      {/* Background Gradient Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#fb8500] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#219ebc] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white p-10 rounded-[2rem] shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#023047] p-4 rounded-3xl shadow-lg">
            <Car className="w-10 h-10 text-[#ffb703]" />
          </div>
        </div>
        
        <h2 className="text-4xl font-extrabold text-[#023047] text-center mb-2">
          {isLogin ? 'Welcome Back!' : 'Join MaiRide'}
        </h2>
        <p className="text-slate-500 text-center mb-8 font-medium">
          {isLogin ? 'Sign in to access your dashboard' : 'Create your account to start driving or riding'}
        </p>

        <form className="space-y-5">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-4 top-4 text-[#219ebc] w-5 h-5" />
                <input name="name" placeholder="Full Name" required className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#219ebc]" />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-4 text-[#219ebc] w-5 h-5" />
                <input name="phone" placeholder="Phone Number" required className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#219ebc]" />
              </div>
              <select name="user_type" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 outline-none">
                <option value="traveler">I am a Traveler</option>
                <option value="driver">I am a Driver</option>
              </select>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-4 text-[#219ebc] w-5 h-5" />
            <input name="email" type="email" placeholder="Email Address" required className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#219ebc]" />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-[#219ebc] w-5 h-5" />
            <input name="password" type="password" placeholder="Password (6+ chars)" required className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#219ebc]" />
          </div>

          <button formAction={isLogin ? login : signup} className="w-full bg-[#fb8500] hover:bg-[#ffb703] text-white p-5 rounded-2xl font-bold text-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2">
            {isLogin ? 'Log In' : 'Create Account'} <ChevronRight className="w-5 h-5" />
          </button>
        </form>

        <p className="text-center mt-8 text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-[#fb8500] font-bold hover:underline">
            {isLogin ? 'Sign up here' : 'Log in here'}
          </button>
        </p>
      </div>
    </div>
  )
}