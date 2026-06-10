'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId.trim() }),
    });
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const { error } = await res.json();
      setError(error ?? '오류가 발생했습니다.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1f3864] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1f3864]">QA Manager</h1>
          <p className="text-gray-400 text-sm mt-1">사용할 ID를 입력하세요</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="ID (예: alice, 홍길동)"
            autoFocus
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1f3864]"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={!userId.trim() || loading}
            className="w-full py-3 bg-[#1f3864] text-white rounded-lg font-medium hover:bg-[#2a4f8a] disabled:opacity-40 transition-colors"
          >
            {loading ? '접속 중...' : '접속'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-300 mt-6">
          비밀번호 없이 ID만으로 접속합니다
        </p>
      </div>
    </div>
  );
}
