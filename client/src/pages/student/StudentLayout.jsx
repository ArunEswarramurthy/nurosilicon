import { Outlet } from 'react-router-dom';
import TopNavigation from '../../components/TopNavigation';

const STUDENT_NAV = [
  { to: '/student',                 label: 'Dashboard', end: true },
  { to: '/student/learn',           label: 'Learn'                },
  { to: '/student/lab',             label: 'Lab'                  },
  { to: '/student/eng-lab-folders', label: 'Practice'             },
  { to: '/student/contests',        label: 'Contests'             },
  { to: '/student/profile',         label: 'Profile'              },
];

export default function StudentLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#f1f4f9', width: '100%', minWidth: 0 }}>
      <TopNavigation navItems={STUDENT_NAV} role="student" />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        <div style={{ width: '100%', minWidth: 0, padding: 'clamp(12px, 2vw, 20px) clamp(12px, 2.5vw, 28px)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
