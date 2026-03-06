import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        onLogin(data.token, data.user);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1a1d24] rounded-2xl p-8 border border-slate-800 shadow-[0_0_25px_rgba(254,225,4,0.05)]">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#fee104] p-3 rounded-xl mb-4">
            <Lock size={24} className="text-black" />
          </div>
          <h1 className="text-white text-xl font-bold">60 Watts Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Crisis Monitoring Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#0f1115] text-white rounded-2xl px-4 py-2 border border-slate-700 focus:outline-none focus:border-[#fee104] text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#0f1115] text-white rounded-2xl px-4 py-2 border border-slate-700 focus:outline-none focus:border-[#fee104] text-sm"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#fee104] hover:bg-[#d6be00] text-black font-semibold rounded-xl py-2 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
