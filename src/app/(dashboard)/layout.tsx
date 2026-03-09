// 'use client';

// import React, { useState, useEffect } from 'react';
// import {
//   AppstoreOutlined,
//   LaptopOutlined,
//   ShoppingCartOutlined,
//   DollarOutlined,
//   ToolOutlined,
//   LogoutOutlined,
//   HistoryOutlined,
//   LeftOutlined,
//   RightOutlined,
//   ProfileOutlined,
// } from '@ant-design/icons';
// import { useRouter, usePathname } from 'next/navigation';
// import Link from 'next/link';
// import { logoutAction } from '@/actions/auth.actions';
// import { createClient } from '@/lib/supabase/client';
// import './sidebar.css';

// const menuItems = [
//   { key: '/', icon: <AppstoreOutlined />, label: 'Tổng Quan' },
//   { key: '/inventory', icon: <LaptopOutlined />, label: 'Kho Hàng' },
//   { key: '/pos', icon: <ShoppingCartOutlined />, label: 'Bán Hàng' },
//   { key: '/orders', icon: <HistoryOutlined />, label: 'Đơn Hàng' },
//   { key: '/accounting', icon: <DollarOutlined />, label: 'Kế Toán' },
//   { key: '/logs', icon: <ProfileOutlined />, label: 'Nhật Ký' },
//   { key: '/warranty', icon: <ToolOutlined />, label: 'Bảo Hành' },
// ];

// export default function DashboardLayout({ children }: { children: React.ReactNode }) {
//   const [collapsed, setCollapsed] = useState(false);
//   const [userEmail, setUserEmail] = useState('');
//   const router = useRouter();
//   const pathname = usePathname();
//   const supabase = createClient();

//   useEffect(() => {
//     supabase.auth.getUser().then(({ data }) => {
//       if (data?.user?.email) setUserEmail(data.user.email);
//     });
//   }, []);

//   const handleLogout = async () => {
//     await logoutAction();
//   };

//   const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

//   return (
//     <div className="app-layout">
//       {/* SIDEBAR */}
//       <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
//         {/* Logo */}
//         <div className="sidebar-logo">
//           <div className="sidebar-logo-icon">KM</div>
//           <span className="sidebar-logo-text">Digital</span>
//         </div>

//         {/* Nav Items */}
//         <div className="sidebar-nav">
//           {menuItems.map(item => (
//             <Link
//               href={item.key}
//               key={item.key}
//               className={`nav-item ${pathname === item.key ? 'active' : ''}`}
//               title={collapsed ? item.label : undefined}
//             >
//               <span className="nav-item-icon">{item.icon}</span>
//               <span className="nav-item-label">{item.label}</span>
//             </Link>
//           ))}
//         </div>

//         {/* User Section */}
//         <div className="sidebar-user">
//           <div className="user-info">
//             <div className="user-avatar">{userInitial}</div>
//             <div>
//               <div className="user-name">{userEmail.split('@')[0] || 'User'}</div>
//               <div className="user-email">{userEmail}</div>
//             </div>
//           </div>
//           <button className="logout-btn" onClick={handleLogout}>
//             <LogoutOutlined />
//             <span className="nav-item-label">Đăng xuất</span>
//           </button>
//         </div>

//         {/* Collapse Toggle */}
//         <button className="collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
//           {collapsed ? <RightOutlined /> : <LeftOutlined />}
//         </button>
//       </nav>

//       {/* MAIN CONTENT */}
//       <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
//         {children}
//       </main>
//     </div>
//   );
// }


'use client';

import React, { useEffect, useState } from 'react';
import {
  AppstoreOutlined,
  LaptopOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ToolOutlined,
  LogoutOutlined,
  HistoryOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { logoutAction } from '@/actions/auth.actions';
import { createClient } from '@/lib/supabase/client';
import './sidebar.css';

const menuItems = [
  { key: '/', icon: <AppstoreOutlined />, label: 'Tổng Quan' },
  { key: '/inventory', icon: <LaptopOutlined />, label: 'Kho Hàng' },
  { key: '/pos', icon: <ShoppingCartOutlined />, label: 'Bán Hàng' },
  { key: '/orders', icon: <HistoryOutlined />, label: 'Đơn Hàng' },
  { key: '/accounting', icon: <DollarOutlined />, label: 'Kế Toán' },
  { key: '/logs', icon: <ProfileOutlined />, label: 'Nhật Ký' },
  { key: '/warranty', icon: <ToolOutlined />, label: 'Bảo Hành' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userEmail, setUserEmail] = useState('');
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, [supabase]);

  const handleLogout = async () => {
    await logoutAction();
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

  return (
    <div className="app-layout">
      <div className="sidebar-wrap">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">KM</div>
            <span className="sidebar-logo-text">Digital</span>
          </div>

          <div className="sidebar-nav">
            {menuItems.map((item) => (
              <Link
                href={item.key}
                key={item.key}
                className={`nav-item ${pathname === item.key ? 'active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="sidebar-user">
            <div className="user-info">
              <div className="user-avatar">{userInitial}</div>
              <div className="user-meta">
                <div className="user-name">{userEmail.split('@')[0] || 'User'}</div>
                <div className="user-email">{userEmail}</div>
              </div>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              <LogoutOutlined />
              <span className="nav-item-label">Đăng xuất</span>
            </button>
          </div>
        </nav>
      </div>

      <main className="main-content">{children}</main>
    </div>
  );
}
