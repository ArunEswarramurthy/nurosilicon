import { useEffect, useState, useRef } from 'react';
import {
  Camera, Lock, Globe, X, CheckCircle2, AlertTriangle, Copy,
  User, Link2, Code2, BarChart2, Mail, Phone, Hash,
  Building2, Calendar, Share2, Settings, Trash2, Save,
} from 'lucide-react';
import { studentApi } from '../../lib/studentApi';
import { resolveUploadUrl } from '../../lib/uploadUrl';
import { useAuth } from '../../context/AuthContext';

const CODING_PLATFORMS = [
  { key: 'leetcode_url',      label: 'LeetCode',      placeholder: 'https://leetcode.com/username'           },
  { key: 'hackerrank_url',    label: 'HackerRank',    placeholder: 'https://hackerrank.com/username'         },
  { key: 'codechef_url',      label: 'CodeChef',      placeholder: 'https://codechef.com/users/username'     },
  { key: 'codeforces_url',    label: 'Codeforces',    placeholder: 'https://codeforces.com/profile/username' },
  { key: 'geeksforgeeks_url', label: 'GeeksForGeeks', placeholder: 'https://geeksforgeeks.org/user/username' },
];

const TABS = [
  { id: 'personal', label: 'Personal',  sub: 'Basic information',    icon: User     },
  { id: 'links',    label: 'Links',     sub: 'Social & portfolio',   icon: Link2    },
  { id: 'coding',   label: 'Coding',    sub: 'Coding preferences',   icon: Code2    },
  { id: 'skills',   label: 'Skills',    sub: 'Your technical skills', icon: BarChart2 },
];

function FieldRow({ label, locked, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        {locked && <Lock size={11} color="var(--text-muted)" />}
      </label>
      {children}
    </div>
  );
}

function ShareModal({ profile, form, onTogglePublic, onGenerateSlug, onClose, onSave }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = profile?.profile_slug ? `${window.location.origin}/p/${profile.profile_slug}` : '';
  const copy = () => { navigator.clipboard.writeText(profileUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Share profile</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 2px' }}>Public profile</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Anyone with the link can view</p>
            </div>
            <button
              onClick={onTogglePublic}
              style={{ position: 'relative', width: 36, height: 20, borderRadius: 99, background: form.is_profile_public ? '#00A6FF' : 'var(--border)', border: 'none', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', left: form.is_profile_public ? 18 : 2 }} />
            </button>
          </div>
          {!profile?.profile_slug ? (
            <button onClick={onGenerateSlug} className="btn btn-secondary btn-md" style={{ width: '100%' }}>
              Generate profile link
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profileUrl}
              </div>
              <button onClick={copy} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Close</button>
            <button onClick={onSave} className="btn btn-primary btn-sm" style={{ flex: 2 }}>Save & close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const [activeTab, setActiveTab] = useState('personal');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const fileRef = useRef();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', department: '', batch: '', roll_number: '',
    bio: '', github_url: '', linkedin_url: '', portfolio_url: '',
    leetcode_url: '', hackerrank_url: '', codechef_url: '', codeforces_url: '', geeksforgeeks_url: '',
    skills: '', is_profile_public: false,
  });

  useEffect(() => {
    studentApi.getProfile()
      .then(pr => {
        const p = pr.data.profile || {};
        setProfile(p);
        setForm({
          name: p.name || '', email: p.email || '', phone: p.phone || '',
          department: p.department || '', batch: p.batch || '', roll_number: p.roll_number || '',
          bio: p.bio || '', github_url: p.github_url || '', linkedin_url: p.linkedin_url || '',
          portfolio_url: p.portfolio_url || '', leetcode_url: p.leetcode_url || '',
          hackerrank_url: p.hackerrank_url || '', codechef_url: p.codechef_url || '',
          codeforces_url: p.codeforces_url || '', geeksforgeeks_url: p.geeksforgeeks_url || '',
          skills: Array.isArray(p.skills) ? p.skills.join(', ') : (p.skills || ''),
          is_profile_public: p.is_profile_public || false,
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payload = { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) };
      const res = await studentApi.updateProfile(payload);
      setProfile(res.data.profile);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setError('Save failed. Please try again.'); }
    finally { setSaving(false); }
  };

  const uploadPhoto = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setPhotoUploading(true);
    try {
      const res = await studentApi.uploadPhoto(file);
      setProfile(p => ({ ...p, photo_url: res.data.photo_url }));
      updateUser({ photo_url: res.data.photo_url });
    } catch { setError('Photo upload failed.'); }
    finally { setPhotoUploading(false); }
  };

  const generateSlug = async () => {
    try { const res = await studentApi.generateSlug(); setProfile(p => ({ ...p, profile_slug: res.data.slug })); }
    catch { setError('Failed to generate link.'); }
  };

  const photoUrl = profile?.photo_url ? resolveUploadUrl(profile.photo_url) : null;
  const initials = (form.name || 'S').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const skillList = form.skills.split(',').map(s => s.trim()).filter(Boolean);

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}>
      <div style={{ fontSize:13, color:'#94a3b8' }}>Loading profile...</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, fontFamily:'Inter,sans-serif' }}>

      {/* HERO BANNER */}
      <div style={{ borderRadius:16, overflow:'hidden', position:'relative', background:'linear-gradient(135deg,#05050B 0%,#0c0c1e 60%,#110820 100%)', minHeight:160, display:'flex', alignItems:'stretch', border:'1.5px solid #1a1a2e' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-60, left:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, right:180, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(160,32,240,0.15) 0%,transparent 65%)', pointerEvents:'none' }} />

        {/* Left: avatar + info */}
        <div className="profile-hero-info" style={{ flex:1, padding:'24px 28px', position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:20, minWidth:0 }}>
          {/* Avatar */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:72, height:72, borderRadius:16, background:'linear-gradient(135deg,#00A6FF,#A020F0)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'2px solid rgba(255,255,255,0.15)' }}>
              {photoUrl
                ? <img src={photoUrl} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <span style={{ fontSize:24, fontWeight:800, color:'#fff' }}>{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={photoUploading}
              style={{ position:'absolute', bottom:-4, right:-4, width:22, height:22, borderRadius:'50%', background:'#00A6FF', border:'2px solid #05050B', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Camera size={10} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={uploadPhoto} />
          </div>
          {/* Name + meta */}
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, color:'#fff', margin:'0 0 4px', letterSpacing:'-0.025em' }}>{form.name || 'Your Name'}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              {form.department && <span style={{ fontSize:13, color:'rgba(255,255,255,0.60)' }}>{form.department}</span>}
              {form.department && form.batch && <span style={{ color:'rgba(255,255,255,0.30)' }}>·</span>}
              {form.batch && <span style={{ fontSize:13, color:'rgba(255,255,255,0.60)' }}>Batch {form.batch}</span>}
            </div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              {form.email && (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Mail size={12} color="rgba(255,255,255,0.40)" />
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>{form.email}</span>
                </div>
              )}
              {form.phone && (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <Phone size={12} color="rgba(255,255,255,0.40)" />
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>+91 {form.phone}</span>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <Hash size={12} color="rgba(255,255,255,0.40)" />
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>Roll number {form.roll_number || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right decorative */}
        <div className="profile-hero-deco" style={{ width:140, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-end', padding:'20px 24px 20px 0', position:'relative', zIndex:2 }}>
          {['Learn','Simulate','Solve','Grow'].map((w,i) => (
            <p key={w} style={{ margin:'1px 0', fontSize:15+i*2, fontWeight:800, color:i%2===0?'#fff':'rgba(255,255,255,0.22)', letterSpacing:'-0.03em', lineHeight:1.1, textAlign:'right' }}>{w}</p>
          ))}
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>
          <AlertTriangle size={13} />{error}
          <button onClick={() => setError('')} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#ef4444', display:'flex' }}><X size={13} /></button>
        </div>
      )}
      {saved && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ecfdf5', border:'1.5px solid #6ee7b7', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#10b981', fontWeight:500 }}>
          <CheckCircle2 size={13} /> Profile saved successfully.
        </div>
      )}

      {/* MAIN 3-COL LAYOUT */}
      <div className="profile-layout">

        {/* LEFT: Tab sidebar */}
        <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 14px', border:'none', background:activeTab===t.id?'#e6f6ff':'transparent', borderLeft:`3px solid ${activeTab===t.id?'#00A6FF':'transparent'}`, cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}
              onMouseEnter={e => { if(activeTab!==t.id) e.currentTarget.style.background='#f8fafc'; }}
              onMouseLeave={e => { if(activeTab!==t.id) e.currentTarget.style.background='transparent'; }}
            >
              <div style={{ width:28, height:28, borderRadius:7, background:activeTab===t.id?'#00A6FF':'#f1f4f9', border:`1.5px solid ${activeTab===t.id?'#00A6FF':'#e2e8f0'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <t.icon size={13} color={activeTab===t.id?'#fff':'#94a3b8'} strokeWidth={1.6} />
              </div>
              <div>
                <p style={{ margin:0, fontSize:13, fontWeight:activeTab===t.id?700:500, color:activeTab===t.id?'#00A6FF':'#0a0a1a', letterSpacing:'-0.01em' }}>{t.label}</p>
                <p style={{ margin:0, fontSize:11, color:'#94a3b8' }}>{t.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* CENTER: Form */}
        <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, padding:'20px 22px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Form header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:'#e6f6ff', border:'1.5px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {activeTab==='personal'?<User size={16} color="#00A6FF" />:activeTab==='links'?<Link2 size={16} color="#00A6FF" />:activeTab==='coding'?<Code2 size={16} color="#00A6FF" />:<BarChart2 size={16} color="#00A6FF" />}
              </div>
              <div>
                <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#0a0a1a', letterSpacing:'-0.01em' }}>
                  {activeTab==='personal'?'Personal Information':activeTab==='links'?'Links & Portfolio':activeTab==='coding'?'Coding Profiles':'Skills'}
                </p>
                <p style={{ margin:0, fontSize:12, color:'#94a3b8' }}>
                  {activeTab==='personal'?'Keep your profile information up to date':activeTab==='links'?'Add your social and portfolio links':activeTab==='coding'?'Connect your competitive programming profiles':'Add your technical skills'}
                </p>
              </div>
            </div>
            <button onClick={save} disabled={saving}
              style={{ height:36, padding:'0 16px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00A6FF,#A020F0)', color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(0,166,255,0.25)', opacity:saving?0.7:1, whiteSpace:'nowrap' }}>
              <Save size={13} /> {saving?'Saving...':saved?'Saved!':'Save changes'}
            </button>
          </div>

          {/* Personal tab */}
          {activeTab==='personal' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%,200px),1fr))', gap:14 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Full name</label>
                  <div style={{ position:'relative' }}>
                    <User size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
                    <input className="input" value={form.name} onChange={set('name')} placeholder="Demo Student" style={{ paddingLeft:34 }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Email address</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
                    <input className="input" value={form.email} disabled style={{ paddingLeft:34, opacity:0.6, cursor:'not-allowed' }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Phone number</label>
                  <div style={{ position:'relative' }}>
                    <Phone size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
                    <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 9876543210" style={{ paddingLeft:34 }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Department</label>
                  <div style={{ position:'relative' }}>
                    <Building2 size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
                    <input className="input" value={form.department} disabled style={{ paddingLeft:34, opacity:0.6, cursor:'not-allowed' }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Batch</label>
                  <div style={{ position:'relative' }}>
                    <Calendar size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
                    <input className="input" value={form.batch} disabled style={{ paddingLeft:34, opacity:0.6, cursor:'not-allowed' }} />
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Roll number</label>
                  <div style={{ position:'relative' }}>
                    <Hash size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
                    <input className="input" value={form.roll_number} onChange={set('roll_number')} placeholder="Enter your roll number" style={{ paddingLeft:34 }} />
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Bio ({(form.bio||'').length}/500)</label>
                <textarea className="textarea" value={form.bio} onChange={set('bio')} placeholder="Tell recruiters and faculty about yourself" rows={4} maxLength={500} />
                <div style={{ textAlign:'right', fontSize:11, color:'#94a3b8' }}>{(form.bio||'').length}/500</div>
              </div>
            </div>
          )}

          {/* Links tab */}
          {activeTab==='links' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { key:'github_url',    label:'GitHub',    placeholder:'https://github.com/username',      color:'#0a0a1a' },
                { key:'linkedin_url',  label:'LinkedIn',  placeholder:'https://linkedin.com/in/username', color:'#0077b5' },
                { key:'portfolio_url', label:'Portfolio', placeholder:'https://yourportfolio.com',        color:'#A020F0' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>{label}</label>
                    {form[key] && <a href={form[key]} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#00A6FF', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}><Globe size={11} /> Open</a>}
                  </div>
                  <input className="input" value={form[key]} onChange={set(key)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          )}

          {/* Coding tab */}
          {activeTab==='coding' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>Connect your coding profiles to showcase your competitive programming activity.</p>
              {CODING_PLATFORMS.map(({ key, label, placeholder }) => (
                <div key={key} style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>{label}</label>
                    {form[key] && <a href={form[key]} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#00A6FF', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}><Globe size={11} /> Open</a>}
                  </div>
                  <input className="input" value={form[key]} onChange={set(key)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          )}

          {/* Skills tab */}
          {activeTab==='skills' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <label style={{ fontSize:13, fontWeight:600, color:'#0a0a1a' }}>Skills (comma separated)</label>
                <textarea className="textarea" value={form.skills} onChange={set('skills')} placeholder="React, Node.js, Verilog, Python, SQL" rows={3} />
              </div>
              {skillList.length > 0 && (
                <div>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 8px' }}>{skillList.length} skills</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {skillList.map(s => (
                      <span key={s} style={{ padding:'4px 10px', border:'1.5px solid #e2e8f0', borderRadius:99, fontSize:12, color:'#4a5568', background:'#f8fafc', fontWeight:500 }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Profile overview + quick actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Profile overview */}
          <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 14px', borderBottom:'1px solid #f1f4f9' }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'#e6f6ff', border:'1px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <User size={12} color="#00A6FF" />
              </div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0a0a1a', letterSpacing:'-0.01em' }}>Profile Overview</p>
            </div>
            {[
              { icon:Building2, label:'Department', value:form.department||'Not added', color:'#10b981', bg:'#ecfdf5', border:'#6ee7b7' },
              { icon:Calendar,  label:'Batch',      value:form.batch||'Not added',      color:'#A020F0', bg:'#f3e6fd', border:'#d9a8f8' },
              { icon:Hash,      label:'Roll number',value:form.roll_number||'Not added',color:'#00A6FF', bg:'#e6f6ff', border:'#b3e4ff' },
              { icon:Mail,      label:'Email',      value:form.email||'Not added',      color:'#ef4444', bg:'#fef2f2', border:'#fecaca' },
              { icon:Phone,     label:'Phone',      value:form.phone?`+91 ${form.phone}`:'Not added', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
            ].map(({ icon:Icon, label, value, color, bg, border }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid #f8fafc' }}>
                <div style={{ width:28, height:28, borderRadius:7, background:bg, border:`1px solid ${border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={12} color={color} />
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontSize:11, color:'#94a3b8', fontWeight:500 }}>{label}</p>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#0a0a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 14px', borderBottom:'1px solid #f1f4f9' }}>
              <div style={{ width:26, height:26, borderRadius:7, background:'#f3e6fd', border:'1px solid #d9a8f8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Settings size={12} color="#A020F0" />
              </div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0a0a1a', letterSpacing:'-0.01em' }}>Quick Actions</p>
            </div>
            <div style={{ padding:'8px' }}>
              <button onClick={() => setShareOpen(true)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', color:'#0a0a1a', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <Share2 size={13} color="#94a3b8" /> Share Profile
              </button>
              <button
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 10px', borderRadius:8, border:'none', background:'transparent', color:'#ef4444', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <Trash2 size={13} color="#ef4444" /> Deactivate Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareModal
          profile={profile}
          form={form}
          onTogglePublic={() => setForm(f => ({ ...f, is_profile_public: !f.is_profile_public }))}
          onGenerateSlug={generateSlug}
          onClose={() => setShareOpen(false)}
          onSave={async () => { await save(); setShareOpen(false); }}
        />
      )}
    </div>
  );
}
