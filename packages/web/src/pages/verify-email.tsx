import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import api from '@/services/api';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query as { token?: string };

  const [status, setStatus] = useState<'idle'|'verifying'|'success'|'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!router.isReady) return;

    if (!token || typeof token !== 'string') {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        setStatus('verifying');
        const res = await api.post<{ verified: boolean }>("/auth/verify-email", { token });
        if (res.success) {
          setStatus('success');
          setMessage('Email verified. You can now sign in.');
        } else {
          setStatus('error');
          setMessage(res.message || 'Verification failed.');
        }
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Verification failed.');
      }
    };

    verify();
  }, [router.isReady, token]);

  const goToLogin = () => router.push('/auth/login');

  return (
    <>
      <Head>
        <title>Verify Email • Finora</title>
      </Head>
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: 420,
          width: '100%',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
        }}>
          <h1 style={{ fontSize: 20, margin: 0, marginBottom: 8 }}>Email Verification</h1>
          <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 16 }}>
            {status === 'idle' || status === 'verifying' ? 'Verifying your email…' : message}
          </p>

          {status === 'verifying' && (
            <div style={{ fontSize: 14, color: '#6b7280' }}>Please wait…</div>
          )}

          {status === 'success' && (
            <button onClick={goToLogin} style={{
              marginTop: 8,
              width: '100%',
              height: 40,
              borderRadius: 8,
              background: '#111827',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}>
              Go to sign in
            </button>
          )}

          {status === 'error' && (
            <div style={{ color: '#b91c1c', fontSize: 14, marginTop: 8 }}>{message}</div>
          )}
        </div>
      </div>
    </>
  );
}

