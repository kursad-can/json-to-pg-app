'use client';

import { useState } from 'react';

export default function Home() {
  const [connectionString, setConnectionString] = useState('');
  const [tableName, setTableName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !connectionString || !tableName) {
      setMessage('Please fill in all fields');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setMessage('Processing...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('connectionString', connectionString);
    formData.append('tableName', tableName);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
      setMessage(`Successfully imported ${data.count} rows into table "${tableName}"`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <main className="container">
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
          JSON to PostgreSQL Importer
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              PostgreSQL Connection String
            </label>
            <input
              type="text"
              className="input"
              placeholder="postgresql://user:password@localhost:5432/dbname"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              Format: postgresql://user:password@host:port/database
            </p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Target Table Name
            </label>
            <input
              type="text"
              className="input"
              placeholder="my_table"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              JSON File
            </label>
            <input
              type="file"
              accept=".json"
              className="input"
              style={{ padding: '0.4rem' }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn"
            disabled={status === 'loading'}
            style={{ marginTop: '1rem', height: '3rem', fontSize: '1rem' }}
          >
            {status === 'loading' ? 'Importing...' : 'Start Import'}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '0.5rem',
              backgroundColor: status === 'error' ? '#fee2e2' : status === 'success' ? '#dcfce7' : '#f3f4f6',
              color: status === 'error' ? '#991b1b' : status === 'success' ? '#166534' : '#1f2937',
              border: `1px solid ${status === 'error' ? '#fecaca' : status === 'success' ? '#bbf7d0' : '#e5e7eb'}`
            }}
          >
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
