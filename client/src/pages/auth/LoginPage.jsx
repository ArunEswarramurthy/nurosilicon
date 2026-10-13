import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import {
  Eye, EyeOff, AlertTriangle, Lock,
  Code2, Cpu, ClipboardList, Trophy, Mail, KeyRound, CheckCircle2, X,
} from 'lucide-react';
import nuroLogo from '/SilicpnLogo.jpeg';

const ROLE_REDIRECT = { super_admin: '/admin', student: '/student' };

/* -- tiny reusable field wrapper -- */
function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/* -- left-panel feature row -- */
function Feature({ icon: Icon, title, sub, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={color} strokeWidth={1.6} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>{title}</p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{sub}</p>
      </div>
    </div>
  );
}

/* -- flagged screen -- */
function FlaggedScreen({ reason, onBack }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 400, width: '100%', background: '#fff', border: '1.5px solid #fecaca', borderRadius: 16, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={16} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', margin: 0 }}>Account restricted</h2>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16, lineHeight: 1.65 }}>
          Your account has been flagged. Please contact your administrator to restore access.
        </p>
        {reason && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Reason</p>
            <p style={{ fontSize: 13, color: '#1a1a2e', margin: 0 }}>{reason}</p>
          </div>
        )}
        <button onClick={onBack} style={{ width: '100%', height: 42, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1a1a2e', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Back to sign in
        </button>
      </div>
    </div>
  );
}

/* ── Forgot Password Modal ── */
function ForgotPasswordModal({ onClose }) {
  const [step, setStep]       = useState(1); // 1=email, 2=otp, 3=newpwd
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [pwd, setPwd]         = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);

  const PWD_OK = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(pwd);

  const submitEmail = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const submitOtp = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', { email, otp });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP');
    } finally { setLoading(false); }
  };

  const submitReset = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, password: pwd });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', height: 42, padding: '0 12px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'Inter,sans-serif', color: '#0a0a1a', background: '#fff' };
  const btnStyle  = { width: '100%', height: 44, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#00A6FF)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(5,5,11,0.55)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.15s ease-out' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'scaleIn 0.15s ease-out', position: 'relative' }}>

        {/* close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e2e8f0', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <X size={14} />
        </button>

        {/* step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: s <= step ? 'linear-gradient(90deg,#7c3aed,#00A6FF)' : '#e2e8f0', transition: 'background 0.3s' }} />
          ))}
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ecfdf5', border: '2px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <CheckCircle2 size={24} color="#10b981" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0a0a1a', margin: '0 0 8px' }}>Password reset!</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>You can now sign in with your new password.</p>
            <button onClick={onClose} style={{ ...btnStyle, background: 'linear-gradient(135deg,#7c3aed,#00A6FF)' }}>Back to sign in</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0a0a1a', margin: '0 0 4px' }}>
              {step === 1 ? 'Forgot password?' : step === 2 ? 'Enter OTP' : 'New password'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
              {step === 1 ? 'Enter your email and we\'ll send a 6-digit OTP.' :
               step === 2 ? `OTP sent to ${email}. Check your inbox.` :
               'Choose a strong new password.'}
            </p>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 9, padding: '9px 12px', marginBottom: 14, fontSize: 13, color: '#ef4444' }}>
                <AlertTriangle size={13} />{error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={submitEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus style={inputStyle} />
                <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Sending OTP...' : 'Send OTP →'}</button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={submitOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} required autoFocus maxLength={6}
                  style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: '0.2em', fontFamily: 'monospace' }} />
                <button type="submit" disabled={loading || otp.length < 6} style={{ ...btnStyle, opacity: otp.length < 6 ? 0.5 : 1 }}>{loading ? 'Verifying...' : 'Verify OTP →'}</button>
                <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#00A6FF', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>← Change email</button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={submitReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} placeholder="New password" value={pwd} onChange={e => setPwd(e.target.value)} required autoFocus style={{ ...inputStyle, paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {pwd && <p style={{ fontSize: 12, color: PWD_OK ? '#10b981' : '#ef4444', margin: 0 }}>{PWD_OK ? '✓ Strong password' : 'Min 8 chars, uppercase, lowercase, number, special char'}</p>}
                <button type="submit" disabled={loading || !PWD_OK} style={{ ...btnStyle, opacity: !PWD_OK ? 0.5 : 1 }}>{loading ? 'Resetting...' : 'Reset password →'}</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════ */
export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]               = useState('signin');
  const [form, setForm]             = useState({ email: '', password: '' });
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [flagged, setFlagged]       = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const googleInitialized           = useRef(false);

  /* Google GSI */
  useEffect(() => {
    if (googleInitialized.current) return;
    const init = () => {
      if (!window.google?.accounts?.id) return;
      googleInitialized.current = true;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setError(''); setLoading(true);
          try {
            const u = await loginWithGoogle(credential);
            navigate(ROLE_REDIRECT[u.role] || '/login');
          } catch (e) {
            const d = e.response?.data;
            if (d?.flagged) { setFlagged(true); setFlagReason(d.flag_reason || ''); }
            else setError(d?.message || 'Authentication failed');
          } finally { setLoading(false); }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', width: 360, text: 'signin_with' }
      );
    };
    if (document.getElementById('google-gsi-script')) { init(); return; }
    const s = document.createElement('script');
    s.id = 'google-gsi-script'; s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.onload = init;
    document.body.appendChild(s);
  }, []); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const u = await Promise.race([
        login(form.email, form.password),
        new Promise((_, r) => setTimeout(() => r(new Error('Connection timeout.')), 10000)),
      ]);
      if (!u) { setError('Invalid email or password'); return; }
      navigate(ROLE_REDIRECT[u.role] || '/login');
    } catch (e) {
      const d = e.response?.data;
      if (d?.flagged)    { setFlagged(true); setFlagReason(d.flag_reason || ''); }
      else if (d?.unverified) { setUnverifiedEmail(d.email || form.email); }
      else setError(d?.message || e.message || 'Invalid email or password');
    } finally { setLoading(false); }
  };

  if (flagged) return <FlaggedScreen reason={flagReason} onBack={() => { setFlagged(false); setError(''); }} />;

  // Unverified — redirect to register page which shows OTP screen
  if (unverifiedEmail) {
    navigate('/register', { state: { pendingEmail: unverifiedEmail } });
    return null;
  }

  /* If tab === 'register', redirect to register page */
  if (tab === 'register') {
    navigate('/register');
    return null;
  }

  return (
    <>
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>

      {/* ══ LEFT PANEL ══ */}
      <div
        className="hidden lg:flex"
        style={{
          width: '52%', flexShrink: 0,
          position: 'relative', overflow: 'hidden',
          flexDirection: 'column', justifyContent: 'space-between',
          padding: '44px 48px',
        }}
      >
        {/* Dark bg */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#05050B 0%,#0c0c1e 55%,#110820 100%)', zIndex: 0 }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, opacity: 0.04,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,255,0.18) 0%, transparent 65%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(160,32,240,0.18) 0%, transparent 65%)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '40%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.07) 0%, transparent 65%)', zIndex: 1, pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, position: 'relative', zIndex: 2 }}>
          <img src={nuroLogo} alt="NuroSilicon" style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.15)' }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>NuroSilicon</span>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Tag */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(0,166,255,0.12)', border: '1px solid rgba(0,166,255,0.25)', marginBottom: 22 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00A6FF', boxShadow: '0 0 8px #00A6FF' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00A6FF', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Engineering Education Platform</span>
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
            Learn.<br />
            Practice.<br />
            <span style={{ background: 'linear-gradient(90deg,#00A6FF,#00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Build the Future.
            </span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', lineHeight: 1.75, maxWidth: 340, margin: '0 0 36px' }}>
            A dedicated platform for engineering students to learn, practice, and excel in VLSI, Verilog, coding and assessments.
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Feature icon={Code2}        title="Coding Labs"              sub="Practice with real problems"    color="#00A6FF" />
            <Feature icon={Cpu}          title="Verilog & HDL Simulation" sub="Write, simulate and learn"      color="#00E5FF" />
            <Feature icon={ClipboardList} title="MCQ Tests & Assessments" sub="Track your progress"            color="#A020F0" />
            <Feature icon={Trophy}       title="Contests & Leaderboards"  sub="Compete and grow"               color="#00A6FF" />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32, position: 'relative', zIndex: 2 }}>
          {[['500+', 'Problems'], ['50+', 'Colleges']].map(([val, lbl]) => (
            <div key={lbl}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#A020F0', letterSpacing: '-0.03em' }}>{val}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f1f4f9', padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 460 }}>

          {/* Card */}
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 'clamp(24px,5vw,36px) clamp(20px,5vw,36px) clamp(20px,5vw,32px)',
            boxShadow: '0 4px 40px rgba(0,0,0,0.10)',
            border: '1px solid #e8ecf4',
          }}>

            {/* Logo + heading */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 14 }}>
                <img src={nuroLogo} alt="NuroSilicon" style={{ height: 32, width: 32, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #e2e8f0' }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0a0a1a', letterSpacing: '-0.02em' }}>NuroSilicon</span>
              </div>
              {/* Accent line */}
              <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg,#00A6FF,#A020F0)', borderRadius: 99, margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0a0a1a', margin: '0 0 5px', letterSpacing: '-0.025em' }}>Welcome back</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Sign in to continue your learning journey</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#f1f4f9', borderRadius: 12, padding: 4, marginBottom: 24, gap: 4 }}>
              {[['signin', 'Sign In'], ['register', 'Register']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => key === 'register' ? navigate('/register') : setTab(key)}
                  style={{
                    flex: 1, height: 38, borderRadius: 9, border: 'none',
                    background: tab === key ? '#fff' : 'transparent',
                    color: tab === key ? '#0a0a1a' : '#94a3b8',
                    fontWeight: tab === key ? 700 : 500,
                    fontSize: 14, cursor: 'pointer',
                    boxShadow: tab === key ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.18s ease',
                    letterSpacing: '-0.01em',
                    borderBottom: tab === key ? '2px solid #00A6FF' : '2px solid transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#ef4444' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <Field label="Email address">
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    className="input"
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required autoComplete="email" autoFocus
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </Field>

              <Field label="Password">
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required autoComplete="current-password"
                    style={{ paddingLeft: 38, paddingRight: 42 }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span onClick={() => setShowForgot(true)} style={{ fontSize: 12, color: '#00A6FF', fontWeight: 600, cursor: 'pointer' }}>Forgot password?</span>
                </div>
              </Field>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 46, borderRadius: 12, border: 'none',
                  background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed 0%,#00A6FF 100%)',
                  color: loading ? '#94a3b8' : '#fff',
                  fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.35)',
                  transition: 'all 0.2s ease', letterSpacing: '-0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            </div>

            {/* Google */}
            <div id="google-btn" style={{ display: 'flex', justifyContent: 'center' }} />

            {/* Footer link */}
            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
              New to NuroSilicon?{' '}
              <Link to="/register" style={{ color: '#00A6FF', fontWeight: 700, textDecoration: 'none' }}>
                Create an account →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>

    {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  );
}

