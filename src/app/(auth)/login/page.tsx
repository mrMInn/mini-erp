'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
// ĐÂY RỒI: Gọi đúng cái file client.ts lúc trưa anh em mình làm!
import { createClient } from '@/lib/supabase/client'; 
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Khởi tạo chìa khóa Supabase cho giao diện
  const supabase = createClient();

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      message.success('Đăng nhập thành công! Chào mừng sếp!');
      router.push('/inventory'); // Nhảy thẳng vào Kho Hàng
      router.refresh();
    } catch (error: any) {
      console.error("Lỗi Supabase:", error.message);
      message.error('Sai email hoặc mật khẩu. Nhập lại đi sếp!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0, color: '#1677ff' }}>K.M DIGITAL</Title>
          <Text type="secondary">Đăng nhập hệ thống ERP</Text>
        </div>

        <Form layout="vertical" onFinish={handleLogin} size="large">
          <Form.Item name="email" rules={[{ required: true, message: 'Vui lòng nhập Email!' }]}>
            <Input prefix={<UserOutlined />} placeholder="Email Sếp / Nhân viên" />
          </Form.Item>
          
          <Form.Item name="password" rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu két sắt" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading} style={{ marginTop: 8 }}>
            ĐĂNG NHẬP (MỞ KHO)
          </Button>
        </Form>
      </Card>
    </div>
  );
}