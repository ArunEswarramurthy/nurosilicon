import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Eye, EyeOff, Database } from 'lucide-react';
import { verilogApi } from '../../lib/labApi';

const DIFF_STYLE = {
  easy:   { bg:'var(--success-soft)', color:'var(--success)', border:'var(--success-border)' },
  medium: { bg:'var(--warning-soft)', color:'var(--warning)', border:'var(--warning-border)' },
  hard:   { bg:'var(--danger-soft)',  color:'var(--danger)',  border:'var(--danger-border)'  },
};

export default function AdminVerilogPage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);

  const load = () => {
    setLoading(true);
    verilogApi.list({}).then(r => setProblems(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async p => {
    await verilogApi.update(p.id, { is_active: !p.is_active }).catch(() => {});
    load();
  };

  const deleteProblem = async p => {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    await verilogApi.remove(p.id).catch(() => {});
    load();
  };

  const handleSeed = async () => {
    if (!window.confirm('Seed default Verilog problems? Existing ones will be skipped.')) return;
    setSeeding(true);
    try { const r = await verilogApi.seed(); alert(r.data.message); load(); }
    catch (err) { alert(err.response?.data?.message || 'Seed failed'); }
    finally { setSeeding(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600, color:'var(--text-primary)', margin:'0 0 2px' }}>Verilog / SystemVerilog Problems</h1>
          <p style={{ fontSize:13, color:'var(--text-secondary)', margin:0 }}>Manage HDL problems — RTL design, gates, flip-flops, counters, FSMs</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleSeed} disabled={seeding} className="btn btn-secondary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Database size={13} /> {seeding ? 'Seeding...' : 'Seed defaults'}
          </button>
          <button onClick={() => navigate('/admin/verilog/new')} className="btn btn-primary btn-sm" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={13} /> New problem
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
        {[
          { label:'Total', value: problems.length },
          { label:'Active', value: problems.filter(p => p.is_active).length },
          { label:'Easy',   value: problems.filter(p => p.difficulty === 'easy').length },
          { label:'Medium', value: problems.filter(p => p.difficulty === 'medium').length },
          { label:'Hard',   value: problems.filter(p => p.difficulty === 'hard').length },
        ].map(({ label, value }) => (
          <div key={label} style={{ display:'flex', flexDirection:'column', gap:1 }}>
            <span style={{ fontSize:18, fontWeight:600, color:'var(--text-primary)', lineHeight:1 }}>{value}</span>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th><th>Title</th><th>Category</th><th>Difficulty</th><th>Level</th><th>Marks</th><th>Status</th><th style={{ textAlign:'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => (
                  <td key={j}><div className="skeleton" style={{ height:14, width: j===2?160:60 }} /></td>
                ))}</tr>
              ))
            ) : problems.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <p>No Verilog problems yet. Click "New problem" or "Seed defaults".</p>
                </div>
              </td></tr>
            ) : (
              problems.map((p, idx) => {
                const ds = DIFF_STYLE[p.difficulty] || DIFF_STYLE.easy;
                return (
                  <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.55 }}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{idx + 1}</td>
                    <td>
                      <p style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', margin:'0 0 1px' }}>{p.title}</p>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.category}</td>
                    <td>
                      <span style={{ fontSize:11, fontWeight:500, padding:'2px 7px', borderRadius:'var(--radius-sm)', background:ds.bg, color:ds.color, border:`1px solid ${ds.border}`, textTransform:'capitalize' }}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-secondary)' }}>L{p.level}</td>
                    <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.marks}</td>
                    <td>
                      {p.is_active
                        ? <span style={{ fontSize:11, fontWeight:500, color:'var(--success)', display:'flex', alignItems:'center', gap:4 }}><CheckCircle2 size={11} /> Active</span>
                        : <span style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4 }}><XCircle size={11} /> Inactive</span>
                      }
                    </td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
                        <button onClick={() => navigate(`/admin/verilog/${p.id}/edit`)} title="Edit" className="btn btn-ghost btn-sm" style={{ width:28, height:28, padding:0 }}><Pencil size={12} /></button>
                        <button onClick={() => toggleActive(p)} title={p.is_active ? 'Deactivate' : 'Activate'} className="btn btn-ghost btn-sm" style={{ width:28, height:28, padding:0 }}>
                          {p.is_active ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => deleteProblem(p)} title="Delete" className="btn btn-danger btn-sm" style={{ width:28, height:28, padding:0 }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
