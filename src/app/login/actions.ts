'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // 1. Authenticate the user
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?message=Incorrect email or password')
  }

  // 2. Smart Routing: Check their role in the database
  if (data?.user) {
    const { data: profile } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', data.user.id)
      .single()

    // If they are staff, send straight to the Command Center
    if (profile?.user_type === 'admin' || profile?.user_type === 'super_admin') {
      redirect('/admin')
    }
  }

  // 3. Normal users go straight to the app dashboard
  redirect('/dashboard') 
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const user_type = formData.get('user_type') as string

  console.log("Attempting to sign up:", { email, name, phone, user_type }) 

  // 1. Create the user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error("SUPABASE AUTH ERROR:", error.message) 
    redirect(`/login?message=${error.message}`)
  }

  // 2. Save their extra details to our custom database table
  if (data.user) {
    const { error: dbError } = await supabase.from('users').insert({
      id: data.user.id,
      name,
      email,
      phone,
      user_type,
    })

    if (dbError) {
      console.error("DATABASE INSERT ERROR:", dbError.message) 
      redirect(`/login?message=Could not save user profile`)
    }
  }

  // 3. New signups (Travelers/Drivers) go straight to the app dashboard
  redirect('/dashboard') 
}