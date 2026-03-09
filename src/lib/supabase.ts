import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Lấy chìa khóa Vạn Năng (Chỉ dùng cho Máy chủ Backend)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Ê sếp, quên cấu hình URL hoặc Key trong file .env.local rồi kìa!');
}

// Khởi tạo công cụ kết nối với Quyền Lực Tuyệt Đối (Qua mặt RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);