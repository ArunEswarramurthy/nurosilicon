import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronDown, LogOut, User, Menu, X, Search,
  LayoutDashboard, Code2, BookOpen, Trophy, GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveUploadUrl } from '../lib/uploadUrl';
import NotificationBell from './NotificationBell';
import nuroLogo from '/SilicpnLogo.jpeg';

const NAV_ICONS = {
  'Dashboard':       LayoutDashboard,
  'Lab':             Code2,
  'Learn':           GraduationCap,
  'Practice':        BookOpen,
  'Contests':        Trophy,
  'Profile':         User,
  'Users':           User,
  'Daily Challenge': LayoutDashboard,
  'Objective Banks': BookOpen,
  'Lab (General)':   Code2,
  'Verilog / HDL':   Code2,
};

const NAV_H    = 56;
const ITEM_H   = 36;
const CTRL_H   = 34;
const PROFILE_H = 36;

export default function TopNavigation({ navItems, role }) {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const profileRef = useRef(null);

  const initials  = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
  const photoUrl  = user?.photo_url ? resolveUploadUrl(user.photo_url) : null;
  const firstName = user?.name?.split(' ')[0] ?? '';

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const h = e => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [navigate]);

  const navLinkStyle = ({ isActive }) => ({
    display:        'inline-flex',
    alignItems:     'center',
    gap:            7,
    height:         ITEM_H,
    padding:        '0 11px',
    borderRadius:   8,
    fontSize:       13,
    fontWeight:     isActive ? 600 : 500,
    color:          isActive ? '#00A6FF' : 'rgba(255,255,255,0.55)',
    background:     isActive ? 'rgba(0,166,255,0.12)' : 'transparent',
    textDecoration: 'none',
    whiteSpace:     'nowrap',
    letterSpacing:  '-0.01em',
    transition:     'background 0.13s, color 0.13s',
    flexShrink:     0,
    borderBottom:   isActive ? '2px solid #00A6FF' : '2px solid transparent',
    marginBottom:   -1,
  });

  return (
    <>
      <header style={{
        position:     'sticky',
        top:          0,
        zIndex:       100,
        width:        '100%',
        height:       NAV_H,
        background:   '#0A0A1A',
        borderBottom: '1.5px solid #1A1A2E',
        boxShadow:    '0 1px 4px rgba(0,0,0,0.4)',
        display:      'flex',
        alignItems:   'center',
        flexShrink:   0,
        minWidth:     0,
        paddingLeft:  'clamp(14px, 2vw, 28px)',
        paddingRight: 'clamp(14px, 2vw, 28px)',
        gap:          0,
        boxSizing:    'border-box',
      }}>

        {/* Brand */}
        <NavLink to={role === 'admin' ? '/admin' : '/student'} style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0, marginRight: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#05050F', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1.5px solid #1A1A2E' }}>
            <img src={nuroLogo} alt="NuroSilicon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
            Nuro<span style={{ background: 'linear-gradient(90deg, #00A6FF, #A020F0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Silicon</span>
          </span>
        </NavLink>

        {/* Divider */}
        <div className="hidden md:block" style={{ width: 1, height: 20, background: '#1A1A2E', flexShrink: 0, marginRight: 16 }} />

        {/* Nav links */}
        <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 2, flexShrink: 1, flexGrow: 0, height: NAV_H, overflow: 'hidden', minWidth: 0 }}>
          {navItems.map(({ to, label, end }) => {
            const Icon = NAV_ICONS[label];
            return (
              <NavLink key={to} to={to} end={end} style={navLinkStyle}
                onMouseEnter={e => { if (!e.currentTarget.style.background.includes('rgba(0,166')) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { if (!e.currentTarget.style.background.includes('rgba(0,166')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
              >
                {Icon && <Icon size={15} strokeWidth={1.7} style={{ flexShrink: 0 }} />}
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Search */}
        <div className="hidden md:flex" style={{ flex: '1 1 0', minWidth: 140, maxWidth: 360, position: 'relative', alignItems: 'center', marginLeft: 12, marginRight: 12 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4A5568', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search problems, labs…"
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            style={{
              width: '100%', height: ITEM_H,
              paddingLeft: 32, paddingRight: 44,
              borderRadius: 9,
              border: `1.5px solid ${searchFocus ? '#00A6FF' : '#1A1A2E'}`,
              background: searchFocus ? '#0F0F1E' : '#05050F',
              fontSize: 13, color: '#E2E8F0',
              outline: 'none',
              transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
              boxShadow: searchFocus ? '0 0 0 3px rgba(0,166,255,0.10)' : 'none',
            }}
          />
          <kbd style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: '#0F0F1E', border: '1px solid #1A1A2E', borderRadius: 5, padding: '2px 5px', fontSize: 10, color: '#4A5568', fontFamily: 'inherit', fontWeight: 500, pointerEvents: 'none', lineHeight: 1.4 }}>⌘K</kbd>
        </div>

        <div className="flex md:hidden" style={{ flex: 1, minWidth: 0 }} />

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <NotificationBell />
          <div className="hidden md:block" style={{ width: 1, height: 20, background: '#1A1A2E', flexShrink: 0, margin: '0 2px' }} />

          {/* Profile */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              aria-label="Account menu"
              aria-expanded={profileOpen}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: PROFILE_H, padding: '0 10px', border: '1.5px solid #1A1A2E', borderRadius: 9, background: profileOpen ? '#0F0F1E' : '#05050F', cursor: 'pointer', transition: 'background 0.13s, border-color 0.13s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00A6FF'; e.currentTarget.style.background = '#0F0F1E'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1A1A2E'; e.currentTarget.style.background = profileOpen ? '#0F0F1E' : '#05050F'; }}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {photoUrl ? <img src={photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '-0.02em' }}>{initials}</span>}
              </div>
              <span className="hidden sm:block" style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{firstName}</span>
              <ChevronDown size={12} style={{ color: '#4A5568', transition: 'transform 0.18s', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
            </button>

            {profileOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 224, background: '#0A0A1A', border: '1.5px solid #1A1A2E', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden', zIndex: 300, animation: 'slideDown 0.12s ease-out' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #1A1A2E', background: '#0F0F1E' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {photoUrl ? <img src={photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{initials}</span>}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                      <p style={{ fontSize: 11, color: '#4A5568', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '6px' }}>
                  {role === 'student' && (
                    <button onClick={() => { navigate('/student/profile'); setProfileOpen(false); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s', textAlign: 'left' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#0F0F1E'; e.currentTarget.style.color = '#E2E8F0'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                      <User size={14} strokeWidth={1.6} style={{ color: '#4A5568', flexShrink: 0 }} />
                      My Profile
                    </button>
                  )}
                  <div style={{ height: 1, background: '#1A1A2E', margin: '4px 0' }} />
                  <button onClick={handleLogout}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut size={14} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger */}
          <button className="md:hidden" onClick={() => setMobileOpen(v => !v)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            style={{ width: CTRL_H, height: CTRL_H, borderRadius: 9, border: '1.5px solid #1A1A2E', background: mobileOpen ? '#0F0F1E' : '#05050F', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.13s' }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden" style={{ position: 'fixed', top: NAV_H, left: 0, right: 0, zIndex: 99, background: '#0A0A1A', borderBottom: '1.5px solid #1A1A2E', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1A1A2E' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4A5568', pointerEvents: 'none' }} />
              <input type="text" placeholder="Search problems, labs, contests…" style={{ width: '100%', height: 38, paddingLeft: 32, paddingRight: 12, borderRadius: 9, border: '1.5px solid #1A1A2E', background: '#05050F', fontSize: 13, outline: 'none', color: '#E2E8F0' }} />
            </div>
          </div>
          <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(({ to, label, end }) => {
              const Icon = NAV_ICONS[label];
              return (
                <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
                  style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#00A6FF' : 'rgba(255,255,255,0.6)', background: isActive ? 'rgba(0,166,255,0.12)' : 'transparent', textDecoration: 'none', transition: 'all 0.12s', borderLeft: `3px solid ${isActive ? '#00A6FF' : 'transparent'}` })}
                >
                  {Icon && <Icon size={16} strokeWidth={1.6} style={{ flexShrink: 0 }} />}
                  {label}
                </NavLink>
              );
            })}
          </nav>
          <div style={{ padding: '8px 12px 14px', borderTop: '1px solid #1A1A2E' }}>
            <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <LogOut size={15} strokeWidth={1.6} /> Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
