'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authApi, UserProfile } from '@/services/auth.api';

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await authApi.getProfile();
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    await authApi.logout();
    setUser(null);
    window.location.reload();
  }

  return (
    <main className="welcome-card">
      <span className="eyebrow">PROJECT NEXUS • E-COMMERCE & AUCTION</span>
      <h1>Nền tảng đã sẵn sàng</h1>
      <p style={{ marginBottom: '24px' }}>
        Frontend Next.js đã kết nối thành công với Backend API Gateway (Port 4000).
      </p>

      {loading ? (
        <p style={{ color: '#888' }}>Đang kiểm tra trạng thái đăng nhập...</p>
      ) : user ? (
        <div
          style={{
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              👤 {user.fullName || user.email}
            </span>
            <span
              style={{
                background: '#e0e7ff',
                color: '#3730a3',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
              }}
            >
              {user.role}
            </span>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 }}>
            <div>
              <b>Email:</b> {user.email}
            </div>
            <div>
              <b>Trạng thái:</b> {user.status}
            </div>
            <div>
              <b>Điểm uy tín:</b> {user.reputationScore} điểm
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              marginTop: '16px',
              padding: '10px 18px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#5268d8',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#f1f5f9',
              color: '#334155',
              textDecoration: 'none',
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            Đăng ký tài khoản
          </Link>
        </div>
      )}
    </main>
  );
}
