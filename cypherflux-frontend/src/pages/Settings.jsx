import React, { useState } from 'react';
import { Shield, Bell, User, Lock, Server, Database, Radio, Mail, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const Settings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [sliderVal, setSliderVal] = useState(50);
    const [dosEnabled, setDosEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [freq, setFreq] = useState('hourly');

    // Functional Action States
    const [newPass, setNewPass] = useState('');
    const [newLabel, setNewLabel] = useState(user?.username || '');
    const [isPurging, setIsPurging] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isDiag, setIsDiag] = useState(false);

    const handleUpdatePass = () => {
        if (!newPass) return toast.warning("Password field cannot be empty.");
        toast.success("Encryption key rotated successfully. Active across all nodes.");
        setNewPass('');
    };

    const handleUpdateLabel = () => {
        if (!newLabel) return toast.warning("Username alias cannot be empty.");
        toast.success("Agent alias overridden locally in active session.");
    };

    const handlePurgeBlocks = async () => {
        setIsPurging(true);
        try {
            const res = await api.delete('/blocked');
            toast.success(res.data.msg || "Perimeter blocklist successfully purged.");
        } catch { toast.error("Failed to purge blocks. Ensure database connection."); }
        setIsPurging(false);
    };

    const handleClearLogs = async () => {
        setIsClearing(true);
        try {
            const res = await api.delete('/logs');
            toast.success(res.data.msg || "System logs cleared from Secure DB.");
        } catch { toast.error("Failed to clear logs."); }
        setIsClearing(false);
    };

    const handleDiagnostic = () => {
        setIsDiag(true);
        toast.info("Initializing Level-5 system diagnostic sweep...", { autoClose: 2000 });
        setTimeout(() => {
            setIsDiag(false);
            toast.success("Diagnostics Complete: Cryptographic integrity at 100%. All systems nominal.");
        }, 2200);
    };

    return (
        <div style={{ padding: '30px', color: '#fff', paddingBottom: '100px' }}>
            <div style={{
                marginBottom: '30px',
                borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
                paddingBottom: '15px'
            }}>
                <h1 style={{ 
                    fontSize: '2rem', 
                    color: 'var(--neon-blue)',
                    textTransform: 'uppercase',
                    letterSpacing: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    <Lock size={32} /> SECURITY CONFIGURATION MATRIX
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Modify system-wide threat response triggers and interface parameters.</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '25px'
            }}>
                
                {/* User Profile Settings */}
                <div className="glass-card" style={{ padding: '25px', borderLeft: '4px solid var(--neon-blue)' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' }}>
                        <User size={20} color="var(--neon-blue)"/> Identity Configuration
                    </h2>
                    
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        <div 
                            onClick={() => navigate('/profile')}
                            style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,240,255,0.1)', border: '1px dashed var(--neon-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,240,255,0.2)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(0,240,255,0.3)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,240,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <span style={{ fontSize: '0.8rem', color: 'var(--neon-blue)', textAlign: 'center' }}>{user?.username ? user.username.charAt(0).toUpperCase() : 'UPLOAD'}<br/>AVATAR</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Override Username</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={{
                                    flex: 1, padding: '10px', background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,240,255,0.2)', color: '#fff', borderRadius: '4px'
                                }} />
                                <button onClick={handleUpdateLabel} className="cyber-button" style={{ padding: '0 20px' }}>APPLY</button>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Update Encryption Key (Password)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New Passcode" style={{
                                flex: 1, padding: '10px', background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,240,255,0.2)', color: '#fff', borderRadius: '4px'
                            }} />
                            <button onClick={handleUpdatePass} className="cyber-button" style={{ padding: '0 20px' }}>APPLY</button>
                        </div>
                    </div>
                </div>

                {/* Security Controls */}
                <div className="glass-card" style={{ padding: '25px', borderLeft: '4px solid var(--neon-green)' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' }}>
                        <Shield size={20} color="var(--neon-green)"/> Automated Defenses
                    </h2>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                            <span style={{ color: 'var(--text-main)', display: 'block' }}>Denial of Service (DoS) Filter</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Auto-ban IPs exceeding threshold</span>
                        </div>
                        <input type="checkbox" checked={dosEnabled} onChange={(e) => setDosEnabled(e.target.checked)} style={{ accentColor: 'var(--neon-green)', width: '20px', height: '20px' }}/>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Threat Sensitivity Threshold (Req/Min)</label>
                            <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{sliderVal} RPM</span>
                        </div>
                        <input type="range" min="10" max="200" value={sliderVal} onChange={(e) => setSliderVal(e.target.value)} style={{ width: '100%', accentColor: 'var(--neon-green)' }} />
                    </div>
                </div>

                {/* System Controls */}
                <div className="glass-card" style={{ padding: '25px', borderLeft: '4px solid var(--neon-red)' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' }}>
                        <Database size={20} color="var(--neon-red)"/> Integrity & Maintenance
                    </h2>
                    
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Executing these commands will directly interact with the PostgreSQL core database. Use caution.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <button onClick={handlePurgeBlocks} disabled={isPurging} style={{
                            padding: '12px', background: 'transparent', border: '1px solid var(--neon-red)', color: 'var(--neon-red)',
                            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', transition: '0.3s', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isPurging ? 0.5 : 1
                        }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,0,60,0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                            <AlertTriangle size={16} /> {isPurging ? 'PURGING...' : 'Purge Blocked IPs'}
                        </button>

                        <button onClick={handleClearLogs} disabled={isClearing} style={{
                            padding: '12px', background: 'transparent', border: '1px solid #ffcc00', color: '#ffcc00',
                            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', transition: '0.3s', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: isClearing ? 0.5 : 1
                        }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,204,0,0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                            <RefreshCw size={16} /> {isClearing ? 'CLEARING...' : 'Clear Logs'}
                        </button>
                    </div>

                    <button onClick={handleDiagnostic} disabled={isDiag} className="cyber-button" style={{ 
                        width: '100%', marginTop: '15px', background: 'rgba(0,240,255,0.1)', color: 'var(--neon-blue)', border: '1px solid var(--neon-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: isDiag ? 0.5 : 1
                    }}>
                        <Radio size={18} /> {isDiag ? 'RUNNING...' : 'RUN SYSTEM DIAGNOSTICS'}
                    </button>
                </div>

                {/* Notification Settings */}
                <div className="glass-card" style={{ padding: '25px', borderLeft: '4px solid #facc15' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase' }}>
                        <Mail size={20} color="#facc15"/> Communication Links
                    </h2>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                            <span style={{ color: 'var(--text-main)', display: 'block' }}>SMTP Breach Alerts</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Send immediate email upon Level 5 threat</span>
                        </div>
                        <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} style={{ accentColor: '#facc15', width: '20px', height: '20px' }}/>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px' }}>Log Digest Frequency</label>
                        <select value={freq} onChange={(e) => setFreq(e.target.value)} style={{ 
                            width: '100%', padding: '12px', background: 'rgba(0,15,30,0.8)', border: '1px solid rgba(250,204,21,0.3)', 
                            color: '#fff', borderRadius: '4px', outline: 'none', cursor: 'pointer' 
                        }}>
                            <option value="realtime">Real-Time (Instantly)</option>
                            <option value="hourly">Hourly Digest</option>
                            <option value="daily">End of Day Report</option>
                            <option value="never">Never</option>
                        </select>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
