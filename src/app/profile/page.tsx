'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';

type Profile = { email: string; email_verified: number; notify_assigned: number; notify_status_change: number };

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null | 'loading'>('loading');
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notifyAssigned, setNotifyAssigned] = useState(true);
  const [notifyStatus, setNotifyStatus] = useState(true);
  const [savingNotify, setSavingNotify] = useState(false);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(p => {
      setProfile(p);
      if (p) {
        setNotifyAssigned(!!p.notify_assigned);
        setNotifyStatus(!!p.notify_status_change);
      }
    });
  }, []);

  async function sendCode() {
    setError(''); setSending(true);
    const res = await fetch('/api/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error); return; }
    setCodeSent(true);
  }

  async function verify() {
    setError(''); setVerifying(true);
    const res = await fetch('/api/profile/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setVerifying(false);
    if (!res.ok) { setError(data.error); return; }
    const p = await fetch('/api/profile').then(r => r.json());
    setProfile(p); setCodeSent(false); setCode(''); setEmail('');
  }

  async function saveNotify() {
    setSavingNotify(true);
    await fetch('/api/profile/notify', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify_assigned: notifyAssigned, notify_status_change: notifyStatus }),
    });
    setSavingNotify(false);
  }

  if (profile === 'loading') return <div className="flex items-center justify-center h-screen text-gray-400">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <Mail size={22} className="text-[#1f3864]" />
          <h1 className="text-lg font-bold text-gray-800">이메일 프로필</h1>
        </div>

        {/* 이메일 등록/변경 */}
        {profile?.email_verified ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle size={18} className="text-green-500 shrink-0" />
            <div>
              <div className="text-sm font-medium text-green-700">인증된 이메일</div>
              <div className="text-sm text-green-600">{profile.email}</div>
            </div>
            <button onClick={() => { setProfile(null); setCodeSent(false); }}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RefreshCw size={12} /> 변경
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-4">
              이슈 알림을 받을 이메일을 등록하세요.<br />
              <span className="text-gray-400 text-xs">등록하지 않으면 알림을 받을 수 없습니다.</span>
            </p>
            {!codeSent ? (
              <div className="flex gap-2">
                <input value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendCode()}
                  type="email" placeholder="example@email.com"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={sendCode} disabled={sending || !email}
                  className="px-4 py-2 bg-[#1f3864] text-white rounded-lg text-sm hover:bg-[#2a4f8a] disabled:opacity-40 flex items-center gap-1.5">
                  {sending ? '발송 중...' : <><ArrowRight size={14} /> 인증코드 발송</>}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-blue-600"><strong>{email}</strong>로 인증코드를 발송했습니다.</p>
                <div className="flex gap-2">
                  <input value={code} onChange={e => setCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && verify()}
                    placeholder="6자리 코드 입력" maxLength={6}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={verify} disabled={verifying || code.length < 6}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-40">
                    {verifying ? '확인 중...' : '인증'}
                  </button>
                </div>
                <button onClick={() => { setCodeSent(false); setCode(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600">← 이메일 다시 입력</button>
              </div>
            )}
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* 알림 설정 */}
        {profile?.email_verified ? (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">알림 설정</h2>
            <div className="space-y-3">
              {[
                ['담당자로 배정될 때', notifyAssigned, setNotifyAssigned] as const,
                ['담당한 이슈 상태 변경될 때', notifyStatus, setNotifyStatus] as const,
              ].map(([label, val, set]) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                    className="w-4 h-4 accent-[#1f3864] cursor-pointer" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <button onClick={saveNotify} disabled={savingNotify}
              className="mt-4 w-full py-2 bg-[#1f3864] text-white rounded-lg text-sm hover:bg-[#2a4f8a] disabled:opacity-40">
              {savingNotify ? '저장 중...' : '저장'}
            </button>
          </div>
        ) : null}

        {/* 메인으로 */}
        <button onClick={() => router.push('/')}
          className="mt-6 w-full py-2 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          {profile?.email_verified ? '메인으로 돌아가기' : '나중에 등록하기'}
        </button>
      </div>
    </div>
  );
}
