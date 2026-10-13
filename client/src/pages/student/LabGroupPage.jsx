import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, CheckCircle2, XCircle, Circle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { labApi } from '../../lib/labApi';

const LANG_LABEL = { systemverilog:'SystemVerilog', verilog:'Verilog', c:'C', cpp:'C++', python:'Python', java:'Java', embedded_c:'Embedded C', sql:'MySQL/SQL' };
const DIFF_STYLE = {
  easy:   { bg:'var(--success-soft)',  color:'var(--success)',  border:'var(--success-border)' },
  medium: { bg:'var(--warning-soft)',  color:'var(--warning)',  border:'var(--warning-border)' },
  hard:   { bg:'var(--danger-soft)',   color:'var(--danger)',   border:'var(--danger-border)'  },
};

export const LAB_GROUPS = {};

function StatusBadge({ status }) {
  if (status === 'passed') return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:'var(--success)', background:'var(--success-soft)', border:'1px solid var(--success-border)', padding:'2px 7px', borderRadius:'var(--radius-sm)', flexShrink:0 }}>
      <CheckCircle2 size={10} /> Passed
    </span>
  );
  if (status === 'failed') return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:'var(--danger)', background:'var(--danger-soft)', border:'1px solid var(--danger-border)', padding:'2px 7px', borderRadius:'var(--radius-sm)', flexShrink:0 }}>
      <XCircle size={10} /> Failed
    </span>
  );
  return (
    <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:'var(--text-muted)', background:'var(--surface)', border:'1px solid var(--border)', padding:'2px 7px', borderRadius:'var(--radius-sm)', flexShrink:0 }}>
      <Circle size={10} /> Todo
    </span>
  );
}

function ProblemRow({ p, idx, navigate }) {
  const ds = DIFF_STYLE[p.difficulty] || DIFF_STYLE.easy;
  const solveUrl = '/student/lab/' + p.id;
  return (
    <tr onClick={() => navigate(solveUrl)} style={{ cursor:'pointer' }}>
      <td style={{ color:'var(--text-muted)', fontSize:12 }}>{p.question_no || idx + 1}</td>
      <td>
        <div>
          <p style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', margin:'0 0 1px' }}>{p.title}</p>
          {p.category && <p style={{ fontSize:11, color:'var(--text-muted)', margin:0 }}>{p.category}</p>}
        </div>
      </td>
      <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{LANG_LABEL[p.language] || p.language}</td>
      <td>
        <span style={{ fontSize:11, fontWeight:500, padding:'2px 7px', borderRadius:'var(--radius-sm)', background:ds.bg, color:ds.color, border:`1px solid ${ds.border}`, textTransform:'capitalize' }}>
          {p.difficulty}
        </span>
      </td>
      <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{p.marks}</td>
      <td><StatusBadge status={p.my_status} /></td>
      <td style={{ textAlign:'right' }}>
        <button onClick={e => { e.stopPropagation(); navigate(solveUrl); }} className="btn btn-secondary btn-sm">Solve</button>
      </td>
    </tr>
  );
}

export default function LabGroupPage() {
  const { groupId } = useParams();
  const navigate    = useNavigate();
  const [group, setGroup]       = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [diff, setDiff]         = useState('all');

  useEffect(() => {
    setLoading(true);
    labApi.groups().then(r => {
      const found = (r.data.groups || []).find(item => String(item.id) === String(groupId));
      if (found) {
        setGroup({ label: found.name, desc: found.description || '' });
        return labApi.list({ group_id: found.id });
      }
      return null;
    }).then(r => { if (r) setProblems(r.data.problems || []); }).catch(() => {}).finally(() => setLoading(false));
  }, [groupId]);

  if (!group && loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}>
      <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading...</div>
    </div>
  );

  if (!group) return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <p style={{ fontSize:14, color:'var(--text-secondary)' }}>Group not found.</p>
      <button onClick={() => navigate('/student/lab')} className="btn btn-primary btn-sm" style={{ marginTop:12 }}>Back to Lab</button>
    </div>
  );

  const filtered = problems.filter(p => {
    const ms = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const md = diff === 'all' || p.difficulty === diff;
    return ms && md;
  });

  const solved = problems.filter(p => p.my_status === 'passed').length;
  const pct    = problems.length > 0 ? Math.round((solved / problems.length) * 100) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => navigate('/student/lab')} className="btn btn-ghost btn-sm" style={{ width:32, height:32, padding:0 }}>
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:20, fontWeight:600, color:'var(--text-primary)', margin:'0 0 2px' }}>{group.label}</h1>
          <p style={{ fontSize:13, color:'var(--text-secondary)', margin:0 }}>{group.desc}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'16px 18px' }}>
        <div style={{ display:'flex', gap:20, marginBottom:12, flexWrap:'wrap' }}>
          {[
            { label:'Total',    value:problems.length },
            { label:'Solved',   value:solved },
            { label:'Easy',     value:problems.filter(p => p.difficulty === 'easy').length },
            { label:'Medium',   value:problems.filter(p => p.difficulty === 'medium').length },
            { label:'Hard',     value:problems.filter(p => p.difficulty === 'hard').length },
          ].map(({ label, value }) => (
            <div key={label} style={{ display:'flex', flexDirection:'column', gap:1 }}>
              <span style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', lineHeight:1 }}>{loading ? '-' : value}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>Progress</span>
            <span style={{ fontSize:12, fontWeight:500, color:'var(--text-secondary)' }}>{solved} / {problems.length}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width:`${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft:32 }} placeholder={`Search ${group.label} problems...`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width:130 }} value={diff} onChange={e => setDiff(e.target.value)}>
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>{filtered.length} problems</span>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Problem</th>
              <th>Language</th>
              <th>Difficulty</th>
              <th>Marks</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  {[1,2,3,4,5,6,7].map(j => (
                    <td key={j}><div className="skeleton" style={{ height:14, width:j===2?160:60 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <p>No problems found. Try adjusting your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p, idx) => <ProblemRow key={p.id} p={p} idx={idx} navigate={navigate} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
