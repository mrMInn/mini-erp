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
  MenuOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { logoutAction } from '@/actions/auth.actions';
import { createClient } from '@/lib/supabase/client';
import './sidebar.css';

const menuItems = [
  { key: '/', label: 'Tổng Quan' },
  { key: '/inventory', label: 'Kho Hàng' },
  { key: '/pos', label: 'Bán Hàng' },
  { key: '/orders', label: 'Đơn Hàng' },
  { key: '/accounting', label: 'Kế Toán' },
  { key: '/logs', label: 'Nhật Ký' },
  { key: '/warranty', label: 'Bảo Hành' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userEmail, setUserEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, [supabase]);

  // Close menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logoutAction();
  };

  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : '?';
  const userName = userEmail.split('@')[0] || 'User';

  return (
    <div className={`app-layout ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="mobile-logo">
          <div className="sidebar-logo-icon">KM</div>
          <span className="sidebar-logo-text">Digital</span>
        </div>
        <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
        </button>
      </header>

      {/* Sidebar Overlay */}
      <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} />

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
                <span className="nav-item-label">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Sidebar Footer User Section (Horizontal Reveal) */}
          <div className={`sidebar-user-footer-compact ${isUserMenuOpen ? 'active' : ''}`} onClick={toggleUserMenu}>
            <div className="user-controls-row">
              <div className="user-avatar-blue-trigger">
                {userInitial}
              </div>
              
              {isUserMenuOpen && (
                <button className="logout-circular-reveal-btn" onClick={(e) => { e.stopPropagation(); handleLogout(); }} title="Đăng xuất">
                  <LogoutOutlined />
                </button>
              )}
            </div>
            <div className="user-email-bottom">{userEmail}</div>
          </div>
        </nav>
      </div>

      <main className="main-content">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
