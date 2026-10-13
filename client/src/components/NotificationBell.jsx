import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookOpen, Trophy, ClipboardList, BookMarked, Megaphone, X } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { studentApi } from '../lib/studentApi';

const TYPE_ICONS = {
  exam_assigned:      BookOpen,
  exam_starting_soon: Bell,
  result_published:   Trophy,
  assignment_graded:  ClipboardList,
  course_update:      BookMarked,
  notice_posted:      Megaphone,
  general:            Bell,
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, setNotifications, unreadCount, setUnreadCount, markRead } = useSocket();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    studentApi.getNotifications()
      .then(r => { setNotifications(r.data.notifications || []); setUnreadCount(r.data.unread_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [setNotifications, setUnreadCount]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async n => {
    if (!n.is_read) {
      await studentApi.markNotificationsRead([n.id]).catch(() => {});
      markRead([n.id]);
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    await studentApi.markNotificationsRead([]).catch(() => {});
    markRead([]);
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        style={{
          position: 'relative', width: 34, height: 34, borderRadius: 9,
          border: `1.5px solid ${open ? 'var(--blue)' : 'var(--border)'}`,
          background: open ? 'var(--blue-soft)' : 'transparent',
          color: open ? 'var(--blue)' : 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'var(--t)',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 17, height: 17, borderRadius: 99,
            background: 'var(--blue)', color: '#fff',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff', padding: '0 3px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 310, background: '#fff',
          border: '1.5px solid var(--border)', borderRadius: 14,
          boxShadow: 'var(--shadow-dropdown)', zIndex: 300,
          overflow: 'hidden', animation: 'scaleIn 0.12s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1.5px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 3, height: 14, borderRadius: 99, background: 'linear-gradient(180deg, #00A6FF, #A020F0)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Notifications</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ width: 24, height: 24, borderRadius: 6, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--t)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div className="skeleton" style={{ height: 12, width: '75%', borderRadius: 4 }} />
                      <div className="skeleton" style={{ height: 10, width: '50%', borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface)', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <Bell size={18} color="var(--text-muted)" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 3px' }}>All caught up</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(n => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 14px',
                      background: n.is_read ? 'transparent' : 'var(--blue-soft)',
                      border: 'none', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', textAlign: 'left', transition: 'var(--t)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--blue-soft)'; }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: n.is_read ? 'var(--surface)' : 'var(--blue-soft)', border: `1.5px solid ${n.is_read ? 'var(--border)' : 'var(--blue-mid)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={13} color={n.is_read ? 'var(--text-muted)' : 'var(--blue)'} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: n.is_read ? 400 : 600, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                        {n.title}
                      </p>
                      {n.body && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>}
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 5, boxShadow: '0 0 6px rgba(0,166,255,0.5)' }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
