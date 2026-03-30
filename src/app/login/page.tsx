'use client'

import { useState } from 'react'
import { login, signup } from './actions'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-black">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'Welcome Back 🚗' : 'Create an Account 🚗'}
        </h2>

        <form className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <input name="name" placeholder="Full Name" required className="border p-3 rounded-md bg-gray-50" />
              <input name="phone" placeholder="Phone Number" required className="border p-3 rounded-md bg-gray-50" />
              <select name="user_type" required className="border p-3 rounded-md bg-gray-50">
                <option value="traveler">I am a Traveler</option>
                <option value="driver">I am a Driver</option>
              </select>
            </>
          )}

          <input name="email" type="email" placeholder="Email Address" required className="border p-3 rounded-md bg-gray-50" />
          <input name="password" type="password" placeholder="Password" required className="border p-3 rounded-md bg-gray-50" />

          <button formAction={isLogin ? login : signup} className="bg-black text-white p-3 rounded-md font-bold mt-2 hover:bg-gray-800 transition">
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-blue-600 font-bold hover:underline">
            {isLogin ? 'Sign up here' : 'Log in here'}
          </button>
        </p>
      </div>
    </div>
  )
}