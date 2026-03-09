import React from 'react';

export const metadata = {
  title: 'Mini ERP - K.M Digital',
  description: 'Hệ thống quản lý nội bộ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f0f2f5' }}suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}