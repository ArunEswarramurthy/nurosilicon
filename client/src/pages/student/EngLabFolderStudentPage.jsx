import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderOpen, BookOpen, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, ArrowLeft, Search, Play, MoreHorizontal } from 'lucide-react';
import StudentRequestError, { getStudentRequestError } from '../../components/ui/StudentRequestError';
import { engLabFolderApi, engLabBankApi } from '../../lib/engineeringApi';

const TYPE_LABEL = {
  mcq_single: 'MCQ', mcq_multi: 'Multi-select',
  true_false: 'True/False', fill_blank: 'Fill blank', mixed: 'Mixed',
};

function FolderBanksInline({ folderId, navigate, onStartTest }) {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startingBank, setStartingBank] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await engLabFolderApi.get(folderId);
      setBanks(response.data.banks || []);
    } catch (requestError) {
      setError(getStudentRequestError(requestError, 'Could not load this folder.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [folderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startBank = async (bank) => {
    setStartingBank(bank.id);
    setActionError('');
    try {
      await onStartTest(bank);
    } catch (requestError) {
      setActionError(getStudentRequestError(requestError, 'Could not open this practice bank.'));
    } finally {
      setStartingBank(null);
    }
  };

  if (loading) return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
      Loading banks...
    </div>
  );
  if (error) return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
      <StudentRequestError message={error} onRetry={load} retrying={loading} />
    </div>
  );
  if (!banks.length) return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
      No banks in this folder.
    </div>
  );

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      {actionError && <div style={{ padding: 12 }}><StudentRequestError message={actionError} /></div>}
      {banks.map((bank, idx) => {
        const qCount = bank.question_count || 0;
        return (
          <div key={bank.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: idx < banks.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bank.name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                {TYPE_LABEL[bank.bank_type] || 'Mixed'} · {qCount} questions
              </p>
            </div>
            {qCount > 0 ? (
              <button onClick={() => startBank(bank)} disabled={startingBank === bank.id} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: startingBank === bank.id ? 0.65 : 1 }}>
                <Play size={11} /> {startingBank === bank.id ? 'Loading...' : 'Start'}
              </button>
            ) : (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Empty</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SORT_OPTS = ['Newest First','Most Questions','Recently Added','Most Practiced'];

export function EngLabFolderListPage() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState('Newest First');
  const [expanded, setExpanded] = useState({});
  const [sortOpen, setSortOpen] = useState(false);
  const [error, setError] = useState('');

  const loadFolders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await engLabFolderApi.list();
      setFolders(response.data.folders || []);
    } catch (requestError) {
      setError(getStudentRequestError(requestError, 'Could not load engineering practice folders.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFolders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalBanks = folders.reduce((s,f) => s+(f.bank_count||0), 0);
  const totalQs    = folders.reduce((s,f) => s+(f.question_count||0), 0);

  const visible = folders.filter(f => {
    const q = search.trim().toLowerCase();
    return !q || f.name?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q);
  });

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const FILTER_TABS = [
    { id:'all',      label:'All Folders',    icon:FolderOpen },
    { id:'recent',   label:'Recently Added', icon:ChevronRight },
    { id:'most_q',   label:'Most Questions', icon:BookOpen },
    { id:'practiced',label:'Most Practiced', icon:Play },
  ];
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, fontFamily:'Inter,sans-serif' }}>
      <style>{`
        .folder-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .folder-toolbar-search { position:relative; }
        .folder-toolbar-search input { height:34px; padding-left:30px; padding-right:12px; width:200px; border-radius:8px; border:1.5px solid #e2e8f0; background:#fff; font-size:13px; color:#0a0a1a; outline:none; font-family:Inter,sans-serif; }
        .folder-card-stats { display:flex; align-items:center; gap:20px; flex-shrink:0; }
        .folder-card-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        @media (max-width: 900px) {
          .folder-card-stats { display:none; }
        }
        @media (max-width: 640px) {
          .folder-toolbar-search input { width:140px; }
          .folder-card-actions button:first-child { display:none; }
        }
      `}</style>
      {error && <StudentRequestError message={error} onRetry={loadFolders} retrying={loading} />}

      {/* -- HERO BANNER -- */}
      <div style={{ borderRadius:16, overflow:'hidden', position:'relative', background:'linear-gradient(135deg,#05050B 0%,#0c0c1e 60%,#110820 100%)', minHeight:180, display:'flex', alignItems:'stretch', border:'1.5px solid #1a1a2e' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-60, left:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, right:180, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(160,32,240,0.15) 0%,transparent 65%)', pointerEvents:'none' }} />

        {/* Left */}
        <div style={{ flex:1, padding:'22px 28px', position:'relative', zIndex:2 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.45)', letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 6px' }}>Practice</p>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#fff', margin:'0 0 6px', letterSpacing:'-0.03em', lineHeight:1.15 }}>
            Objective{' '}
            <span style={{ background:'linear-gradient(90deg,#00A6FF,#A020F0)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Banks</span>
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.50)', margin:'0 0 20px' }}>MCQ, True/False, Fill-in-the-blank - timed assessments to strengthen your concepts.</p>
          {/* Stat chips */}
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {[
              { icon:FolderOpen, label:'Folders',   value:folders.length,  color:'#00A6FF', bg:'rgba(0,166,255,0.15)',   border:'rgba(0,166,255,0.3)'   },
              { icon:BookOpen,   label:'Banks',     value:totalBanks,      color:'#A020F0', bg:'rgba(160,32,240,0.15)',  border:'rgba(160,32,240,0.3)'  },
              { icon:Search,     label:'Questions', value:totalQs,         color:'#10b981', bg:'rgba(16,185,129,0.15)', border:'rgba(16,185,129,0.3)' },
            ].map(({ icon:Icon, label, value, color, bg, border }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:bg, border:`1px solid ${border}`, borderRadius:10 }}>
                <div style={{ width:26, height:26, borderRadius:7, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={13} color={color} strokeWidth={1.6} />
                </div>
                <div>
                  <p style={{ margin:0, fontSize:18, fontWeight:800, color:'#fff', lineHeight:1, letterSpacing:'-0.03em' }}>{loading?'-':value}</p>
                  <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,0.45)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right decorative */}
        <div style={{ width:140, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-end', padding:'20px 24px 20px 0', position:'relative', zIndex:2 }}>
          {['Practice','Solve','Improve'].map((w,i) => (
            <p key={w} style={{ margin:'2px 0', fontSize:18+i*3, fontWeight:800, color:i%2===0?'#fff':'rgba(255,255,255,0.22)', letterSpacing:'-0.03em', lineHeight:1.1, textAlign:'right' }}>{w}</p>
          ))}
        </div>
      </div>

      {/* -- FILTER TABS + SEARCH + SORT -- */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', background:'#f1f4f9', borderRadius:10, padding:3, gap:2 }}>
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ height:32, padding:'0 14px', borderRadius:8, border:'none', background:activeTab===t.id?'#fff':'transparent', color:activeTab===t.id?'#0a0a1a':'#94a3b8', fontWeight:activeTab===t.id?700:500, fontSize:13, cursor:'pointer', boxShadow:activeTab===t.id?'0 1px 4px rgba(0,0,0,0.08)':'none', transition:'all 0.15s', display:'flex', alignItems:'center', gap:5, borderBottom:activeTab===t.id?'2px solid #00A6FF':'2px solid transparent', whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1 }} />
        {/* Search */}
        <div style={{ position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
          <input style={{ height:34, paddingLeft:30, paddingRight:12, width:200, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, color:'#0a0a1a', outline:'none', fontFamily:'Inter,sans-serif' }}
            placeholder="Search folders..." value={search} onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor='#00A6FF'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
        </div>
        {/* Sort */}
        <div style={{ position:'relative' }}>
          <button onClick={() => setSortOpen(v=>!v)}
            style={{ height:34, padding:'0 12px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, color:'#4a5568', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'Inter,sans-serif' }}>
            {sort} <ChevronDown size={13} color="#94a3b8" />
          </button>
          {sortOpen && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.10)', zIndex:50, overflow:'hidden', minWidth:160 }}>
              {SORT_OPTS.map(o => (
                <button key={o} onClick={() => { setSort(o); setSortOpen(false); }}
                  style={{ width:'100%', padding:'9px 14px', border:'none', background:sort===o?'#e6f6ff':'transparent', color:sort===o?'#00A6FF':'#0a0a1a', fontSize:13, fontWeight:sort===o?700:400, cursor:'pointer', textAlign:'left', transition:'background 0.1s' }}
                  onMouseEnter={e => { if(sort!==o) e.currentTarget.style.background='#f8fafc'; }}
                  onMouseLeave={e => { if(sort!==o) e.currentTarget.style.background='transparent'; }}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* -- FOLDER LIST -- */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }} />)}
        </div>
      ) : visible.length === 0 ? (
        <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#e6f6ff', border:'1.5px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
            <FolderOpen size={22} color="#00A6FF" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize:14, fontWeight:700, color:'#0a0a1a', margin:'0 0 4px' }}>{folders.length===0?'No folders available':'No matching folders.'}</p>
          <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>{folders.length===0?'Ask your admin to create folders.':''}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {visible.map((f, fi) => {
            const color = f.color || '#A020F0';
            const isOpen = !!expanded[f.id];
            const createdDate = f.created_at ? new Date(f.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : null;
            const TYPE_TAGS = ['MCQ','True/False','Fill in the blank'];
            return (
              <div key={f.id} style={{ background:'#fff', border:`1.5px solid ${isOpen?color:'#e8ecf4'}`, borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', transition:'all 0.15s' }}
                onMouseEnter={e => { if(!isOpen) e.currentTarget.style.borderColor='#c8d0dc'; }}
                onMouseLeave={e => { if(!isOpen) e.currentTarget.style.borderColor='#e8ecf4'; }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
                  {/* Icon */}
                  <div style={{ width:48, height:48, borderRadius:12, background:`${color}15`, border:`1.5px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <FolderOpen size={20} color={color} strokeWidth={1.6} />
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:700, color:'#0a0a1a', margin:'0 0 3px', letterSpacing:'-0.01em' }}>{f.name}</p>
                    {f.description && <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 6px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.description}</p>}
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {TYPE_TAGS.map(tag => (
                        <span key={tag} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background: tag==='MCQ'?'#e6f6ff':tag==='True/False'?'#f3e6fd':'#fef2f2', color:tag==='MCQ'?'#00A6FF':tag==='True/False'?'#A020F0':'#ef4444', border:`1px solid ${tag==='MCQ'?'#b3e4ff':tag==='True/False'?'#d9a8f8':'#fecaca'}` }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="folder-card-stats">
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:26, height:26, borderRadius:7, background:'#e6f6ff', border:'1px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <BookOpen size={12} color="#00A6FF" />
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0a0a1a', lineHeight:1 }}>{f.bank_count||0}</p>
                        <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Banks</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:26, height:26, borderRadius:7, background:'#ecfdf5', border:'1px solid #6ee7b7', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Search size={12} color="#10b981" />
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#0a0a1a', lineHeight:1 }}>{f.question_count||0}</p>
                        <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Questions</p>
                      </div>
                    </div>
                    {createdDate && (
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:26, height:26, borderRadius:7, background:'#f3e6fd', border:'1px solid #d9a8f8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <ChevronRight size={12} color="#A020F0" />
                        </div>
                        <div>
                          <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#0a0a1a', lineHeight:1 }}>{createdDate}</p>
                          <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Created</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="folder-card-actions">
                    <button onClick={() => navigate('/student/eng-lab-folders/'+f.id)}
                      style={{ height:36, padding:'0 16px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00A6FF,#A020F0)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(0,166,255,0.25)', whiteSpace:'nowrap' }}
                      onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                      Open Folder <ChevronRight size={13} />
                    </button>
                    <button onClick={() => toggleExpand(f.id)}
                      style={{ width:32, height:32, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='#f1f4f9'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}>
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
                {/* Expanded banks */}
                {isOpen && (
                  <FolderBanksInline folderId={f.id} navigate={navigate} onStartTest={bank => {
                    return engLabBankApi.get(bank.id).then(r => {
                      const allQ = r.data.questions || [];
                      const cfg = { mode:'random', count:Math.min(10,allQ.length), easy:3, medium:4, hard:3, secPerQ:90 };
                      navigate('/student/eng-lab-banks/'+bank.id+'/test', { state:{ allQ, cfg, bank } });
                    });
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -- PAGINATION -- */}
      {!loading && visible.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:4 }}>
          <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>Showing {visible.length} of {folders.length} folder{folders.length!==1?'s':''}</p>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <button style={{ width:32, height:32, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
              <ChevronLeft size={14} />
            </button>
            <button style={{ width:32, height:32, borderRadius:8, border:'none', background:'linear-gradient(135deg,#00A6FF,#A020F0)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>1</button>
            <button style={{ width:32, height:32, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function EngLabFolderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder]   = useState(null);
  const [banks, setBanks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortOpen, setSortOpen]   = useState(false);
  const [sort, setSort]           = useState('Newest First');
  const [error, setError]         = useState('');
  const [startError, setStartError] = useState('');
  const [retryBank, setRetryBank] = useState(null);

  const loadFolder = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await engLabFolderApi.get(id);
      setFolder(response.data.folder);
      setBanks(response.data.banks || []);
    } catch (requestError) {
      setError(getStudentRequestError(requestError, 'Could not load this folder.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFolder(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStart = async bank => {
    setRetryBank(bank);
    setStartError('');
    try {
      const response = await engLabBankApi.get(bank.id);
      const allQ = response.data.questions || [];
      const cfg = { mode:'random', count:Math.min(10,allQ.length), easy:3, medium:4, hard:3, secPerQ:90 };
      navigate('/student/eng-lab-banks/'+bank.id+'/test', { state:{ allQ, cfg, bank } });
    } catch (requestError) {
      setStartError(getStudentRequestError(requestError, 'Could not open this practice bank.'));
    }
  };

  const filtered = banks.filter(b => !search || b.name?.toLowerCase().includes(search.toLowerCase()));
  const totalQ   = banks.reduce((s,b) => s+(b.question_count||0), 0);
  const attempted = 0;
  const color = folder?.color || '#A020F0';

  const BANK_TABS = [
    { id:'all',         label:`All Banks (${banks.length})` },
    { id:'not_started', label:'Not Attempted' },
    { id:'in_progress', label:'In Progress'   },
    { id:'completed',   label:'Completed'     },
  ];

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}>
      <div style={{ fontSize:13, color:'#94a3b8' }}>Loading...</div>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <StudentRequestError message={error} onRetry={loadFolder} retrying={loading} />
      <button onClick={() => navigate('/student/eng-lab-folders')} className="btn btn-secondary btn-sm" style={{ alignSelf:'flex-start' }}>
        Back to categories
      </button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, fontFamily:'Inter,sans-serif' }}>
      {startError && <StudentRequestError message={startError} onRetry={() => retryBank && handleStart(retryBank)} />}

      {/* -- HERO BANNER -- */}
      <div style={{ borderRadius:16, overflow:'hidden', position:'relative', background:'linear-gradient(135deg,#05050B 0%,#0c0c1e 60%,#110820 100%)', minHeight:170, display:'flex', alignItems:'stretch', border:'1.5px solid #1a1a2e' }}>
        <div style={{ position:'absolute', inset:0, opacity:0.04, backgroundImage:'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-60, left:-60, width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,166,255,0.18) 0%,transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, right:180, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(160,32,240,0.15) 0%,transparent 65%)', pointerEvents:'none' }} />

        {/* Left */}
        <div style={{ flex:1, padding:'20px 24px', position:'relative', zIndex:2 }}>
          {/* Back */}
          <button onClick={() => navigate('/student/eng-lab-folders')}
            style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:7, padding:'4px 10px', color:'rgba(255,255,255,0.65)', fontSize:12, fontWeight:500, cursor:'pointer', marginBottom:12 }}>
            <ChevronLeft size={13} /> Back to categories
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:8 }}>
            <div style={{ width:52, height:52, borderRadius:13, background:`${color}25`, border:`1.5px solid ${color}50`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <FolderOpen size={22} color={color} strokeWidth={1.6} />
            </div>
            <div>
              <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 3px', letterSpacing:'-0.025em' }}>{folder?.name}</h1>
              {folder?.description && <p style={{ fontSize:13, color:'rgba(255,255,255,0.50)', margin:0 }}>{folder.description}</p>}
            </div>
          </div>
          {/* Tags */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:'rgba(0,166,255,0.15)', color:'#00A6FF', border:'1px solid rgba(0,166,255,0.3)' }}>{banks.length} bank{banks.length!==1?'s':''}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)' }}>{totalQ} question{totalQ!==1?'s':''}</span>
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background:'rgba(160,32,240,0.15)', color:'#A020F0', border:'1px solid rgba(160,32,240,0.3)' }}>Mixed</span>
          </div>
        </div>

        {/* Right decorative */}
        <div style={{ width:140, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-end', padding:'20px 24px 20px 0', position:'relative', zIndex:2 }}>
          {['Practice','Analyze','Improve','Score Higher'].map((w,i) => (
            <p key={w} style={{ margin:'1px 0', fontSize:13+i*1.5, fontWeight:800, color:i%2===0?'#fff':'rgba(255,255,255,0.22)', letterSpacing:'-0.02em', lineHeight:1.15, textAlign:'right' }}>{w}</p>
          ))}
        </div>
      </div>

      {/* -- STAT BOXES -- */}
      <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', display:'flex', flexWrap:'wrap' }}>
        {[
          { icon:BookOpen,  label:'Total Banks',     value:banks.length, color:'#00A6FF', bg:'#e6f6ff', border:'#b3e4ff' },
          { icon:Search,    label:'Total Questions', value:totalQ,       color:'#10b981', bg:'#ecfdf5', border:'#6ee7b7' },
          { icon:ChevronRight, label:'Attempted',    value:attempted,    color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
          { icon:ChevronUp, label:'Accuracy',        value:'0%',         color:'#A020F0', bg:'#f3e6fd', border:'#d9a8f8' },
        ].map(({ icon:Icon, label, value, color:c, bg, border:bd }, i, arr) => (
          <div key={label} style={{ flex:1, minWidth:120, padding:'14px 18px', borderRight:i<arr.length-1?'1px solid #e8ecf4':'none', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:9, background:bg, border:`1.5px solid ${bd}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={16} color={c} strokeWidth={1.6} />
            </div>
            <div>
              <p style={{ fontSize:22, fontWeight:800, color:'#0a0a1a', margin:0, lineHeight:1, letterSpacing:'-0.04em' }}>{value}</p>
              <p style={{ fontSize:11, color:'#94a3b8', margin:'2px 0 0', fontWeight:500 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* -- TABS + SEARCH + SORT -- */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', background:'#f1f4f9', borderRadius:10, padding:3, gap:2 }}>
          {BANK_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ height:32, padding:'0 14px', borderRadius:8, border:'none', background:activeTab===t.id?'#fff':'transparent', color:activeTab===t.id?'#0a0a1a':'#94a3b8', fontWeight:activeTab===t.id?700:500, fontSize:13, cursor:'pointer', boxShadow:activeTab===t.id?'0 1px 4px rgba(0,0,0,0.08)':'none', transition:'all 0.15s', borderBottom:activeTab===t.id?'2px solid #00A6FF':'2px solid transparent', whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex:1 }} />
        <div style={{ position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
          <input style={{ height:34, paddingLeft:30, paddingRight:12, width:180, borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, color:'#0a0a1a', outline:'none', fontFamily:'Inter,sans-serif' }}
            placeholder="Search banks..." value={search} onChange={e => setSearch(e.target.value)}
            onFocus={e => e.target.style.borderColor='#00A6FF'} onBlur={e => e.target.style.borderColor='#e2e8f0'} />
        </div>
        <div style={{ position:'relative' }}>
          <button onClick={() => setSortOpen(v=>!v)}
            style={{ height:34, padding:'0 12px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#fff', fontSize:13, color:'#4a5568', fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'Inter,sans-serif' }}>
            {sort} <ChevronDown size={13} color="#94a3b8" />
          </button>
          {sortOpen && (
            <div style={{ position:'absolute', right:0, top:'calc(100% + 6px)', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.10)', zIndex:50, overflow:'hidden', minWidth:160 }}>
              {SORT_OPTS.map(o => (
                <button key={o} onClick={() => { setSort(o); setSortOpen(false); }}
                  style={{ width:'100%', padding:'9px 14px', border:'none', background:sort===o?'#e6f6ff':'transparent', color:sort===o?'#00A6FF':'#0a0a1a', fontSize:13, fontWeight:sort===o?700:400, cursor:'pointer', textAlign:'left' }}
                  onMouseEnter={e => { if(sort!==o) e.currentTarget.style.background='#f8fafc'; }}
                  onMouseLeave={e => { if(sort!==o) e.currentTarget.style.background='transparent'; }}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* -- BANK CARDS -- */}
      {filtered.length === 0 ? (
        <div style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, padding:'48px 24px', textAlign:'center' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'#e6f6ff', border:'1.5px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
            <BookOpen size={22} color="#00A6FF" strokeWidth={1.5} />
          </div>
          <p style={{ fontSize:14, fontWeight:700, color:'#0a0a1a', margin:'0 0 4px' }}>No banks found</p>
          <p style={{ fontSize:13, color:'#94a3b8', margin:0 }}>This folder has no banks yet.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map((bank, idx) => {
            const qCount = bank.question_count || 0;
            const typeLabel = TYPE_LABEL[bank.bank_type] || 'Mixed';
            const estMins = Math.max(1, Math.round(qCount * 1.5));
            return (
              <div key={bank.id} style={{ background:'#fff', border:'1.5px solid #e8ecf4', borderRadius:14, padding:'16px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#c8d0dc'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='#e8ecf4'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'; }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {/* Icon */}
                  <div style={{ width:48, height:48, borderRadius:12, background:'#f3e6fd', border:'1.5px solid #d9a8f8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <BookOpen size={20} color="#A020F0" strokeWidth={1.6} />
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#0a0a1a', margin:0, letterSpacing:'-0.01em' }}>{bank.name}</p>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'#f3e6fd', color:'#A020F0', border:'1px solid #d9a8f8' }}>{typeLabel}</span>
                    </div>
                    {bank.description && <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bank.description}</p>}
                    <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#94a3b8' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:'#94a3b8' }} />
                      Not attempted yet
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="folder-card-stats">
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:'#e6f6ff', border:'1px solid #b3e4ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <BookOpen size={12} color="#00A6FF" />
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0a0a1a', lineHeight:1 }}>{qCount}</p>
                        <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Questions</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:'#ecfdf5', border:'1px solid #6ee7b7', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <ChevronUp size={12} color="#10b981" />
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0a0a1a', lineHeight:1 }}>-</p>
                        <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Avg. Score</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:'#fffbeb', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <ChevronRight size={12} color="#f59e0b" />
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#0a0a1a', lineHeight:1 }}>~{estMins} min</p>
                        <p style={{ margin:0, fontSize:10, color:'#94a3b8' }}>Estimated Time</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="folder-card-actions">
                    <button onClick={() => navigate('/student/eng-lab-banks/'+bank.id)}
                      style={{ height:36, padding:'0 16px', borderRadius:9, border:'1.5px solid #e2e8f0', background:'#fff', color:'#0a0a1a', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all 0.15s', whiteSpace:'nowrap' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#00A6FF'; e.currentTarget.style.color='#00A6FF'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#e2e8f0'; e.currentTarget.style.color='#0a0a1a'; }}>
                      <BookOpen size={13} /> Browse Questions
                    </button>
                    {qCount > 0 && (
                      <button onClick={() => handleStart(bank)}
                        style={{ height:36, padding:'0 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00A6FF,#A020F0)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(0,166,255,0.25)', whiteSpace:'nowrap', transition:'all 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                        onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                        <Play size={13} /> Start Test
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
