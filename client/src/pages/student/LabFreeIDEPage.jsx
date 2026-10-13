import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import WaveformViewer from '../../components/WaveformViewer';
import { labApi } from '../../lib/labApi';
import nuroLogo from '/SilicpnLogo.jpeg';

const LANGS = [
  { value: 'verilog',       label: 'Verilog',      monaco: 'verilog' },
  { value: 'vhdl',          label: 'VHDL',         monaco: 'verilog' },
  { value: 'systemverilog', label: 'SystemVerilog', monaco: 'verilog' },
  { value: 'c',             label: 'C',            monaco: 'c'       },
  { value: 'cpp',           label: 'C++',          monaco: 'cpp'     },
  { value: 'python',        label: 'Python',       monaco: 'python'  },
  { value: 'java',          label: 'Java',         monaco: 'java'    },
  { value: 'embedded_c',    label: 'Embedded C',   monaco: 'c'       },
  { value: 'sql',           label: 'MySQL/SQL',    monaco: 'sql'     },
];

const STARTERS = {
  verilog: `module my_module;\n  initial begin\n    $display("Hello from Verilog!");\n    $finish;\n  end\nendmodule`,
  vhdl: `library IEEE;\nuse IEEE.STD_LOGIC_1164.ALL;\nentity my_entity is\nend my_entity;\narchitecture Behavioral of my_entity is\nbegin\n  process\n  begin\n    report "Hello from VHDL!";\n    wait;\n  end process;\nend Behavioral;`,
  systemverilog: `module my_module;\n  initial begin\n    $display("Hello from SystemVerilog!");\n    $finish;\n  end\nendmodule`,
  c: `#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
  cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}`,
  python: `print("Hello, World!")`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
  embedded_c: `#include <stdio.h>\nint main(void) {\n    printf("Hello from Embedded C!\\n");\n    return 0;\n}`,
  sql: `-- Write your SQL here\nCREATE TABLE students (id INT, name VARCHAR(50));\nINSERT INTO students VALUES (1,'Alice'),(2,'Bob');\nSELECT name FROM students ORDER BY id;`,
};

const HDL = ['verilog', 'vhdl', 'systemverilog'];

export default function LabFreeIDEPage() {
  const navigate = useNavigate();
  const [lang, setLang]       = useState('python');
  const [code, setCode]       = useState(STARTERS['python']);
  const [stdin, setStdin]     = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult]   = useState(null);
  const [outTab, setOutTab]   = useState('output');

  const handleLangChange = newLang => {
    setLang(newLang);
    setCode(STARTERS[newLang] || '');
    setResult(null);
  };

  const handleRun = async () => {
    if (running) return;
    setRunning(true); setResult(null);
    try {
      const r = await labApi.runFree(lang, code, stdin);
      setResult(r.data);
      if (r.data.waveform_vcd) setOutTab('waveform');
      else setOutTab('output');
    } catch (err) {
      setResult({ compile_error: err.response?.data?.message || 'Failed to run', stdout: '', stderr: '' });
    } finally { setRunning(false); }
  };

  const monacoLang = LANGS.find(l => l.value === lang)?.monaco || 'plaintext';
  const isHDL = HDL.includes(lang);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0D0D14', color: '#E0E0F0', overflow: 'hidden' }}>

      {/* Top bar - uses design tokens for brand consistency */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', background: '#0D0D14', borderBottom: '1px solid #1E1E2E', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/student/lab')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
        >
          <ArrowLeft size={14} /> Lab
        </button>
        <div style={{ width: 1, height: 16, background: '#1E1E2E' }} />
        <img src={nuroLogo} alt="NuroSilicon" style={{ height: 20, width: 20, objectFit: 'cover', borderRadius: 4, border: '1px solid #1E1E2E' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#E0E0F0' }}>Free IDE</span>
        <div style={{ flex: 1 }} />

        {/* Status */}
        {running && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#F59E0B' }}>
            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Running...
          </span>
        )}
        {!running && result && !result.compile_error && (
          <span style={{ fontSize: 12, color: '#00D4AA' }}>✓ Done · {result.runtime_ms}ms</span>
        )}
        {!running && result?.compile_error && (
          <span style={{ fontSize: 12, color: '#F87171' }}>✗ Error</span>
        )}

        {/* Language selector */}
        <select
          value={lang}
          onChange={e => handleLangChange(e.target.value)}
          style={{ background: '#161B22', border: '1px solid #30363D', color: '#E0E0F0', fontSize: 12, padding: '5px 10px', borderRadius: 6, outline: 'none', cursor: 'pointer' }}
        >
          {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={running}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: 'none', background: running ? '#1E2D3D' : '#0A6CFF', color: '#fff', fontSize: 13, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1 }}
        >
          {running ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={13} fill="currentColor" />}
          Run
        </button>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={v => setCode(v || '')}
          theme="vs-dark"
          options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on', fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace', padding: { top: 12 } }}
        />
      </div>

      {/* Bottom panel */}
      <div style={{ height: 200, flexShrink: 0, borderTop: '1px solid #1E1E2E', display: 'flex', flexDirection: 'column', background: '#0A0E1A' }}>
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #1E1E2E', flexShrink: 0 }}>
          {['output', isHDL ? 'waveform' : null].filter(Boolean).map(t => (
            <button key={t} onClick={() => setOutTab(t)}
              style={{ padding: '7px 14px', border: 'none', background: 'none', fontSize: 12, fontWeight: 500, color: outTab === t ? '#0A6CFF' : '#8B949E', borderBottom: `2px solid ${outTab === t ? '#0A6CFF' : 'transparent'}`, cursor: 'pointer', textTransform: 'capitalize' }}>
              {t}
            </button>
          ))}
          {!isHDL && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', padding: '0 12px' }}>
              <span style={{ fontSize: 11, color: '#8B949E' }}>stdin:</span>
              <input
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                placeholder="Optional input..."
                style={{ background: '#161B22', border: '1px solid #30363D', color: '#E0E0F0', fontSize: 12, padding: '4px 8px', borderRadius: 5, outline: 'none', width: 180 }}
              />
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {outTab === 'output' && (
            <div>
              {result?.compile_error && (
                <pre style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#F87171', background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 6, padding: '8px 10px', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{result.compile_error}</pre>
              )}
              {result?.stderr && !result.compile_error && (
                <pre style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#F59E0B', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{result.stderr}</pre>
              )}
              <pre style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#C9D1D9', whiteSpace: 'pre-wrap' }}>
                {result?.stdout || (running ? 'Running...' : 'Click Run to execute your code')}
              </pre>
            </div>
          )}
          {outTab === 'waveform' && (
            <div>
              {!result?.waveform_vcd && !running && (
                <p style={{ fontSize: 12, color: '#8B949E', textAlign: 'center', padding: '16px 0' }}>
                  Add <code style={{ background: '#161B22', padding: '1px 5px', borderRadius: 3 }}>$dumpfile</code> and <code style={{ background: '#161B22', padding: '1px 5px', borderRadius: 3 }}>$dumpvars</code> to see waveform
                </p>
              )}
              {result?.waveform_vcd && <WaveformViewer vcdText={result.waveform_vcd} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
