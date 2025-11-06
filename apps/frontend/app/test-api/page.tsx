'use client';

import { useState } from 'react';

export default function TestApiPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      setResult(`✅ SUCCESS: ${JSON.stringify(data)}`);
    } catch (error) {
      setResult(`❌ ERROR: ${error}`);
    }
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/v0/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Test123!',
        }),
      });
      const data = await response.json();
      setResult(`Response (${response.status}): ${JSON.stringify(data)}`);
    } catch (error) {
      setResult(`❌ ERROR: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>API Connection Test</h1>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={testHealth} disabled={loading}>
          Test /health
        </button>
        {' '}
        <button onClick={testLogin} disabled={loading}>
          Test /api/v0/auth/login
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {result && (
        <pre style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </pre>
      )}

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
        <p><strong>Environment:</strong></p>
        <pre>{`NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || 'not set'}`}</pre>
      </div>
    </div>
  );
}
