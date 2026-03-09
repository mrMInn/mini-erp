'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(email: string, pass: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  })

  if (error) {
    return { success: false, message: 'Sai email hoặc mật khẩu. Đề nghị nhập lại!' }
  }

  // Đăng nhập thành công thì Server tự động đá về trang chủ
  return { success: true }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}