import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Eye, EyeOff, Check, X, CheckCircle2, AlertTriangle,
  Code2, Cpu, ClipboardList, Trophy, Mail, KeyRound, User, Phone, Hash, RefreshCw,
} from 'lucide-react';
import nuroLogo from '/SilicpnLogo.jpeg';

const PWD_RULES = [
  { label: 'At least 8 characters',  test: p => p.length >= 8 },
  { label: 'One uppercase letter',   test: p => /[A-Z]/.test(p) },
  { label: 'One lowercase letter',   test: p => /[a-z]/.test(p) },
  { label: 'One number',             test: p => /\d/.test(p) },
  { label: 'One special character',  test: p => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

function PasswordChecklist({ password }) {
  if (!password) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
      {PWD_RULES.map(({ label, test }) => {
        const ok = test(password);
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: ok ? '#ecfdf5' : '#f1f5f9', border: `1px solid ${ok ? '#6ee7b7' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {ok ? <Check size={9} color="#10b981" strokeWidth={3} /> : <X size={9} color="#94a3b8" strokeWidth={2.5} />}
            </div>
            <span style={{ color: ok ? '#10b981' : '#94a3b8', fontWeight: ok ? 500 : 400 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', letterSpacing: '-0.01em' }}>{label}</label>
      {children}
    </div>
  );
}

function Feature({ icon: Icon, title, sub, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} strokeWidth={1.6} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>{title}</p>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{sub}</p>
      </div>
    </div>
  );
}

function IconInput({ icon: Icon, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <Icon size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
      {children}
    </div>
  );
}

export default function RegisterPage() {
  const { registerStudent, verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ name: '', email: '', phone: '', student_id: '', password: '', confirm_password: '' });
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  // Email verification
  const [pendingEmail, setPendingEmail] = useState(location.state?.pendingEmail || '');
  const [otp, setOtp]                   = useState('');
  const [verifying, setVerifying]       = useState(false);
  const [resending, setResending]       = useState(false);
  const [verifyError, setVerifyError]   = useState('');
  const [verified, setVerified]         = useState(false);

  const set = k => e => { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); };

  const validate = () => {
    if (!form.name.trim())  return 'Full name is required';
    if (!form.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address';
    if (!form.phone.trim()) return 'Phone number is required';
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ''))) return 'Enter a valid 10-digit mobile number';
    if (!form.password) return 'Password is required';
    if (!PWD_RULES.every(r => r.test(form.password))) return 'Password does not meet all requirements';
    if (form.password !== form.confirm_password) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(); if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const data = await registerStudent({
        name: form.name.trim(), email: form.email.trim(),
        phone: form.phone.trim(), student_id: form.student_id.trim() || undefined,
        password: form.password, confirm_password: form.confirm_password,
      });
      if (data.pending_verification) setPendingEmail(data.email);
    } catch (e) {
      setError(e.response?.data?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault(); setVerifyError(''); setVerifying(true);
    try {
      await verifyEmail(pendingEmail, otp);
      setVerified(true);
      setTimeout(() => navigate('/student'), 1400);
    } catch (e) {
      setVerifyError(e.response?.data?.message || 'Invalid or expired OTP');
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    setResending(true); setVerifyError('');
    try {
      await resendVerification(pendingEmail);
      setVerifyError('✓ New OTP sent! Check your inbox.');
    } catch { setVerifyError('Failed to resend. Try again.'); }
    finally { setResending(false); }
  };

  const pwdMatch    = form.confirm_password && form.password === form.confirm_password;
  const pwdMismatch = form.confirm_password && form.password !== form.confirm_password;

  /* ── Left panel (shared) ── */
  const LeftPanel = () => (
    <div className="hidden lg:flex" style={{ width: '52%', flexShrink: 0, position: 'relative', overflow: 'hidden', flexDirection: 'column', justifyContent: 'space-between', padding: '44px 48px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#05050B 0%,#0c0c1e 55%,#110820 100%)', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, opacity: 0.04, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,166,255,0.18) 0%, transparent 65%)', zIndex: 1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(160,32,240,0.18) 0%, transparent 65%)', zIndex: 1, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, position: 'relative', zIndex: 2 }}>
        <img src={nuroLogo} alt="NuroSilicon" style={{ height: 36, width: 36, objectFit: 'cover', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.15)' }} />
        <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>NuroSilicon</span>
      </div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99, background: 'rgba(0,166,255,0.12)', border: '1px solid rgba(0,166,255,0.25)', marginBottom: 22 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00A6FF', boxShadow: '0 0 8px #00A6FF' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#00A6FF', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Engineering Education Platform</span>
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
          Learn.<br />Practice.<br />
          <span style={{ background: 'linear-gradient(90deg,#00A6FF,#00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Build the Future.</span>
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', lineHeight: 1.75, maxWidth: 340, margin: '0 0 36px' }}>
          A dedicated platform for engineering students to learn, practice, and excel in VLSI, Verilog, coding and assessments.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Feature icon={Code2}         title="Coding Labs"              sub="Practice with real problems"  color="#00A6FF" />
          <Feature icon={Cpu}           title="Verilog & HDL Simulation" sub="Write, simulate and learn"    color="#00E5FF" />
          <Feature icon={ClipboardList} title="MCQ Tests & Assessments"  sub="Track your progress"          color="#A020F0" />
          <Feature icon={Trophy}        title="Contests & Leaderboards"  sub="Compete and grow"             color="#00A6FF" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 32, position: 'relative', zIndex: 2 }}>
        {[['500+', 'Problems'], ['50+', 'Colleges']].map(([val, lbl]) => (
          <div key={lbl}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#A020F0', letterSpacing: '-0.03em' }}>{val}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.40)', fontWeight: 500 }}>{lbl}</p>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── EMAIL VERIFICATION SCREEN ── */
  if (pendingEmail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
        <LeftPanel />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f4f9', padding: '32px 24px' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 'clamp(24px,5vw,40px) clamp(20px,5vw,36px)', boxShadow: '0 4px 40px rgba(0,0,0,0.10)', border: '1px solid #e8ecf4' }}>
              {verified ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ width: 68, height: 68, borderRadius: '50%', background: '#ecfdf5', border: '2px solid #6ee7b7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                    <CheckCircle2 size={32} color="#10b981" />
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0a0a1a', margin: '0 0 8px' }}>Email verified! 🎉</h2>
                  <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Welcome to NuroSilicon. Redirecting...</p>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#e6f6ff,#f3e6fd)', border: '2px solid #b3e4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Mail size={26} color="#00A6FF" />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0a0a1a', margin: '0 0 6px' }}>Verify your email</h2>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 4px' }}>We sent a 6-digit OTP to</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0a0a1a', margin: 0 }}>{pendingEmail}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                    {[1, 2].map(s => (
                      <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: 'linear-gradient(90deg,#7c3aed,#00A6FF)' }} />
                    ))}
                  </div>

                  {verifyError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: verifyError.startsWith('✓') ? '#ecfdf5' : '#fef2f2', border: `1.5px solid ${verifyError.startsWith('✓') ? '#6ee7b7' : '#fecaca'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: verifyError.startsWith('✓') ? '#10b981' : '#ef4444' }}>
                      {verifyError.startsWith('✓') ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {verifyError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', display: 'block', marginBottom: 8 }}>Enter OTP</label>
                      <input
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        required autoFocus maxLength={6}
                        style={{ width: '100%', height: 60, borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 30, fontWeight: 800, textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace', outline: 'none', color: '#0a0a1a', background: '#f8fafc', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                        onFocus={e => e.target.style.borderColor = '#00A6FF'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                    <button type="submit" disabled={verifying || otp.length < 6}
                      style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: otp.length < 6 ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed,#00A6FF)', color: otp.length < 6 ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 15, cursor: otp.length < 6 ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: otp.length >= 6 ? '0 4px 16px rgba(124,58,237,0.3)' : 'none' }}>
                      {verifying ? 'Verifying...' : 'Verify Email →'}
                    </button>
                  </form>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Didn't receive it?</span>
                    <button onClick={handleResend} disabled={resending}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#00A6FF', fontSize: 13, fontWeight: 700, cursor: resending ? 'wait' : 'pointer' }}>
                      <RefreshCw size={13} style={{ animation: resending ? 'spin 1s linear infinite' : 'none' }} />
                      {resending ? 'Sending...' : 'Resend OTP'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── REGISTRATION FORM ── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <LeftPanel />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f4f9', padding: '32px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 'clamp(24px,5vw,36px) clamp(20px,5vw,36px) clamp(20px,5vw,28px)', boxShadow: '0 4px 40px rgba(0,0,0,0.10)', border: '1px solid #e8ecf4' }}>

            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 12 }}>
                <img src={nuroLogo} alt="NuroSilicon" style={{ height: 32, width: 32, objectFit: 'cover', borderRadius: 8, border: '1.5px solid #e2e8f0' }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#0a0a1a', letterSpacing: '-0.02em' }}>NuroSilicon</span>
              </div>
              <div style={{ width: 40, height: 2, background: 'linear-gradient(90deg,#00A6FF,#A020F0)', borderRadius: 99, margin: '0 auto 14px' }} />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0a0a1a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>Create your account</h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Join NuroSilicon Engineering Platform</p>
            </div>

            <div style={{ display: 'flex', background: '#f1f4f9', borderRadius: 12, padding: 4, marginBottom: 22, gap: 4 }}>
              {[['signin', 'Sign In'], ['register', 'Register']].map(([key, label]) => (
                <button key={key} onClick={() => key === 'signin' ? navigate('/login') : undefined}
                  style={{ flex: 1, height: 38, borderRadius: 9, border: 'none', background: key === 'register' ? '#fff' : 'transparent', color: key === 'register' ? '#0a0a1a' : '#94a3b8', fontWeight: key === 'register' ? 700 : 500, fontSize: 14, cursor: 'pointer', boxShadow: key === 'register' ? '0 1px 6px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.18s ease', borderBottom: key === 'register' ? '2px solid #00A6FF' : '2px solid transparent' }}>
                  {label}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <Field label="Full name">
                <IconInput icon={User}>
                  <input className="input" placeholder="Enter your full name" value={form.name} onChange={set('name')} required autoComplete="name" style={{ paddingLeft: 38 }} />
                </IconInput>
              </Field>

              <Field label="Email address">
                <IconInput icon={Mail}>
                  <input type="email" className="input" placeholder="you@institution.com" value={form.email} onChange={set('email')} required autoComplete="email" style={{ paddingLeft: 38 }} />
                </IconInput>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,180px),1fr))', gap: 12 }}>
                <Field label="Phone">
                  <IconInput icon={Phone}>
                    <input type="tel" className="input" placeholder="9876543210"
                      value={form.phone}
                      onChange={e => { setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') })); setError(''); }}
                      required maxLength={10} autoComplete="tel" style={{ paddingLeft: 38 }} />
                  </IconInput>
                </Field>
                <Field label={<>Username <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opt.)</span></>}>
                  <IconInput icon={Hash}>
                    <input className="input" placeholder="e.g. arun_21" value={form.student_id} onChange={set('student_id')} style={{ paddingLeft: 38 }} />
                  </IconInput>
                </Field>
              </div>

              <Field label="Password">
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input type={showPwd ? 'text' : 'password'} className="input" placeholder="Create a strong password"
                    value={form.password} onChange={set('password')} required autoComplete="new-password"
                    style={{ paddingLeft: 38, paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <PasswordChecklist password={form.password} />
              </Field>

              <Field label="Confirm password">
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                  <input type={showConfirm ? 'text' : 'password'} className="input" placeholder="Re-enter your password"
                    value={form.confirm_password} onChange={set('confirm_password')} required autoComplete="new-password"
                    style={{ paddingLeft: 38, paddingRight: 42, borderColor: pwdMismatch ? '#ef4444' : pwdMatch ? '#10b981' : undefined }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.confirm_password && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: pwdMatch ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {pwdMatch ? <><Check size={11} strokeWidth={3} /> Passwords match</> : <><X size={11} strokeWidth={2.5} /> Passwords do not match</>}
                  </span>
                )}
              </Field>

              <button type="submit" disabled={loading}
                style={{ width: '100%', marginTop: 4, height: 46, borderRadius: 12, border: 'none', background: loading ? '#e2e8f0' : 'linear-gradient(135deg,#7c3aed 0%,#00A6FF 100%)', color: loading ? '#94a3b8' : '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.35)', transition: 'all 0.2s ease' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
                {loading ? 'Creating account...' : 'Create account →'}
              </button>
            </form>

            <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#00A6FF', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
