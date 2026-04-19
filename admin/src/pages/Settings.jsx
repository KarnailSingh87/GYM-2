import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Settings() {
  const { token } = useContext(AuthContext);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [repairLoading, setRepairLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Config State
  const [activeMethod, setActiveMethod] = useState('qr');
  const [pairingPhone, setPairingPhone] = useState('');
  const [businessApi, setBusinessApi] = useState({ accessToken: '', phoneNumberId: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const apiUrl = (import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_LOCAL_API_URL ||
    `http://localhost:5005/api`).replace(/\/$/, "");

  async function fetchStatus() {
    try {
      const res = await fetch(`${apiUrl}/whatsapp/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
        return;
      }
      const data = await res.json();
      setStatus(data);
      if (data.config && !hasInitialized) {
        setActiveMethod(data.config.connectionMethod);
        setPairingPhone(data.config.pairingPhone || '');
        setBusinessApi(data.config.businessApi || { accessToken: '', phoneNumberId: '' });
        setHasInitialized(true);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp status', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch(`${apiUrl}/whatsapp/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  }

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    const interval = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  async function handleSaveConfig(method) {
    setSaveLoading(true);
    try {
      const res = await fetch(`${apiUrl}/whatsapp/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionMethod: method,
          pairingPhone: pairingPhone,
          businessApi: businessApi
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchStatus();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save configuration.');
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleGetPairingCode() {
    if (!pairingPhone) return alert('Please enter phone number first.');
    setSaveLoading(true);
    try {
      // Step 1: Tell backend we chose pairing method
      await fetch(`${apiUrl}/whatsapp/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionMethod: 'pairing',
          pairingPhone: pairingPhone,
          businessApi: businessApi
        })
      });

      // Step 2: Request the code manually
      const res = await fetch(`${apiUrl}/whatsapp/request-pairing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: pairingPhone })
      });
      const data = await res.json();

      if (data.success) {
        fetchStatus();
      } else {
        alert('Could not generate code: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error requesting pairing code.');
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleVerifyBusiness() {
    setSaveLoading(true);
    try {
      const res = await fetch(`${apiUrl}/whatsapp/verify-business`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(businessApi)
      });
      const data = await res.json();
      if (data.success) {
        alert('Success: ' + data.message);
        fetchStatus();
      } else {
        alert('Verification Failed: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying API credentials.');
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      setRepairLoading(true);
      const res = await fetch(`${apiUrl}/whatsapp/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
        return;
      }
      await new Promise(r => setTimeout(r, 2000));
      fetchStatus();
      alert('Connection repair initiated!');
    } catch (err) {
      console.error('Failed to refresh', err);
      alert('Failed to trigger repair.');
    } finally {
      setRepairLoading(false);
    }
  }

  async function handleTestMessage() {
    if (!testPhone) return alert('Please enter a phone number to test.');
    setTestLoading(true);
    try {
      const res = await fetch(`${apiUrl}/whatsapp/test-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: testPhone })
      });
      const data = await res.json();
      if (data.success) alert('Test message sent! Check your phone.');
      else alert('Failed: ' + data.message);
    } catch (err) {
      console.error(err);
      alert('Error sending test message.');
    } finally {
      setTestLoading(false);
    }
  }

  async function handleLogout() {
    if (!window.confirm('This will clear all WhatsApp session data. Continue?')) return;
    setLogoutLoading(true);
    try {
      const resp = await fetch(`${apiUrl}/whatsapp/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchStatus();
      alert('Session cleared.');
    } catch (err) {
      console.error(err);
      alert('Failed to logout.');
    } finally {
      setLogoutLoading(false);
    }
  }

  const isConnected = status?.connected || (status?.config?.connectionMethod === 'business_api' && status?.config?.businessApi?.verified);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">System Settings</h1>
        <p className="text-sm md:text-base text-gray-400 mt-1">Manage your WhatsApp integration and gym configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* WhatsApp Management Card */}
        <div className="glass-card p-5 md:p-8 rounded-2xl md:rounded-3xl relative overflow-hidden group">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center">
            <span className="w-6 h-6 md:w-8 md:h-8 bg-emerald-500/20 rounded-md md:rounded-lg flex items-center justify-center mr-2 md:mr-3 text-emerald-400 text-xs md:text-sm">✓</span>
            WhatsApp Integration
          </h2>

          <div className="space-y-4 md:space-y-6">
            {/* Connection Status Header */}
            <div className="flex items-center justify-between p-3 md:p-4 bg-white/5 rounded-xl md:rounded-2xl border border-white/10">
              <div>
                <div className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Connection Method</div>
                <div className="text-white font-bold text-sm md:text-base capitalize">
                  {activeMethod.replace('_', ' ')}
                </div>
              </div>
              <div className={`flex items-center space-x-1.5 md:space-x-2 px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-bold ${isConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/20 text-amber-400 border border-amber-500/20'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                <span>{isConnected ? 'ACTIVE' : 'DISCONNECTED'}</span>
              </div>
            </div>

            {/* Method Tabs */}
            <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
              {['qr', 'pairing', 'business_api'].map((method) => (
                <button
                  key={method}
                  onClick={() => setActiveMethod(method)}
                  className={`flex-1 py-2 text-[10px] md:text-xs font-bold rounded-lg transition-all ${activeMethod === method ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {method === 'business_api' ? 'API KEY' : method.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Method-specific content */}
            <div className="min-h-[280px] animate-in slide-in-from-bottom-2 duration-300">
              {activeMethod === 'qr' && (
                <div className="space-y-4">
                  {!isConnected && status?.qr ? (
                    <div className="flex flex-col items-center justify-center p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl shadow-2xl space-y-3">
                      <div className="text-gray-900 font-black text-lg md:text-xl tracking-tight text-center">SCAN QR CODE</div>
                      <div className="p-2 md:p-3 bg-gray-50 border-2 border-gray-100 rounded-xl w-full max-w-[200px] flex justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(status.qr)}&size=300x300`}
                          alt="WhatsApp QR Code"
                        />
                      </div>
                      <p className="text-gray-400 text-[10px] uppercase text-center font-bold">Linked Devices &gt; Link a Device</p>
                    </div>
                  ) : isConnected ? (
                    <ConnectedProfile activeMethod={activeMethod} status={status} />
                  ) : (
                    <div className="py-20 text-center text-gray-500 italic">Initializing QR Engine...</div>
                  )}
                  {status?.config?.connectionMethod !== 'qr' && (
                    <button onClick={() => handleSaveConfig('qr')} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs">Activate QR Method</button>
                  )}
                </div>
              )}

              {activeMethod === 'pairing' && (
                <div className="space-y-4">
                  {!isConnected && status?.status === 'PAIRING_CODE_READY' && status?.pairingCode ? (
                    <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-cyan-500 rounded-2xl md:rounded-3xl shadow-2xl text-white space-y-4">
                      <div className="font-bold uppercase tracking-widest text-[10px] opacity-80">Your Pairing Code</div>
                      <div className="text-4xl md:text-5xl font-black tracking-[0.2em] font-mono pulse">{status.pairingCode}</div>
                      <div className="bg-black/20 p-4 rounded-xl text-center">
                        <p className="text-xs font-medium">1. Open WhatsApp &gt; Linked Devices</p>
                        <p className="text-xs font-medium mt-1">2. "Link with phone number instead"</p>
                        <p className="text-xs font-medium mt-1">3. Enter this code on your phone</p>
                      </div>
                    </div>
                  ) : isConnected ? (
                    <ConnectedProfile activeMethod={activeMethod} status={status} />
                  ) : (
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pairing Phone Number (with Country Code)</label>
                      <input
                        placeholder="e.g. 919876543210"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value.replace(/\D/g, ''))}
                      />
                      <button
                        onClick={handleGetPairingCode}
                        disabled={saveLoading}
                        className="w-full py-3 bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                      >
                        {saveLoading ? 'Generating...' : (status?.status === 'PAIRING_CODE_READY' ? 'Regenerate New Code' : 'Get Pairing Code')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeMethod === 'business_api' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-200">
                    <span className="font-bold">NOTE:</span> Official API is ultra-stable but requires approval via Facebook Business Manager.
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Permanent Access Token</label>
                      <input
                        type="password"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 text-xs"
                        value={businessApi.accessToken}
                        onChange={(e) => setBusinessApi({ ...businessApi, accessToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number ID</label>
                      <input
                        placeholder="e.g. 10982347589..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 text-xs"
                        value={businessApi.phoneNumberId}
                        onChange={(e) => setBusinessApi({ ...businessApi, phoneNumberId: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleSaveConfig('business_api')}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs"
                      >
                        Save Settings
                      </button>
                      <button
                        onClick={handleVerifyBusiness}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20"
                      >
                        Verify & Link
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Common Utils (Logs, Test) */}
            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="flex gap-2">
                <button onClick={handleLogout} className="flex-1 py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold text-[10px]">Disconnect Engine</button>
                <button onClick={handleRefresh} className="flex-1 py-3 px-4 bg-cyan-500 text-white rounded-xl font-bold text-[10px]">Repair Connection</button>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Test Connection</div>
                <div className="flex gap-2">
                  <input
                    placeholder="10-digit phone"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                  />
                  <button
                    onClick={handleTestMessage}
                    disabled={!isConnected || testLoading}
                    className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold"
                  >
                    {testLoading ? '...' : 'Send'}
                  </button>
                </div>
              </div>

              {logs.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-2">Live Logs</div>
                  <div className="bg-black/40 rounded-xl border border-white/5 p-3 max-h-[100px] overflow-y-auto space-y-2 scrollbar-hide">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[9px] font-mono">
                        <span className={log.event.includes('ERROR') ? 'text-red-400' : 'text-cyan-400'}>[{log.event}] {log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Branding placeholder */}
        <div className="glass-card p-8 rounded-3xl h-fit">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">⚙ Gym Branding</h2>
          <div className="space-y-4 opacity-50 grayscale">
            <label className="text-xs text-gray-500 uppercase tracking-widest">Gym Name</label>
            <input disabled value="RFC Gym" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3" />
            <p className="text-xs text-amber-500 font-medium italic">Settings Locked • Premium Subscription Required</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectedProfile({ activeMethod, status }) {
  const name = activeMethod === 'business_api' ? 'Official API Gateway' : status?.user?.name || 'Linked Device';
  const phone = activeMethod === 'business_api' ? 'Verified Account' : `+${status?.user?.id.split(':')[0]}`;

  return (
    <div className="p-4 md:p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-4 shadow-inner animate-in zoom-in-95">
      <div className="flex items-center space-x-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-2xl shadow-lg border-2 border-white/10">🏋️</div>
        <div>
          <div className="text-white font-black text-lg">{name}</div>
          <div className="text-emerald-400 font-mono text-xs">{phone}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[10px]">
          <span className="text-gray-500 uppercase block font-bold mb-0.5">Uptime</span>
          <span className="text-white font-medium">99.9% Stable</span>
        </div>
        <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-[10px]">
          <span className="text-gray-500 uppercase block font-bold mb-0.5">Sync</span>
          <span className="text-white font-medium">Auto-Synced</span>
        </div>
      </div>
    </div>
  );
}
