import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, ShieldCheck, Clock, Activity, Cpu } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();

    const sessionStartMs = useMemo(() => {
        const raw = sessionStorage.getItem('sessionStart');
        const value = raw ? Number(raw) : NaN;
        return Number.isFinite(value) ? value : Date.now();
    }, []);

    const [nowMs, setNowMs] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const sessionDurationText = useMemo(() => {
        const elapsed = Math.max(0, nowMs - sessionStartMs);
        const totalSeconds = Math.floor(elapsed / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }, [nowMs, sessionStartMs]);

    return (
        <div className="page-container" style={{ paddingBottom: '80px', color: '#fff' }}>
            <h2 className="neon-text" style={{ letterSpacing: '2px', marginBottom: '30px' }}>AGENT PROFILE</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                
                {/* Left Column - ID Badge */}
                <div className="glass-card" style={{ padding: '30px', textAlign: 'center', borderTop: '4px solid var(--neon-blue)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                        width: '120px', height: '120px', borderRadius: '50%',
                        background: 'rgba(0,240,255,0.1)', border: '2px solid var(--neon-blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '3rem', color: 'var(--neon-blue)', fontWeight: 'bold',
                        marginBottom: '20px', boxShadow: '0 0 20px rgba(0,240,255,0.2)'
                    }}>
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
                    </div>
                    
                    <h3 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{user?.username || 'UNKNOWN AGENT'}</h3>
                    
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                        <div style={{ background: 'rgba(0,15,30,0.5)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Mail size={14}/> Primary Email</div>
                            <div style={{ color: '#fff', marginTop: '5px', wordBreak: 'break-all' }}>{user?.email || 'Not configured'}</div>
                        </div>
                        <div style={{ background: 'rgba(0,15,30,0.5)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldCheck size={14}/> 2FA Status</div>
                            <div style={{ color: 'var(--neon-green)', marginTop: '5px', fontWeight: 'bold' }}>ACTIVE (SMTP VERIFIED)</div>
                        </div>
                    </div>
                </div>

                {/* Right Column - System Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    
                    {/* Activity Feed */}
                    <div className="glass-card" style={{ padding: '25px', borderLeft: '4px solid #facc15' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#facc15', marginBottom: '20px' }}>
                            <Activity size={20} /> Authentication Log
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span style={{ color: 'var(--text-main)' }}>Secure Login Validated</span>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>IP: 192.168.1.1 (Local)</div>
                                </div>
                                <div style={{ color: 'var(--neon-green)', fontSize: '0.85rem' }}>Just now</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span style={{ color: 'var(--text-main)' }}>SMTP OTP Handshake Issued</span>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Verification email dispatched</div>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>1 minute ago</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span style={{ color: 'var(--text-main)' }}>Access Configuration Updated</span>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Clearance level verified</div>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>2 hours ago</div>
                            </div>
                        </div>
                    </div>

                    {/* Hardware metrics Mockup */}
                    <div className="glass-card" style={{ padding: '25px', borderLeft: '4px solid var(--neon-blue)' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--neon-blue)', marginBottom: '20px' }}>
                            <Cpu size={20} /> Terminal Diagnostics
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div style={{ background: 'rgba(0,15,30,0.5)', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Session Duration</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Clock size={16} color="var(--neon-green)"/>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{sessionDurationText}</span>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(0,15,30,0.5)', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '5px' }}>Current Device ID</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>CFX-NODE-09</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Profile;
