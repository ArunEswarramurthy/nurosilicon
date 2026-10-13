import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  FolderOpen, Plus, Trash2, Pencil, ChevronRight,
  BookOpen, Check, AlertCircle, Layers, ToggleLeft,
  AlignLeft, Database, Search, ChevronDown, ChevronUp,
  ChevronLeft, Send, X,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { engLabFolderApi, engLabBankApi } from '../../lib/engineeringApi';
import { useAuth } from '../../context/AuthContext';
import { DIFF_BADGES } from '../../lib/questionTypes';

// -- Constants ----------------------------------------------------------------
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
const ICONS  = ['📁','📚','🔬','⚡','🧠','🎯','💡','🔧','📐','🖥️','🔌','📡'];

const TYPE_OPTS = [
  { value: 'mcq_single', label: 'MCQ Single',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'mcq_multi',  label: 'MCQ Multi',    color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'true_false', label: 'True / False', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'fill_blank', label: 'Fill Blank',   color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'mixed',      label: 'Mixed',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const TYPE_COLOR = {
  mcq_single: 'bg-blue-50 text-blue-700 border-blue-200',
  mcq_multi:  'bg-cyan-50 text-cyan-700 border-cyan-200',
  true_false: 'bg-teal-50 text-teal-700 border-teal-200',
  fill_blank: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

// -- Folder create/edit modal -------------------------------------------------
function FolderModal({ folder, onClose, onSaved }) {
  const [name, setName]     = useState(folder?.name || '');
  const [desc, setDesc]     = useState(folder?.description || '');
  const [color, setColor]   = useState(folder?.color || '#6366f1');
  const [icon, setIcon]     = useState(folder?.icon || '📁');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Folder name is required.'); return; }
    setSaving(true); setError('');
    try {
      if (folder) {
        await engLabFolderApi.update(folder.id, { name, description: desc, color, icon });
      } else {
        await engLabFolderApi.create({ name, description: desc, color, icon });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving folder.');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={folder ? 'Edit Folder' : 'Create Folder'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Folder Name *</label>
          <input className="input" placeholder="e.g. Digital Electronics, Aptitude..."
            value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Description</label>
          <textarea className="input resize-none" rows={2}
            placeholder="What topics does this folder cover?"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button key={ic} type="button" onClick={() => setIcon(ic)}
                className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 transition-all ${
                  icon === ic ? 'border-brand bg-brand/5 scale-110' : 'border-line hover:border-brand/40'
                }`}>{ic}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-xl border-2 transition-all ${color === c ? 'border-ink scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: c }}>
                {color === c && <Check size={14} className="text-white mx-auto" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-line bg-surface-secondary">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="font-bold text-ink text-sm">{name || 'Folder Name'}</p>
            <p className="text-xs text-ink-muted">{desc || 'Description'}</p>
          </div>
          <span className="ml-auto w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm px-5 py-2">
            {saving ? 'Saving...' : folder ? 'Update' : 'Create Folder'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// -- Edit Bank modal ---------------------------------------------------------
function EditBankModal({ bank, onClose, onSaved }) {
  const [name, setName]     = useState(bank.name || '');
  const [desc, setDesc]     = useState(bank.description || '');
  const [type, setType]     = useState(bank.bank_type || 'mixed');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Bank name is required.'); return; }
    setSaving(true); setError('');
    try {
      await engLabBankApi.update(bank.id, { name, description: desc, bank_type: type });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating bank.');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit Bank">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Bank Name *</label>
          <input className="input" value={name} onChange={e=>setName(e.target.value)} required/>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Description</label>
          <textarea className="input resize-none" rows={2} value={desc} onChange={e=>setDesc(e.target.value)}/>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Question Type</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTS.map(t=>(
              <button key={t.value} type="button" onClick={()=>setType(t.value)}
                className={'px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all '+(type===t.value?'border-brand bg-brand/5 text-brand':'border-line text-ink-muted hover:border-brand/40')}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm px-5 py-2">{saving?'Saving...':'Update Bank'}</button>
        </div>
      </form>
    </Modal>
  );
}

// -- Create Bank modal --------------------------------------------------------
function CreateBankModal({ onClose, onCreated }) {
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [type, setType]     = useState('mixed');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Bank name is required.'); return; }
    setSaving(true); setError('');
    try {
      const res = await engLabBankApi.create({ name, description: desc, bank_type: type });
      onCreated(res.data.bank);
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating bank.');
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Create Objective Bank">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Bank Name *</label>
          <input className="input" placeholder="e.g. Digital Electronics MCQ Bank"
            value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Description</label>
          <textarea className="input resize-none" rows={2}
            placeholder="What topics does this bank cover?"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Question Type</label>
          <div className="flex flex-wrap gap-2">
            {TYPE_OPTS.map((t) => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                  type === t.value ? 'border-brand bg-brand/5 text-brand' : 'border-line text-ink-muted hover:border-brand/40'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm px-5 py-2">
            {saving ? 'Creating...' : 'Create Bank'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// -- Assign existing banks to folder modal ------------------------------------
function AssignBankModal({ folder, onClose, onSaved }) {
  const [allBanks, setAllBanks]         = useState([]);
  const [folderBankIds, setFolderBankIds] = useState(new Set());
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    Promise.all([engLabBankApi.list(), engLabFolderApi.get(folder.id)])
      .then(([banksRes, folderRes]) => {
        setAllBanks(banksRes.data.banks || []);
        setFolderBankIds(new Set((folderRes.data.banks || []).map((b) => b.id)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [folder.id]);

  const toggle = async (bank) => {
    setSaving(true);
    try {
      if (folderBankIds.has(bank.id)) {
        await engLabFolderApi.removeBank(folder.id, bank.id);
        setFolderBankIds((s) => { const n = new Set(s); n.delete(bank.id); return n; });
      } else {
        await engLabFolderApi.assignBank(folder.id, bank.id);
        setFolderBankIds((s) => new Set([...s, bank.id]));
      }
    } catch { /**/ } finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={() => { onSaved(); onClose(); }} title={`Assign Banks - ${folder.name}`} wide>
      <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
        {loading ? <div className="flex justify-center py-8"><Spinner /></div> : (
          allBanks.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">No banks available. Create a bank first.</p>
          ) : allBanks.map((bank) => {
            const assigned = folderBankIds.has(bank.id);
            return (
              <div key={bank.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                assigned ? 'border-brand bg-brand/5' : 'border-line hover:border-brand/30'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm truncate">{bank.name}</p>
                  <p className="text-xs text-ink-muted">{bank.question_count ?? 0} questions · {bank.bank_type}</p>
                </div>
                <button onClick={() => toggle(bank)} disabled={saving}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    assigned
                      ? 'bg-brand text-white hover:bg-red-500'
                      : 'border border-brand text-brand hover:bg-brand hover:text-white'
                  }`}>
                  {assigned ? 'Remove' : 'Add'}
                </button>
              </div>
            );
          })
        )}
      </div>
      <div className="flex justify-end pt-4 border-t border-line mt-2">
        <button onClick={() => { onSaved(); onClose(); }} className="btn-primary text-sm px-5 py-2">Done</button>
      </div>
    </Modal>
  );
}


// -- Folder List Page ---------------------------------------------------------
export default function EngLabFoldersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const base     = '/admin';
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);

  const load = () => {
    setLoading(true);
    engLabFolderApi.list().then(r => setFolders(r.data.folders || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async f => {
    if (!window.confirm('Delete folder "' + f.name + '"? Banks inside will be unlinked.')) return;
    await engLabFolderApi.remove(f.id).catch(() => {});
    load();
  };

  const totalBanks = folders.reduce((s,f) => s+(f.bank_count||0), 0);
  const totalQs    = folders.reduce((s,f) => s+(f.question_count||0), 0);

  return (
    <div className="animate-fade-in" style={{ fontFamily:'Inter,system-ui,sans-serif', display:'flex', flexDirection:'column', gap:24 }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0f0a1e 0%,#1a0f35 50%,#0f172a 100%)', borderRadius:24, padding:'28px 32px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:'rgba(99,102,241,0.12)' }}/>
        <div style={{ position:'absolute', bottom:-30, left:60, width:120, height:120, borderRadius:'50%', background:'rgba(139,92,246,0.08)' }}/>
        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 8px 24px rgba(99,102,241,0.4)' }}>
              <FolderOpen size={26} color="#fff"/>
            </div>
            <div>
              <h1 style={{ fontSize:24, fontWeight:900, color:'#fff', margin:'0 0 4px', letterSpacing:-0.5 }}>Objective Banks</h1>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', margin:0 }}>Organise MCQ, True/False, Fill Blank banks into folders</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ display:'flex', gap:10 }}>
              {[{label:'Folders',value:folders.length,color:'#a78bfa',bg:'rgba(167,139,250,0.15)',border:'rgba(167,139,250,0.3)'},{label:'Banks',value:totalBanks,color:'#60a5fa',bg:'rgba(96,165,250,0.15)',border:'rgba(96,165,250,0.3)'},{label:'Questions',value:totalQs,color:'#4ade80',bg:'rgba(74,222,128,0.15)',border:'rgba(74,222,128,0.3)'}].map(({label,value,color,bg,border})=>(
                <div key={label} style={{ padding:'10px 16px', background:bg, borderRadius:12, border:'1px solid '+border, textAlign:'center' }}>
                  <p style={{ fontSize:20, fontWeight:900, color, margin:0, lineHeight:1 }}>{value}</p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.45)', margin:'2px 0 0', textTransform:'uppercase', letterSpacing:0.8 }}>{label}</p>
                </div>
              ))}
            </div>
            {!isStudent && (
              <button onClick={() => setModal('create')}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'11px 20px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 4px 14px rgba(99,102,241,0.4)' }}>
                <Plus size={14}/> New Folder
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}><Spinner size="lg"/></div>
      ) : folders.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:20, padding:'60px 32px', textAlign:'center' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <FolderOpen size={32} color="#d1d5db"/>
          </div>
          <p style={{ fontSize:16, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>No folders yet</p>
          <p style={{ fontSize:13, color:'#9ca3af', margin:'0 0 20px' }}>Create a folder to start organising your Objective Banks</p>
          {!isStudent && (
            <button onClick={() => setModal('create')}
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'11px 22px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Plus size={14}/> Create Folder
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {folders.map(f => {
            const color = f.color || '#6366f1';
            return (
              <div key={f.id} style={{ background:'#fff', borderRadius:22, overflow:'hidden', border:'1.5px solid '+color+'30', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', transition:'all 0.2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.boxShadow='0 8px 40px '+color+'20'; e.currentTarget.style.borderColor=color+'60'; }}
                onMouseLeave={e=>{ e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor=color+'30'; }}>
                <div style={{ height:5, background:'linear-gradient(90deg,'+color+','+color+'88)' }}/>
                <div style={{ padding:'20px 24px', display:'flex', alignItems:'center', gap:16, borderBottom:'1px solid #f3f4f6' }}>
                  <div style={{ width:54, height:54, borderRadius:16, background:color+'18', border:'2px solid '+color+'35', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{f.icon||'📁'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:17, fontWeight:800, color:'#111827', margin:'0 0 5px' }}>{f.name}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      {f.description && <span style={{ fontSize:12, color:'#6b7280' }}>{f.description}</span>}
                      <span style={{ fontSize:11, fontWeight:700, color, background:color+'15', borderRadius:99, padding:'3px 10px', border:'1px solid '+color+'30' }}>{f.bank_count||0} banks</span>
                      <span style={{ fontSize:11, fontWeight:700, color:'#8b5cf6', background:'#f5f3ff', borderRadius:99, padding:'3px 10px', border:'1px solid #ddd6fe' }}>{f.question_count||0} questions</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    {!isStudent && (
                      <>
                        <button onClick={e=>{e.stopPropagation();setModal({type:'edit',folder:f});}}
                          style={{ width:32, height:32, borderRadius:9, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all 0.15s' }}
                          onMouseEnter={e=>{e.currentTarget.style.background='#eef2ff';e.currentTarget.style.color='#6366f1';}}
                          onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#6b7280';}}>
                          <Pencil size={13}/>
                        </button>
                        <button onClick={e=>{e.stopPropagation();handleDelete(f);}}
                          style={{ width:32, height:32, borderRadius:9, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all 0.15s' }}
                          onMouseEnter={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#dc2626';}}
                          onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#6b7280';}}>
                          <Trash2 size={13}/>
                        </button>
                      </>
                    )}
                    <button onClick={() => navigate(base+'/eng-lab-folders/'+f.id)}
                      style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:11, border:'none', background:'linear-gradient(135deg,'+color+','+color+'cc)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 4px 14px '+color+'40' }}>
                      Open <ChevronRight size={13}/>
                    </button>
                  </div>
                </div>
                <div style={{ padding:'14px 24px 18px', background:'#fafafe' }}>
                  {(f.bank_count||0)===0 ? (
                    <p style={{ textAlign:'center', color:'#9ca3af', fontSize:13, margin:'6px 0' }}>No banks yet - click Open to add banks</p>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:8 }}>
                      {Array.from({length:Math.min(f.bank_count||0,5)}).map((_,i)=>(
                        <div key={i} style={{ background:'#fff', border:'1.5px solid '+color+'25', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
                          <BookOpen size={14} color={color} style={{ flexShrink:0 }}/>
                          <span style={{ fontSize:12, color:'#374151', fontWeight:600 }}>Bank {i+1}</span>
                        </div>
                      ))}
                      {(f.bank_count||0)>5 && (
                        <button onClick={()=>navigate(base+'/eng-lab-folders/'+f.id)}
                          style={{ background:'#fff', border:'1.5px dashed #d1d5db', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#6b7280', fontSize:12, fontWeight:700 }}>
                          +{(f.bank_count||0)-5} more
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal==='create' && <FolderModal onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}}/>}
      {modal?.type==='edit' && <FolderModal folder={modal.folder} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);load();}}/>}
    </div>
  );
}

// -- Folder Detail Page - shows Objective Banks inline -----------------------
export function EngLabFolderDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const base      = '/admin';
  const { user }  = useAuth();
  const isStudent = user?.role === 'student';

  const [folder, setFolder]   = useState(null);
  const [banks, setBanks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch]   = useState('');
  const [editBank, setEditBank] = useState(null);

  const [activeBankId, setActiveBankId] = useState(null);
  const [bankDetail, setBankDetail]     = useState(null);
  const [questions, setQuestions]       = useState([]);
  const [qLoading, setQLoading]         = useState(false);
  const [expanded, setExpanded]         = useState(null);
  const [typeFilter, setTypeFilter]     = useState('');
  const [qSearch, setQSearch]           = useState('');

  const load = () => {
    setLoading(true);
    engLabFolderApi.get(id).then(r => { setFolder(r.data.folder); setBanks(r.data.banks || []); }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const openBank = bank => {
    if (activeBankId === bank.id) { setActiveBankId(null); setBankDetail(null); setQuestions([]); return; }
    setActiveBankId(bank.id);
    setQLoading(true);
    setExpanded(null); setTypeFilter(''); setQSearch('');
    engLabBankApi.get(bank.id).then(r => { setBankDetail(r.data.bank); setQuestions(r.data.questions || []); }).catch(() => {}).finally(() => setQLoading(false));
  };

  const handleSeed = async () => {
    if (!window.confirm('Seed 55 demo questions across 4 banks? Existing banks with same name will be skipped.')) return;
    setSeeding(true);
    try { const r = await engLabBankApi.seedDemo(); alert(r.data.message); load(); }
    catch(err) { alert(err.response?.data?.message || 'Seed failed'); }
    finally { setSeeding(false); }
  };

  const handleDeleteBank = async bank => {
    if (!window.confirm('Delete bank "' + bank.name + '"?')) return;
    await engLabBankApi.remove(bank.id).catch(() => {});
    if (activeBankId === bank.id) { setActiveBankId(null); setBankDetail(null); setQuestions([]); }
    load();
  };

  const handleDeleteQuestion = async q => {
    if (!window.confirm('Delete "' + q.title + '"?')) return;
    await engLabBankApi.deleteQuestion(activeBankId, q.id).catch(() => {});
    setQuestions(prev => prev.filter(x => x.id !== q.id));
  };

  const filteredQs = questions.filter(q => {
    if (typeFilter && q.type !== typeFilter) return false;
    if (qSearch && !q.title.toLowerCase().includes(qSearch.toLowerCase())) return false;
    return true;
  });

  const filteredBanks = banks.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  if (loading && !folder) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><Spinner size="lg"/></div>;

  const color = folder?.color || '#6366f1';
  const totalQ = banks.reduce((s,b) => s+(b.question_count||0), 0);

  return (
    <div className="animate-fade-in" style={{ fontFamily:'Inter,system-ui,sans-serif', display:'flex', flexDirection:'column', gap:24, paddingBottom:48 }}>

      {/* Hero */}
      <div style={{ background:'linear-gradient(135deg,#0f0a1e,#1a0f35,#0f172a)', borderRadius:24, padding:'24px 32px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-50, right:-50, width:180, height:180, borderRadius:'50%', background:color+'18' }}/>
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={() => navigate(base+'/eng-lab-folders')}
              style={{ width:40, height:40, borderRadius:12, border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <ChevronLeft size={18} color="#fff"/>
            </button>
            <div style={{ width:52, height:52, borderRadius:16, background:color+'30', border:'2px solid '+color+'50', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{folder?.icon||'📁'}</div>
            <div>
              <h1 style={{ fontSize:22, fontWeight:900, color:'#fff', margin:'0 0 4px' }}>{folder?.name}</h1>
              {folder?.description && <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', margin:0 }}>{folder.description}</p>}
            </div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ display:'flex', gap:10 }}>
              {[{label:'Banks',value:banks.length,c:'#a78bfa'},{label:'Questions',value:totalQ,c:'#4ade80'}].map(({label,value,c})=>(
                <div key={label} style={{ padding:'10px 16px', background:'rgba(255,255,255,0.07)', borderRadius:12, border:'1px solid rgba(255,255,255,0.1)', textAlign:'center' }}>
                  <p style={{ fontSize:20, fontWeight:900, color:c, margin:0, lineHeight:1 }}>{value}</p>
                  <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', margin:'2px 0 0', textTransform:'uppercase', letterSpacing:0.8 }}>{label}</p>
                </div>
              ))}
            </div>
            {!isStudent && (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleSeed} disabled={seeding}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                  <Database size={13}/> {seeding?'Seeding...':'Seed Demo'}
                </button>
                <button onClick={() => setModal({type:'assign',folder})}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:10, border:'1.5px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.08)', color:'#fff', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                  <Plus size={13}/> Assign Bank
                </button>
                <button onClick={() => setModal({type:'createBank'})}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 4px 14px rgba(99,102,241,0.4)' }}>
                  <Plus size={14}/> New Bank
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {banks.length > 3 && (
        <div style={{ position:'relative' }}>
          <Search size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search banks..."
            style={{ width:'100%', padding:'11px 14px 11px 42px', borderRadius:12, border:'1.5px solid #e5e7eb', background:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' }}/>
        </div>
      )}

      {/* Banks */}
      {filteredBanks.length === 0 ? (
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:20, padding:'60px 32px', textAlign:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <BookOpen size={28} color="#d1d5db"/>
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'#374151', margin:'0 0 6px' }}>No banks in this folder yet</p>
          {!isStudent && (
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:16 }}>
              <button onClick={() => setModal({type:'createBank'})}
                style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                <Plus size={14}/> New Bank
              </button>
              <button onClick={() => setModal({type:'assign',folder})}
                style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:11, border:'1.5px solid #6366f1', background:'#fff', color:'#6366f1', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                <Plus size={14}/> Assign Existing
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filteredBanks.map(bank => {
            const ti = TYPE_OPTS.find(t => t.value === bank.bank_type) || TYPE_OPTS[4];
            const isOpen = activeBankId === bank.id;
            return (
              <div key={bank.id} style={{ background:'#fff', borderRadius:20, border:'2px solid '+(isOpen?'#6366f1':'#e5e7eb'), overflow:'hidden', boxShadow:isOpen?'0 4px 20px rgba(99,102,241,0.12)':'0 2px 8px rgba(0,0,0,0.04)', transition:'all 0.2s' }}>
                {/* Bank header */}
                <div style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', cursor:'pointer', background:isOpen?'#f8f7ff':'#fff' }} onClick={() => openBank(bank)}>
                  <div style={{ width:44, height:44, borderRadius:13, background:isOpen?'#eef2ff':'#f9fafb', border:'1.5px solid '+(isOpen?'#c7d2fe':'#e5e7eb'), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <BookOpen size={20} color={isOpen?'#6366f1':'#9ca3af'}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <p style={{ fontSize:15, fontWeight:700, color:'#111827', margin:0 }}>{bank.name}</p>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99 }} className={ti.color}>{ti.label}</span>
                    </div>
                    {bank.description && <p style={{ fontSize:12, color:'#9ca3af', margin:'0 0 4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bank.description}</p>}
                    <span style={{ fontSize:11, fontWeight:600, color:'#6b7280', background:'#f9fafb', padding:'2px 8px', borderRadius:99, border:'1px solid #e5e7eb' }}>{bank.question_count||0} questions</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                    {isStudent && (bank.question_count||0)>0 && (
                      <button onClick={() => navigate('/student/eng-lab-banks/'+bank.id+'/test')}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                        <Send size={12}/> Take Test
                      </button>
                    )}
                    {!isStudent && (
                      <>
                        <button onClick={() => navigate(base+'/eng-lab-banks/'+bank.id+'/add-question')}
                          style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:9, border:'1.5px solid #6366f1', background:'#fff', color:'#6366f1', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                          <Plus size={12}/> Add Q
                        </button>
                        <button onClick={() => setEditBank(bank)}
                          style={{ width:30, height:30, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all 0.15s' }}
                          onMouseEnter={e=>{e.currentTarget.style.background='#eef2ff';e.currentTarget.style.color='#6366f1';e.currentTarget.style.borderColor='#c7d2fe';}}
                          onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#6b7280';e.currentTarget.style.borderColor='#e5e7eb';}}>
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => handleDeleteBank(bank)}
                          style={{ width:30, height:30, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all 0.15s' }}
                          onMouseEnter={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#dc2626';}}
                          onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#6b7280';}}>
                          <Trash2 size={13}/>
                        </button>
                      </>
                    )}
                    <button style={{ width:30, height:30, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280' }} onClick={() => openBank(bank)}>
                      {isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                  </div>
                </div>

                {/* Inline questions */}
                {isOpen && (
                  <div style={{ borderTop:'1px solid #e5e7eb', padding:'16px 20px', display:'flex', flexDirection:'column', gap:14, background:'#fafafe' }}>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                      <div style={{ position:'relative', flex:1, minWidth:200 }}>
                        <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}/>
                        <input value={qSearch} onChange={e=>setQSearch(e.target.value)} placeholder="Search questions..."
                          style={{ width:'100%', padding:'8px 12px 8px 30px', borderRadius:9, border:'1.5px solid #e5e7eb', fontSize:12, outline:'none', boxSizing:'border-box', background:'#fff' }}/>
                      </div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {[{value:'',label:'All'},...TYPE_OPTS.slice(0,4)].map(t=>(
                          <button key={t.value} onClick={()=>setTypeFilter(t.value)}
                            style={{ padding:'7px 12px', borderRadius:9, border:'1.5px solid '+(typeFilter===t.value?'#6366f1':'#e5e7eb'), background:typeFilter===t.value?'#6366f1':'#fff', color:typeFilter===t.value?'#fff':'#6b7280', fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {qLoading ? (
                      <div style={{ display:'flex', justifyContent:'center', padding:'32px 0' }}><Spinner/></div>
                    ) : filteredQs.length === 0 ? (
                      <div style={{ textAlign:'center', padding:'32px 0' }}>
                        <BookOpen size={28} color="#d1d5db" style={{ margin:'0 auto 10px', display:'block' }}/>
                        <p style={{ fontSize:14, fontWeight:600, color:'#374151', margin:'0 0 4px' }}>{questions.length===0?'No questions yet':'No questions match filter'}</p>
                        {questions.length===0 && !isStudent && (
                          <button onClick={() => navigate(base+'/eng-lab-banks/'+bank.id+'/add-question')}
                            style={{ marginTop:12, display:'inline-flex', alignItems:'center', gap:6, padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                            <Plus size={13}/> Add First Question
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {filteredQs.map((q,idx) => {
                          const qOpen = expanded === q.id;
                          const tc = TYPE_COLOR[q.type] || 'bg-gray-50 text-gray-700 border-gray-200';
                          const typeLabel = TYPE_OPTS.find(t=>t.value===q.type)?.label || q.type;
                          return (
                            <div key={q.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden', transition:'all 0.15s' }}>
                              <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px' }}>
                                <span style={{ fontSize:11, fontWeight:800, color:'#d1d5db', width:22, flexShrink:0, paddingTop:2 }}>{idx+1}</span>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <p style={{ fontSize:13, fontWeight:600, color:'#111827', margin:'0 0 6px', lineHeight:1.5 }}>{q.title}</p>
                                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99 }} className={tc}>{typeLabel}</span>
                                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:q.difficulty==='easy'?'#f0fdf4':q.difficulty==='hard'?'#fef2f2':'#fffbeb', color:q.difficulty==='easy'?'#16a34a':q.difficulty==='hard'?'#dc2626':'#d97706', textTransform:'capitalize' }}>{q.difficulty}</span>
                                    <span style={{ fontSize:10, color:'#9ca3af', background:'#f9fafb', padding:'2px 7px', borderRadius:99, border:'1px solid #e5e7eb' }}>{q.marks}m</span>
                                  </div>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                                  <button onClick={() => setExpanded(qOpen?null:q.id)}
                                    style={{ width:28, height:28, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280' }}>
                                    {qOpen?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
                                  </button>
                                  {!isStudent && (
                                    <>
                                      <button onClick={() => navigate(base+'/eng-lab-banks/'+bank.id+'/questions/'+q.id+'/edit')}
                                        style={{ width:28, height:28, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all 0.15s' }}
                                        onMouseEnter={e=>{e.currentTarget.style.background='#eef2ff';e.currentTarget.style.color='#6366f1';}}
                                        onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#6b7280';}}>
                                        <Pencil size={12}/>
                                      </button>
                                      <button onClick={() => handleDeleteQuestion(q)}
                                        style={{ width:28, height:28, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7280', transition:'all 0.15s' }}
                                        onMouseEnter={e=>{e.currentTarget.style.background='#fef2f2';e.currentTarget.style.color='#dc2626';}}
                                        onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#6b7280';}}>
                                        <Trash2 size={12}/>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {qOpen && (
                                <div style={{ borderTop:'1px solid #f3f4f6', padding:'12px 16px', background:'#fafafe', display:'flex', flexDirection:'column', gap:8 }}>
                                  {q.body && <div style={{ fontSize:13, color:'#374151', background:'#fff', padding:'10px 14px', borderRadius:10, border:'1px solid #e5e7eb', lineHeight:1.7 }} dangerouslySetInnerHTML={{__html:q.body}}/>}
                                  {q.options?.length>0 && q.type!=='fill_blank' && (
                                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:6 }}>
                                      {q.options.map((opt,oi)=>(
                                        <div key={oi} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, border:'1px solid '+(opt.is_correct?'#6ee7b7':'#e5e7eb'), background:opt.is_correct?'#ecfdf5':'#fff' }}>
                                          <span style={{ width:22, height:22, borderRadius:7, background:opt.is_correct?'#059669':'#f3f4f6', color:opt.is_correct?'#fff':'#9ca3af', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>{String.fromCharCode(65+oi)}</span>
                                          <span style={{ fontSize:12, color:opt.is_correct?'#065f46':'#374151', flex:1 }}>{opt.option_text}</span>
                                          {opt.is_correct && <Check size={12} color="#059669"/>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {q.type==='fill_blank' && (
                                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:10, background:'#eef2ff', border:'1px solid #c7d2fe' }}>
                                      <span style={{ fontSize:12, fontWeight:700, color:'#6366f1' }}>Answer:</span>
                                      <span style={{ fontSize:12, color:'#4338ca', fontFamily:'monospace' }}>{q.answer_text||q.options?.[0]?.option_text||'-'}</span>
                                    </div>
                                  )}
                                  {q.explanation && (
                                    <div style={{ padding:'8px 12px', borderRadius:10, background:'#eff6ff', border:'1px solid #bfdbfe', fontSize:12, color:'#1e40af', lineHeight:1.6 }}>
                                      <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal?.type==='assign' && modal.folder && <AssignBankModal folder={modal.folder} onClose={()=>setModal(null)} onSaved={load}/>}
      {modal?.type==='createBank' && (
        <CreateBankModal onClose={()=>setModal(null)} onCreated={async bank => { setModal(null); await engLabFolderApi.assignBank(id,bank.id).catch(()=>{}); load(); }}/>
      )}
      {editBank && <EditBankModal bank={editBank} onClose={()=>setEditBank(null)} onSaved={()=>{ setEditBank(null); load(); }}/>}
    </div>
  );
}
