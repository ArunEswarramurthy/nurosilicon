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

/* ─────────────────────────────────────────
   Shared token: every interactive control
   in the header is exactly NAV_H tall so
   everything sits on the same baseline.
───────────────────────────────────────── */
const NAV_H    = 56;   // header height
const ITEM_H   = 36;   // nav link pill height
const CTRL_H   = 34;   // icon buttons (bell, hamburger)
const PROFILE_H = 36;  // profile button

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

  /* close profile dropdown on outside click */
  useEffect(() => {
    const h = e => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* close mobile menu on route change */
  useEffect(() => { setMobileOpen(false); }, [navigate]);

  /* ── shared nav-link style factory ── */
  const navLinkStyle = ({ isActive }) => ({
    display:        'inline-flex',
    alignItems:     'center',
    gap:            7,
    height:         ITEM_H,
    padding:        '0 11px',
    borderRadius:   8,
    fontSize:       13,
    fontWeight:     isActive ? 600 : 500,
    color:          isActive ? '#00A6FF' : '#4a5568',
    background:     isActive ? '#e6f6ff' : 'transparent',
    textDecoration: 'none',
    whiteSpace:     'nowrap',
    letterSpacing:  '-0.01em',
    transition:     'background 0.13s, color 0.13s',
    flexShrink:     0,
    /* clean bottom accent — sits flush with header bottom */
    borderBottom:   isActive ? '2px solid #00A6FF' : '2px solid transparent',
    marginBottom:   isActive ? -1 : -1, /* align accent with header border */
  });

  return (
    <>
      {/* ══════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════ */}
      <header style={{
        position:     'sticky',
        top:          0,
        zIndex:       100,
        width:        '100%',
        height:       NAV_H,
        background:   '#ffffff',
        borderBottom: '1.5px solid #e8ecf4',
        boxShadow:    '0 1px 4px rgba(0,0,0,0.05)',
        display:      'flex',
        alignItems:   'center',
        flexShrink:   0,
        minWidth:     0,
        paddingLeft:  'clamp(14px, 2vw, 28px)',
        paddingRight: 'clamp(14px, 2vw, 28px)',
        gap:          0,          /* gaps are set per-group below */
        boxSizing:    'border-box',
      }}>

        {/* ── GROUP A: Brand ── */}
        <NavLink
          to={role === 'admin' ? '/admin' : '/student'}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            9,
            textDecoration: 'none',
            flexShrink:     0,
            marginRight:    16,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: '#0a0a1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
            border: '1.5px solid #1a1a2e',
          }}>
            <img src={nuroLogo} alt="NuroSilicon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#0a0a1a', letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>
            Nuro
            <span style={{
              background: 'linear-gradient(90deg, #00A6FF, #A020F0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Silicon</span>
          </span>
        </NavLink>

        {/* divider */}
        <div
          className="hidden md:block"
          style={{ width: 1, height: 20, background: '#e8ecf4', flexShrink: 0, marginRight: 16 }}
        />

        {/* ── GROUP B: Primary nav — desktop only ── */}
        <nav
          className="hidden md:flex"
          style={{
            alignItems:  'center',
            gap:         2,
            flexShrink:  1,
            flexGrow:    0,
            height:      NAV_H,
            overflow:    'hidden',
            minWidth:    0,
          }}
        >
          {navItems.map(({ to, label, end }) => {
            const Icon = NAV_ICONS[label];
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={navLinkStyle}
                onMouseEnter={e => {
                  if (!e.currentTarget.style.background.includes('e6f6ff')) {
                    e.currentTarget.style.background = '#f1f4f9';
                    e.currentTarget.style.color = '#0a0a1a';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.style.background.includes('e6f6ff')) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#4a5568';
                  }
                }}
              >
                {Icon && <Icon size={15} strokeWidth={1.7} style={{ flexShrink: 0 }} />}
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* ── GROUP C: Search — fills remaining space ── */}
        <div
          className="hidden md:flex"
          style={{
            flex:       '1 1 0',
            minWidth:   140,
            maxWidth:   360,
            position:   'relative',
            alignItems: 'center',
            marginLeft: 12,
            marginRight: 12,
          }}
        >
          <Search
            size={13}
            style={{
              position: 'absolute', left: 11, top: '50%',
              transform: 'translateY(-50%)',
              color: '#b0b8c8', pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search problems, labs…"
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            style={{
              width: '100%', height: ITEM_H,
              paddingLeft: 32, paddingRight: 44,
              borderRadius: 9,
              border: `1.5px solid ${searchFocus ? '#00A6FF' : '#e8ecf4'}`,
              background: searchFocus ? '#fff' : '#f8fafc',
              fontSize: 13, color: '#0a0a1a',
              outline: 'none',
              transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
              boxShadow: searchFocus ? '0 0 0 3px rgba(0,166,255,0.10)' : 'none',
            }}
          />
          <kbd style={{
            position: 'absolute', right: 9, top: '50%',
            transform: 'translateY(-50%)',
            background: '#f1f4f9',
            border: '1px solid #e2e8f0',
            borderRadius: 5,
            padding: '2px 5px',
            fontSize: 10,
            color: '#94a3b8',
            fontFamily: 'inherit',
            fontWeight: 500,
            pointerEvents: 'none',
            lineHeight: 1.4,
          }}>⌘K</kbd>
        </div>

        {/* mobile spacer */}
        <div className="flex md:hidden" style={{ flex: 1, minWidth: 0 }} />

        {/* ── GROUP D: Utility controls ── */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        6,
          flexShrink: 0,
        }}>

          {/* Notification bell */}
          <NotificationBell />

          {/* divider */}
          <div
            className="hidden md:block"
            style={{ width: 1, height: 20, background: '#e8ecf4', flexShrink: 0, margin: '0 2px' }}
          />

          {/* Profile button */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              aria-label="Account menu"
              aria-expanded={profileOpen}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        7,
                height:     PROFILE_H,
                padding:    '0 10px',
                border:     '1.5px solid #e8ecf4',
                borderRadius: 9,
                background: profileOpen ? '#f1f4f9' : '#fff',
                cursor:     'pointer',
                transition: 'background 0.13s, border-color 0.13s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#00A6FF';
                e.currentTarget.style.background  = '#f8fafc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e8ecf4';
                e.currentTarget.style.background  = profileOpen ? '#f1f4f9' : '#fff';
              }}
            >
              {/* avatar */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {photoUrl
                  ? <img src={photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '-0.02em' }}>{initials}</span>
                }
              </div>
              {/* name — hidden on small screens */}
              <span
                className="hidden sm:block"
                style={{
                  fontSize: 13, fontWeight: 600, color: '#0a0a1a',
                  maxWidth: 80, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}
              >
                {firstName}
              </span>
              <ChevronDown
                size={12}
                style={{
                  color: '#94a3b8',
                  transition: 'transform 0.18s',
                  transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0,
                }}
              />
            </button>

            {/* ── Profile dropdown ── */}
            {profileOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                width: 224,
                background: '#fff',
                border: '1.5px solid #e2e8f0',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                zIndex: 300,
                animation: 'slideDown 0.12s ease-out',
              }}>
                {/* user info */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f4f9', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {photoUrl
                        ? <img src={photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{initials}</span>
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0a0a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '6px' }}>
                  {role === 'student' && (
                    <button
                      onClick={() => { navigate('/student/profile'); setProfileOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                        padding: '8px 10px', borderRadius: 8,
                        border: 'none', background: 'transparent',
                        color: '#374151', fontSize: 13, fontWeight: 500,
                        cursor: 'pointer', transition: 'all 0.12s', textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f4f9'; e.currentTarget.style.color = '#0a0a1a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                    >
                      <User size={14} strokeWidth={1.6} style={{ color: '#94a3b8', flexShrink: 0 }} />
                      My Profile
                    </button>
                  )}
                  <div style={{ height: 1, background: '#f1f4f9', margin: '4px 0' }} />
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 10px', borderRadius: 8,
                      border: 'none', background: 'transparent',
                      color: '#ef4444', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', transition: 'all 0.12s', textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <LogOut size={14} strokeWidth={1.6} style={{ flexShrink: 0 }} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Hamburger — mobile only ── */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            style={{
              width: CTRL_H, height: CTRL_H, borderRadius: 9,
              border: '1.5px solid #e8ecf4',
              background: mobileOpen ? '#f1f4f9' : '#fff',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.13s',
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MOBILE MENU
      ══════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            position:     'fixed',
            top:          NAV_H,
            left:         0,
            right:        0,
            zIndex:       99,
            background:   '#fff',
            borderBottom: '1.5px solid #e2e8f0',
            boxShadow:    '0 8px 24px rgba(0,0,0,0.10)',
          }}
        >
          {/* mobile search */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f4f9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#b0b8c8', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search problems, labs, contests…"
                style={{
                  width: '100%', height: 38,
                  paddingLeft: 32, paddingRight: 12,
                  borderRadius: 9, border: '1.5px solid #e8ecf4',
                  background: '#f8fafc', fontSize: 13,
                  outline: 'none', color: '#0a0a1a',
                }}
              />
            </div>
          </div>

          {/* nav links */}
          <nav style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(({ to, label, end }) => {
              const Icon = NAV_ICONS[label];
              return (
                <NavLink
                  key={to} to={to} end={end}
                  onClick={() => setMobileOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 9,
                    fontSize: 14, fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#00A6FF' : '#374151',
                    background: isActive ? '#e6f6ff' : 'transparent',
                    textDecoration: 'none',
                    transition: 'all 0.12s',
                    borderLeft: `3px solid ${isActive ? '#00A6FF' : 'transparent'}`,
                  })}
                >
                  {Icon && <Icon size={16} strokeWidth={1.6} style={{ flexShrink: 0 }} />}
                  {label}
                </NavLink>
              );
            })}
          </nav>

          {/* sign out */}
          <div style={{ padding: '8px 12px 14px', borderTop: '1px solid #f1f4f9' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 9,
                border: 'none', background: '#fef2f2',
                color: '#ef4444', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <LogOut size={15} strokeWidth={1.6} /> Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
