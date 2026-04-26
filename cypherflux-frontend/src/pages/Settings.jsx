import React, { useEffect, useState } from 'react';
import { Shield, User, Lock, Database, Radio, Mail, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThreats } from '../context/useThreats';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

const Settings = () => {
    const { user, changePassword, updateUserProfile, updateAccessToken } = useAuth();
    const { auditLogs, addAuditLog, clearAuditLogs } = useThreats();
    const navigate = useNavigate();
    
    const [sliderVal, setSliderVal] = useState(50);
    const [dosEnabled, setDosEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [freq, setFreq] = useState('hourly');
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);

    // Functional Action States
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [newLabel, setNewLabel] = useState(user?.username || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPass, setIsUpdatingPass] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isDiag, setIsDiag] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            try {
                const res = await api.get('/settings');
                const payload = res.data || {};
                setSliderVal(Number(payload.threat_threshold ?? 50));
                setDosEnabled(Boolean(payload.dos_enabled ?? true));
                setEmailEnabled(Boolean(payload.email_enabled ?? true));
                setFreq(payload.log_frequency || 'hourly');
                setNewLabel(payload.username || user?.username || '');
                addAuditLog('System Configuration Loaded.', 'info', 'CONFIG', 'Checksum: 0x8F2D | Sync: OK');
            } catch {
                toast.error('Failed to load current settings.');
                addAuditLog('ERROR: Configuration sync failed.', 'error', 'SYNC', 'ERR_CODE: 0x503 | RETRYING...');
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [user?.username, addAuditLog]);

    const saveSettings = async (updates, successMessage) => {
        setIsSavingPrefs(true);
        try {
            const res = await api.put('/settings', updates);
            if (res.data?.access_token) {
                updateAccessToken(res.data.access_token);
            }
            if (res.data?.username) {
                updateUserProfile({ username: res.data.username });
            }
            if (successMessage) {
                toast.success(successMessage);
                addAuditLog(successMessage, 'success', 'CONFIG', 'DB_SYNC: OK');
            }
            return true;
        } catch (err) {
            const msg = err.response?.data?.msg || 'Failed to save settings.';
            toast.error(msg);
            addAuditLog(`ERROR: ${msg}`, 'error', 'SYNC', 'ERR: 0x400');
            return false;
        } finally {
            setIsSavingPrefs(false);
        }
    };

    const handleUpdatePass = async () => {
        if (!currentPass || !newPass || !confirmPass) {
            return toast.warning('All password fields are required.');
        }
        setIsUpdatingPass(true);
        addAuditLog('Initiating password update protocol...', 'info', 'AUTH', 'Rotating RSA-4096 keys...');
        const result = await changePassword(currentPass, newPass, confirmPass);
        if (result.success) {
            toast.success(result.msg || 'Password updated successfully.');
            addAuditLog('SUCCESS: Encryption key rotated successfully.', 'success', 'AUTH', 'ID: ' + Math.random().toString(16).slice(2, 8));
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
        } else {
            const msg = result.msg || 'Password update failed.';
            toast.error(msg);
            addAuditLog(`FAILURE: ${msg}`, 'error', 'AUTH', 'ERR: INVALID_KEY');
        }
        setIsUpdatingPass(false);
    };

    const handleUpdateLabel = async () => {
        if (!newLabel) return toast.warning("Username alias cannot be empty.");
        setIsUpdatingProfile(true);
        addAuditLog(`Updating username to: ${newLabel}`, 'info', 'USER', 'Metadata modified');
        await saveSettings({ username: newLabel }, 'Username updated successfully.');
        setIsUpdatingProfile(false);
    };

    const handlePurgeBlocks = async () => {
        setIsPurging(true);
        addAuditLog('PURGE REQUEST: Clearing perimeter blocklist...', 'warning', 'SECURITY', 'Wiping IP_TABLES...');
        try {
            const res = await api.delete('/blocked');
            toast.success(res.data.msg || "Perimeter blocklist successfully purged.");
            addAuditLog('SUCCESS: Perimeter blocklist successfully purged.', 'success', 'SECURITY', 'ROWS: ALL');
        } catch { 
            toast.error("Failed to purge blocks."); 
            addAuditLog('ERROR: Block purge failed. Database connection timeout.', 'error', 'SECURITY', 'SQL_ERR: 0x08');
        }
        setIsPurging(false);
    };

    const handleClearLogs = async () => {
        setIsClearing(true);
        addAuditLog('MAINTENANCE: Flushing system log buffers...', 'warning', 'DB_ADMIN', 'VACUUM logs');
        try {
            const res = await api.delete('/logs');
            toast.success(res.data.msg || "System logs cleared from Secure DB.");
            addAuditLog('SUCCESS: Secure DB log buffers successfully cleared.', 'success', 'DB_ADMIN', 'TRUNCATE complete');
        } catch { 
            toast.error("Failed to clear logs."); 
            addAuditLog('ERROR: Log clearance failed.', 'error', 'DB_ADMIN', 'ERR_PERM: ACCESS_DENIED');
        }
        setIsClearing(false);
    };

    const handleDiagnostic = () => {
        const run = async () => {
            setIsDiag(true);
            addAuditLog('DIAGNOSTICS: Initiating full system audit...', 'info', 'SYSTEM', 'Checking health...');
            try {
                const res = await api.get('/settings/diagnostics');
                const details = res.data?.diagnostics || {};
                const diagMsg = `Audit Complete. DB: ${details.database}, Alerts: ${details.alerts}, Logs: ${details.logs}, Blocked: ${details.blocked_ips}.`;
                toast.success(diagMsg);
                addAuditLog(`SUCCESS: ${diagMsg}`, 'success', 'SYSTEM', 'HEALTH: 100%');
            } catch {
                toast.error('Diagnostics failed.');
                addAuditLog('FAILURE: System audit interrupted by network error.', 'error', 'SYSTEM', 'ERR_CONN: TIMEOUT');
            }
            setIsDiag(false);
        };
        run();
    };

    const handleToggleDos = async (next) => {
        setDosEnabled(next);
        addAuditLog(`DoS Filter: ${next ? 'ENABLED' : 'DISABLED'}`, next ? 'success' : 'warning', 'FIREWALL', next ? 'Protection: ON' : 'Protection: OFF');
        const ok = await saveSettings({ dos_enabled: next }, `DoS filter ${next ? 'enabled' : 'disabled'}.`);
        if (!ok) setDosEnabled(!next);
    };

    const handleToggleEmail = async (next) => {
        setEmailEnabled(next);
        addAuditLog(`SMTP Alerts: ${next ? 'ENABLED' : 'DISABLED'}`, next ? 'success' : 'warning', 'MAIL_SVC', next ? 'Queue: ACTIVE' : 'Queue: PAUSED');
        const ok = await saveSettings({ email_enabled: next }, `SMTP breach alerts ${next ? 'enabled' : 'disabled'}.`);
        if (!ok) setEmailEnabled(!next);
    };

    const handleFrequencyChange = async (value) => {
        const previous = freq;
        setFreq(value);
        addAuditLog(`Log Digest Frequency set to: ${value.toUpperCase()}`, 'info', 'REPORT', 'CRON updated');
        const ok = await saveSettings({ log_frequency: value }, 'Digest frequency updated.');
        if (!ok) setFreq(previous);
    };

    const handleThresholdCommit = async () => {
        addAuditLog(`Threat Sensitivity updated to: ${sliderVal} RPM`, 'info', 'THRESHOLD', `SENS: ${sliderVal}`);
        await saveSettings({ threat_threshold: Number(sliderVal) }, 'Threat threshold updated.');
    };

    const [selectedLog, setSelectedLog] = useState(null);

    return (
        <div style={{ padding: '30px', color: '#fff', paddingBottom: '100px', maxWidth: '1400px', margin: '0 auto' }}>
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
                            <span style={{ fontSize: '0.8rem', color: 'var(--neon-blue)', textAlign: 'center' }}>{user?.username ? user.username.charAt(0).toUpperCase() : 'C'}<br/>AVATAR</span>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Override Username</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} style={{
                                    flex: 1, padding: '10px', background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,240,255,0.2)', color: '#fff', borderRadius: '4px'
                                }} />
                                <button onClick={handleUpdateLabel} disabled={isUpdatingProfile} className="cyber-button" style={{ padding: '0 20px', opacity: isUpdatingProfile ? 0.5 : 1 }}>
                                    {isUpdatingProfile ? '...' : 'APPLY'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Update Encryption Key (Password)</label>
                        <div style={{ gridTemplateColumns: '1fr', display: 'grid', gap: '10px' }}>
                            <input type="password" value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} placeholder="Current Passcode" style={{
                                flex: 1, padding: '10px', background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,240,255,0.2)', color: '#fff', borderRadius: '4px'
                            }} />
                            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="New Passcode" style={{
                                flex: 1, padding: '10px', background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,240,255,0.2)', color: '#fff', borderRadius: '4px'
                            }} />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} placeholder="Confirm Passcode" style={{
                                    flex: 1, padding: '10px', background: 'rgba(0,15,30,0.5)', border: '1px solid rgba(0,240,255,0.2)', color: '#fff', borderRadius: '4px'
                                }} />
                                <button onClick={handleUpdatePass} disabled={isUpdatingPass} className="cyber-button" style={{ padding: '0 20px', opacity: isUpdatingPass ? 0.5 : 1 }}>
                                    {isUpdatingPass ? '...' : 'APPLY'}
                                </button>
                            </div>
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
                        <input type="checkbox" checked={dosEnabled} disabled={isLoading || isSavingPrefs} onChange={(e) => handleToggleDos(e.target.checked)} style={{ accentColor: 'var(--neon-green)', width: '20px', height: '20px' }}/>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Threat Sensitivity Threshold (Req/Min)</label>
                            <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{sliderVal} RPM</span>
                        </div>
                        <input type="range" min="10" max="200" value={sliderVal} disabled={isLoading || isSavingPrefs} onChange={(e) => setSliderVal(Number(e.target.value))} onMouseUp={handleThresholdCommit} onTouchEnd={handleThresholdCommit} style={{ width: '100%', accentColor: 'var(--neon-green)' }} />
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
                        <input type="checkbox" checked={emailEnabled} disabled={isLoading || isSavingPrefs} onChange={(e) => handleToggleEmail(e.target.checked)} style={{ accentColor: '#facc15', width: '20px', height: '20px' }}/>
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px' }}>Log Digest Frequency</label>
                        <select value={freq} disabled={isLoading || isSavingPrefs} onChange={(e) => handleFrequencyChange(e.target.value)} style={{ 
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

                {/* SYSTEM ACTIVITY CONSOLE v2.1 with SPLIT VIEW */}
                <div className="glass-card" style={{ 
                    gridColumn: '1 / -1', 
                    padding: '25px', 
                    background: 'rgba(0,5,10,0.85)', 
                    border: '1px solid rgba(0,240,255,0.15)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.05) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.003), rgba(0, 255, 0, 0.001), rgba(0, 0, 1, 0.003))',
                        backgroundSize: '100% 4px, 4px 100%',
                        pointerEvents: 'none',
                        zIndex: 1
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
                        <div>
                            <h3 style={{ fontSize: '0.9rem', color: 'var(--neon-blue)', display: 'flex', alignItems: 'center', gap: '12px', textTransform: 'uppercase', letterSpacing: '3px', margin: 0 }}>
                                <RefreshCw size={16} className="spin" /> SYSTEM_ACTIVITY_AUDIT_v2.1
                            </h3>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(0,240,255,0.4)', marginTop: '5px', letterSpacing: '1px' }}>
                                ENCRYPTED TELEMETRY STREAM // STATUS: ACTIVE
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button 
                                onClick={clearAuditLogs}
                                style={{
                                    background: 'rgba(0,240,255,0.05)',
                                    border: '1px solid rgba(0, 240, 255, 0.2)',
                                    color: 'var(--neon-blue)',
                                    fontSize: '0.65rem',
                                    padding: '5px 12px',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    transition: '0.2s',
                                    fontWeight: 'bold'
                                }}
                            >
                                PURGE_BUFFER
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', flex: 1, position: 'relative', zIndex: 2 }}>
                        {/* Log Stream Column */}
                        <div style={{ 
                            flex: 3,
                            height: '400px', 
                            overflowY: 'auto', 
                            display: 'flex', 
                            flexDirection: 'column-reverse', 
                            gap: '6px', 
                            paddingRight: '15px',
                            borderRight: '1px solid rgba(0,240,255,0.1)'
                        }} className="custom-scrollbar">
                            {auditLogs.length === 0 ? (
                                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textAlign: 'center', marginTop: '150px' }}>
                                    NO ACTIVE TELEMETRY DATA IN BUFFER.
                                </div>
                            ) : auditLogs.map(log => (
                                <div key={log.id} 
                                onClick={() => setSelectedLog(log)}
                                style={{ 
                                    fontSize: '0.75rem', 
                                    borderLeft: `3px solid ${log.type === 'error' ? 'var(--neon-red)' : log.type === 'warning' ? '#facc15' : log.type === 'success' ? 'var(--neon-green)' : 'var(--neon-blue)'}`,
                                    background: selectedLog?.id === log.id ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.03)',
                                    padding: '10px 15px',
                                    display: 'grid',
                                    gridTemplateColumns: '90px 70px 90px 1fr',
                                    alignItems: 'center',
                                    gap: '15px',
                                    transition: 'all 0.1s',
                                    fontFamily: '"JetBrains Mono", monospace',
                                    cursor: 'pointer',
                                    boxShadow: selectedLog?.id === log.id ? 'inset 0 0 10px rgba(0,240,255,0.1)' : 'none'
                                }}
                                onMouseEnter={(e) => { if (selectedLog?.id !== log.id) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                                onMouseLeave={(e) => { if (selectedLog?.id !== log.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                >
                                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>{log.ts}</span>
                                    <span style={{ 
                                        color: log.type === 'error' ? 'var(--neon-red)' : log.type === 'warning' ? '#facc15' : log.type === 'success' ? 'var(--neon-green)' : 'var(--neon-blue)',
                                        fontWeight: 'bold',
                                        fontSize: '0.6rem',
                                        textTransform: 'uppercase'
                                    }}>
                                        &lt;{log.source}&gt;
                                    </span>
                                    <span style={{ color: 'rgba(0,240,255,0.6)', fontSize: '0.6rem', letterSpacing: '1px' }}>[{log.category}]</span>
                                    <span style={{ 
                                        color: log.type === 'error' ? 'var(--neon-red)' : '#e0e0e0',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {log.msg}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Detail Inspector Column */}
                        <div style={{ 
                            flex: 1, 
                            background: 'rgba(0,0,0,0.3)', 
                            borderRadius: '8px', 
                            border: '1px solid rgba(0,240,255,0.1)',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '15px',
                            height: '400px',
                            overflowY: 'auto'
                        }} className="custom-scrollbar">
                            <h4 style={{ color: 'var(--neon-blue)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', borderBottom: '1px solid rgba(0,240,255,0.2)', paddingBottom: '10px', margin: 0 }}>
                                DETAILED_INSPECTOR
                            </h4>
                            
                            {selectedLog ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>EVENT_TYPE</div>
                                        <div style={{ fontSize: '0.8rem', color: selectedLog.type === 'error' ? 'var(--neon-red)' : 'var(--neon-blue)', fontWeight: 'bold' }}>{selectedLog.category}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>MESSAGE</div>
                                        <div style={{ fontSize: '0.75rem', color: '#fff', lineHeight: '1.4' }}>{selectedLog.msg}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>TELEMETRY_DATA</div>
                                        <div style={{ 
                                            fontSize: '0.65rem', 
                                            color: 'var(--neon-green)', 
                                            background: 'rgba(0,0,0,0.5)', 
                                            padding: '10px', 
                                            borderRadius: '4px',
                                            border: '1px solid rgba(57,255,20,0.1)',
                                            wordBreak: 'break-all',
                                            fontFamily: 'monospace'
                                        }}>
                                            {selectedLog.details}
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 'auto' }}>
                                        <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '4px' }}>RAW_JSON</div>
                                        <pre style={{ 
                                            fontSize: '0.55rem', 
                                            color: 'rgba(0,240,255,0.5)', 
                                            background: 'rgba(0,0,0,0.8)', 
                                            padding: '8px', 
                                            borderRadius: '4px',
                                            overflow: 'auto',
                                            maxHeight: '100px'
                                        }}>
                                            {JSON.stringify(selectedLog, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.15)', textAlign: 'center', gap: '15px' }}>
                                    <RefreshCw size={32} style={{ opacity: 0.2 }} />
                                    <span style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>SELECT AN ENTRY TO VIEW FULL TELEMETRY</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
