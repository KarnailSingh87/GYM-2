import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Settings() {
  const { token } = useContext(AuthContext);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const apiUrl = import.meta.env.DEV ? 'http://localhost:5005/api' : import.meta.env.VITE_API_URL;
  async function fetchStatus() {
    try {
      const res = await fetch(`${apiUrl}/whatsapp/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch WhatsApp status', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [token]);

  async function handleRefresh() {
    try {
      setLoading(true);
      await fetch(`${apiUrl}/whatsapp/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStatus();
    } catch (err) {
      console.error('Failed to refresh', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if(!window.confirm('This will clear all WhatsApp session data. You will need to re-scan the QR code. Continue?')) return;
    setLogoutLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/whatsapp/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Logout request failed');
      
      fetchStatus();
      alert('Session cleared. Please wait a few seconds for a new QR code to appear.');
    } catch (err) {
      console.error(err);
      alert('Failed to logout: ' + err.message);
    } finally {
      setLogoutLoading(false);
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">System Settings</h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">Manage your WhatsApp integration and gym configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* WhatsApp Management Card */}
        <div className="glass-card p-5 md:p-8 rounded-2xl md:rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity hidden sm:block">
             <div className="text-6xl text-white">📱</div>
          </div>
          
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center">
            <span className="w-6 h-6 md:w-8 md:h-8 bg-emerald-500/20 rounded-md md:rounded-lg flex items-center justify-center mr-2 md:mr-3 text-emerald-400 text-xs md:text-sm">✓</span>
            WhatsApp Integration
          </h2>

          {loading && !status ? (
            <div className="flex flex-col items-center justify-center py-6 md:py-10 space-y-4">
              <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 text-xs md:text-sm">Checking connection...</p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/10">
                <div>
                  <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Connection Status</div>
                  <div className={`text-base md:text-lg font-bold mt-0.5 md:mt-1 ${status?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {status?.connected ? '✅ Active 24/7' : (status?.status === 'QR_READY' ? '⏳ Waiting for Scan' : '⚙️ Initializing Engine...')}
                  </div>
                </div>
                <div className={`flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold ${status?.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span>{status?.connected ? 'STABLE' : 'PENDING'}</span>
                </div>
              </div>

              {!status?.connected && status?.qr && (
                <div className="flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl shadow-2xl shadow-black/50 space-y-3 md:space-y-4">
                  <div className="text-gray-900 font-black text-lg md:text-xl tracking-tight text-center">LINK GYM WHATSAPP</div>
                  <div className="p-2 md:p-3 bg-gray-50 border-2 border-gray-100 rounded-xl md:rounded-2xl w-full max-w-[280px] flex justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(status.qr)}&size=300x300`} 
                      alt="WhatsApp QR Code" 
                      className="w-full h-auto aspect-square"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-gray-500 text-xs md:text-sm font-medium">Scan with {status.targetNumber || 'the Owner Number'}</p>
                    <p className="text-gray-400 text-[9px] md:text-[10px] uppercase tracking-tighter">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>
                  </div>
                </div>
              )}

              {status?.connected && status?.user && (
                <div className="p-4 md:p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl md:rounded-2xl space-y-3 md:space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 md:space-x-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xl md:text-2xl shadow-lg shadow-emerald-500/20 border-2 border-white/10 shrink-0">
                        🏋️
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-black text-lg md:text-xl truncate">{status.user.name || 'RFC GYM OWNER'}</div>
                        <div className="text-emerald-400 font-mono text-xs md:text-sm">+{status.user.id.split(':')[0]}</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 pt-2">
                    <div className="p-2.5 md:p-3 bg-white/5 rounded-lg md:rounded-xl border border-white/5">
                      <div className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold">Session Type</div>
                      <div className="text-xs text-white font-medium">Permanent Multi-Device</div>
                    </div>
                    <div className="p-2.5 md:p-3 bg-white/5 rounded-lg md:rounded-xl border border-white/5">
                      <div className="text-[9px] md:text-[10px] text-gray-500 uppercase font-bold">Uptime</div>
                      <div className="text-xs text-white font-medium">24x7 Monitored</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 md:pt-4 flex flex-col sm:flex-row gap-2 sm:space-x-3 sm:gap-0">
                <button 
                  onClick={handleLogout}
                  disabled={logoutLoading}
                  className="w-full sm:flex-1 py-2.5 md:py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {logoutLoading ? 'Working...' : 'Logout WhatsApp'}
                </button>
                <button 
                  onClick={handleRefresh}
                  className="py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm transition-all"
                  title="Force Generate New QR"
                >
                  🔄
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Other configurations placeholder */}
        <div className="space-y-8">
          <div className="glass-card p-8 rounded-3xl">
             <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-3 text-cyan-400 text-sm">⚙</span>
              Gym Branding
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest ml-1">Gym Display Name</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none text-white focus:border-cyan-500/50 transition-all font-medium" 
                  defaultValue="RFC Gym" 
                  disabled
                />
              </div>
              <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl italic text-xs text-gray-400">
                Branding settings are currently hard-coded. More customization options coming soon in future updates.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
