import { Outlet } from 'react-router-dom';
import TopNavigation from '../../components/TopNavigation';

const ADMIN_NAV = [
  { to: '/admin',                 label: 'Dashboard',       end: true },
  { to: '/admin/users',           label: 'Users'                      },
  { to: '/admin/learn',           label: 'Learn'                      },
  { to: '/admin/lab',             label: 'Lab (General)'              },
  { to: '/admin/verilog',         label: 'Verilog / HDL'              },
  { to: '/admin/contests',        label: 'Contests'                   },
  { to: '/admin/daily-challenge', label: 'Daily Challenge'            },
  { to: '/admin/eng-lab-folders', label: 'Objective Banks'            },
];

export default function AdminLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--surface)' }}>
      <TopNavigation navItems={ADMIN_NAV} role="admin" />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
        <div style={{ width: '100%', padding: 'clamp(16px,2vw,28px) clamp(12px,2.5vw,28px)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
