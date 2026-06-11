import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { Mail, Key, Eye, EyeOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface AdminLoginPageProps {
  navigate: (to: string) => void;
}

export default function AdminLoginPage({ navigate }: AdminLoginPageProps) {
  const { login } = useGameStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      setLoading(false);

      if (data.error) {
        setError(data.error);
      } else if (data.user.role !== 'admin') {
        setError('Access denied: You must be an administrator.');
      } else {
        login(data.token, data.user);
      }
    } catch (err) {
      setLoading(false);
      setError('Connection failed. Is the server running?');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf7] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Grain/Grid */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#1a1a18 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      ></div>
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#fbe3b5] rounded-full filter blur-3xl opacity-40 z-0"></div>
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#b8deca] rounded-full filter blur-3xl opacity-40 z-0"></div>

      <div className="bg-white border border-[#e8e8e3] rounded-[24px] max-w-md w-full p-8 shadow-2xl relative z-10 space-y-6">
        <div className="flex items-center space-x-3 justify-center mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#1a1a18] flex items-center justify-center text-lg text-white shadow-sm">🛡️</div>
          <div className="text-left">
            <h1 className="font-serif text-lg font-bold text-[#1a1a18] leading-tight">Muffin Lab Admin</h1>
            <p className="font-mono text-[9px] tracking-wider text-[#7a7a72] uppercase leading-none mt-0.5">Global System Console</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#3d3d38] uppercase mb-1.5 tracking-wider">Admin Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#b0b0a8]" />
              <input 
                type="email"
                required
                placeholder="aryajain1906@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#f9f9f7] border border-[#d8d8d0] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#1a1a18] placeholder-[#b0b0a8] focus:outline-none focus:border-[#1a1a18] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#3d3d38] uppercase mb-1.5 tracking-wider">Console Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 w-4 h-4 text-[#b0b0a8]" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f9f9f7] border border-[#d8d8d0] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#1a1a18] placeholder-[#b0b0a8] focus:outline-none focus:border-[#1a1a18] transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 bg-transparent border-none cursor-pointer p-0.5 text-[#b0b0a8] hover:text-[#3d3d38]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[11px] text-[#c0392b] font-semibold text-center mt-1">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#1a1a18] hover:bg-[#3d3d38] text-white font-sans font-bold text-xs py-3.5 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Access Admin Console'}
          </button>
        </form>

        <div className="flex flex-col gap-3 pt-4 border-t border-[#e8e8e3]">

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full text-center text-[10px] text-[#7a7a72] hover:text-[#1a1a18] transition-colors"
          >
            ← Back to Lobby Frontpage
          </button>
        </div>
      </div>
    </div>
  );
}
