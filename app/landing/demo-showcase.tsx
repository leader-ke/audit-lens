'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FileText, BarChart3, Mail, Receipt, Share2,
  ChevronDown, CheckCircle2, AlertTriangle, Circle,
  Pause, Play, Loader2, Link2, Copy,
} from 'lucide-react';

const TAB_DURATION = 6000;
const TICK_MS = 40;

// ─── Working Papers + Judgment Layer ──────────────────────────────────────────

function WorkingPapersMock() {
  type Judgment = 'accept' | 'modify' | 'reject';
  const [judgments, setJudgments] = useState<Record<number, Judgment>>({});
  const [modifyNote, setModifyNote] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);

  const observations = [
    { risk: 'high'   as const, text: 'Revenue spike Q3 - KES 8.1M (+41% QoQ). Cut-off procedures required around period end.', isa: 'ISA 240' },
    { risk: 'medium' as const, text: 'Related-party sales of KES 3.2M lack supporting contracts on file.', isa: 'ISA 550' },
    { risk: 'low'    as const, text: 'Revenue recognition policy not documented in the engagement file.', isa: 'ISA 315' },
  ];

  const riskStyle = {
    high:   { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.2)',   lbg: 'rgba(239,68,68,0.1)',  col: '#dc2626' },
    medium: { bg: 'rgba(251,191,36,0.07)',  border: 'rgba(251,191,36,0.22)', lbg: 'rgba(251,191,36,0.1)', col: '#d97706' },
    low:    { bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.18)',lbg: 'rgba(148,163,184,0.1)',col: '#64748b' },
  };

  const judgeStyle: Record<Judgment, { bg: string; color: string; border: string }> = {
    accept: { bg: 'rgba(16,185,129,0.1)',   color: '#059669', border: 'rgba(16,185,129,0.3)' },
    modify: { bg: 'rgba(37,99,235,0.1)',    color: '#2563eb', border: 'rgba(37,99,235,0.3)' },
    reject: { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', border: 'rgba(239,68,68,0.3)' },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-900">Revenue - WP-REV-001</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Savannah Holdings Ltd · FY 31 Dec 2024 · KES 24.5M</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: '#d97706' }}>
            AI draft
          </span>
          <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(148,163,184,0.1)', color: '#64748b' }}>
            {Object.keys(judgments).length}/3 reviewed
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {observations.map((o, i) => {
          const s = riskStyle[o.risk];
          const j = judgments[i];
          const js = j ? judgeStyle[j] : null;
          return (
            <div
              key={i}
              className="rounded-xl px-3 py-2.5 transition-all"
              style={js
                ? { background: js.bg, border: `1px solid ${js.border}` }
                : { background: s.bg, border: `1px solid ${s.border}` }}
            >
              <div className="flex items-start gap-2">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5" style={{ background: s.lbg, color: s.col }}>
                  {o.risk.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-700 leading-relaxed">{o.text}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(37,99,235,0.1)', color: '#1d4ed8' }}>{o.isa}</span>
                  </div>
                </div>
              </div>

              {/* Judgment buttons */}
              {!j ? (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[9px] text-slate-400 mr-0.5">Auditor:</span>
                  {(['accept', 'modify', 'reject'] as Judgment[]).map(act => (
                    <button
                      key={act}
                      onClick={() => {
                        if (act === 'modify') { setEditing(i); }
                        else setJudgments(jj => ({ ...jj, [i]: act }));
                      }}
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-lg cursor-pointer capitalize transition-all hover:opacity-80"
                      style={judgeStyle[act]}
                    >{act}</button>
                  ))}
                </div>
              ) : j === 'modify' && editing === i ? (
                <div className="mt-2 space-y-1.5">
                  <input
                    className="w-full text-[10px] rounded-lg px-2.5 py-1.5 outline-none"
                    style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(37,99,235,0.3)', color: '#1e293b' }}
                    placeholder="Auditor's revised note..."
                    value={modifyNote[i] ?? ''}
                    onChange={e => setModifyNote(n => ({ ...n, [i]: e.target.value }))}
                    autoFocus
                  />
                  <button
                    onClick={() => { setJudgments(jj => ({ ...jj, [i]: 'modify' })); setEditing(null); }}
                    className="text-[9px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer"
                    style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.25)' }}
                  >Save note</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  {j === 'accept' && <CheckCircle2 size={10} className="text-emerald-500 flex-shrink-0" />}
                  {j === 'modify' && <span className="text-[9px] text-blue-600 italic flex-1 truncate">{modifyNote[i] || 'Modified'}</span>}
                  {j === 'reject' && <span className="text-[9px] text-red-500 line-through truncate">{o.text.slice(0, 38)}...</span>}
                  <span className="text-[9px] font-semibold capitalize ml-auto flex-shrink-0" style={{ color: judgeStyle[j].color }}>{j}ed</span>
                  <button onClick={() => setJudgments(jj => { const n = { ...jj }; delete n[i]; return n; })} className="text-[8px] text-slate-300 hover:text-slate-500 cursor-pointer">undo</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── iTax Reconciliation ───────────────────────────────────────────────────────

function ItaxMock() {
  const [expanded, setExpanded] = useState<string | null>('vat');

  const sections = [
    {
      id: 'vat',
      title: 'Value Added Tax (VAT)',
      icon: <Receipt size={10} style={{ color: '#3b82f6' }} />,
      accentBg: 'rgba(59,130,246,0.08)',
      riskColor: '#d97706',
      riskBg: 'rgba(251,191,36,0.12)',
      riskLabel: 'Analytical gap',
      rows: [
        { l: 'Revenue base (unflagged lines)', v: 'KES 24,500,000' },
        { l: 'Theoretical output VAT (16%)',   v: 'KES 3,920,000', accent: true },
        { l: 'VAT payable per TB',              v: 'KES 2,960,000' },
      ],
      diff: 'Gap: KES 960,000',
      diffColor: '#d97706',
      obs: 'VAT base cannot be confirmed from revenue accounts alone. Requires client VAT schedule and VAT 3 returns reconciliation.',
    },
    {
      id: 'paye',
      title: 'PAYE',
      icon: <Receipt size={10} style={{ color: '#8b5cf6' }} />,
      accentBg: 'rgba(139,92,246,0.08)',
      riskColor: '#dc2626',
      riskBg: 'rgba(239,68,68,0.1)',
      riskLabel: 'Structural gap',
      rows: [
        { l: 'Classified payroll area', v: 'KES 0' },
        { l: 'Direct Labour (unclassified)', v: 'KES 4,200,000', accent: true },
        { l: 'PAYE payable per TB',          v: 'KES 840,000' },
      ],
      diff: 'PAYE base: not derivable',
      diffColor: '#dc2626',
      obs: 'Direct Labour may include contract workers not subject to PAYE. Obtain payroll register - distinguish employed vs contracted before assessing PAYE exposure.',
    },
    {
      id: 'corp',
      title: 'Corporate Tax (30%)',
      icon: <Receipt size={10} style={{ color: '#059669' }} />,
      accentBg: 'rgba(16,185,129,0.08)',
      riskColor: '#059669',
      riskBg: 'rgba(16,185,129,0.1)',
      riskLabel: 'Broadly consistent',
      rows: [
        { l: 'Pre-tax profit (per TB)',         v: 'KES 3,800,000' },
        { l: 'Statutory estimate (30% PBT)',    v: 'KES 1,140,000', accent: true },
        { l: 'Income Tax Expense per TB',       v: 'KES 1,090,000' },
      ],
      diff: 'Gap: KES 50,000 (4.4%)',
      diffColor: '#059669',
      obs: 'TB tax account identified: Income Tax Expense KES 1,090,000. Analytical cross-check only - full tax computation required to reconcile deferred tax and capital allowances.',
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-900">KRA iTax Reconciliation</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Savannah Holdings Ltd · Tax Year 2024 · Analytical indicators only</p>
        </div>
        <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.12)', color: '#d97706' }}>
          Medium risk
        </span>
      </div>

      {sections.map(sec => (
        <div key={sec.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.18)' }}>
          <button
            onClick={() => setExpanded(expanded === sec.id ? null : sec.id)}
            className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-left"
            style={{ background: sec.accentBg }}
          >
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)' }}>
              {sec.icon}
            </div>
            <span className="text-[10px] font-semibold text-slate-800 flex-1">{sec.title}</span>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: sec.riskBg, color: sec.riskColor }}>
              {sec.riskLabel}
            </span>
            <ChevronDown size={11} className="text-slate-400 transition-transform flex-shrink-0" style={{ transform: expanded === sec.id ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>

          {expanded === sec.id && (
            <div className="px-3 pb-3 pt-2 space-y-2" style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}>
              {sec.rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{r.l}</span>
                  <span className="text-[10px] font-semibold font-mono" style={{ color: r.accent ? sec.riskColor : '#1e293b' }}>{r.v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg mt-1" style={{ background: `${sec.riskBg}`, border: `1px solid ${sec.riskColor}22` }}>
                <span className="text-[9px] font-semibold" style={{ color: sec.riskColor }}>{sec.diff}</span>
              </div>
              <div className="flex items-start gap-1.5 mt-1">
                <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" style={{ color: '#d97706' }} />
                <p className="text-[9px] text-slate-500 leading-relaxed">{sec.obs}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Audit Report ──────────────────────────────────────────────────────────────

function AuditReportMock() {
  const [opinion, setOpinion] = useState<'unmodified' | 'qualified' | 'adverse'>('unmodified');

  const options = [
    { id: 'unmodified' as const, label: 'Unmodified', color: '#059669', bg: 'rgba(16,185,129,0.1)' },
    { id: 'qualified'  as const, label: 'Qualified',  color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    { id: 'adverse'    as const, label: 'Adverse',    color: '#dc2626', bg: 'rgba(239,68,68,0.1)' },
  ];

  const text = {
    unmodified: 'In our opinion, the financial statements present fairly, in all material respects, the financial position of Savannah Holdings Ltd as at 31 December 2024 in accordance with IFRS.',
    qualified:  'Except for the effects of the matter described in the Basis for Qualified Opinion section, the financial statements present fairly, in all material respects, the financial position of Savannah Holdings Ltd...',
    adverse:    'In our opinion, because of the significance of the matter described in the Basis for Adverse Opinion section, the financial statements do not present fairly the financial position of Savannah Holdings Ltd...',
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-slate-900">Independent Auditor&apos;s Report</p>
        <p className="text-[10px] text-slate-400 mt-0.5">Select opinion type to preview the paragraph</p>
      </div>
      <div className="flex gap-1.5">
        {options.map(o => (
          <button
            key={o.id}
            onClick={() => setOpinion(o.id)}
            className="flex-1 text-[9px] font-semibold py-1.5 rounded-lg transition-all cursor-pointer"
            style={opinion === o.id
              ? { background: o.bg, color: o.color, border: `1.5px solid ${o.color}44` }
              : { background: 'rgba(248,250,252,0.9)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.18)' }}
          >{o.label}</button>
        ))}
      </div>
      <div className="rounded-xl p-3" style={{ background: 'rgba(248,250,252,0.7)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Opinion Paragraph</p>
        <p className="text-[10px] text-slate-700 leading-relaxed">{text[opinion]}</p>
      </div>
      {[
        { title: 'Basis for Opinion', body: "We conducted our audit in accordance with International Standards on Auditing (ISAs). Our responsibilities under ISA 700 are described in the Auditor's Responsibilities section." },
        { title: 'Key Audit Matter - Revenue Recognition', body: 'Revenue of KES 24.5M. Cut-off testing performed over KES 500K transactions within 15 days of year-end. No material misstatement identified.' },
      ].map(s => (
        <div key={s.title} className="rounded-xl p-2.5" style={{ border: '1px solid rgba(148,163,184,0.15)', background: 'rgba(248,250,252,0.5)' }}>
          <p className="text-[9px] font-semibold text-slate-500 mb-1">{s.title}</p>
          <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-2">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Management Letter ─────────────────────────────────────────────────────────

function MgmtLetterMock() {
  const [responded, setResponded] = useState<number[]>([]);
  const [loading, setLoading] = useState<number | null>(null);

  const findings = [
    { priority: 'high' as const, tag: 'STRUCTURAL', area: 'Payroll', deficiency: 'No segregation of duties between payroll preparation and approval.', rec: 'Implement dual authorisation for all payroll runs above KES 100,000.' },
    { priority: 'medium' as const, tag: 'RECURRING', area: 'Cash & Bank', deficiency: 'Bank reconciliations not reviewed by a second officer (3 of 12 months).', rec: 'Finance Manager to sign off within 5 working days of month-end.' },
  ];

  const s = {
    high:   { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.2)',  lbg: 'rgba(239,68,68,0.1)',  col: '#dc2626' },
    medium: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.22)',lbg: 'rgba(251,191,36,0.1)', col: '#d97706' },
  };

  function addResponse(i: number) {
    setLoading(i);
    setTimeout(() => { setResponded(r => [...r, i]); setLoading(null); }, 850);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-900">Management Letter (ISA 265) - 2 findings</p>
      {findings.map((f, i) => {
        const c = s[f.priority];
        return (
          <div key={i} className="rounded-xl p-3 space-y-2" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.lbg, color: c.col }}>{f.priority.toUpperCase()}</span>
              <span className="text-[9px] font-mono text-slate-400">[{f.tag}]</span>
              <span className="text-[10px] font-semibold text-slate-800">{f.area}</span>
            </div>
            <p className="text-[10px] text-slate-700 leading-relaxed">{f.deficiency}</p>
            <p className="text-[9px] text-slate-500 italic">Rec: {f.rec}</p>
            {responded.includes(i) ? (
              <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p className="text-[9px] font-semibold text-emerald-700 mb-0.5">Management response</p>
                <p className="text-[9px] text-emerald-800">Noted. Controls will be updated by Q2 2025. HR has been informed.</p>
              </div>
            ) : (
              <button
                onClick={() => addResponse(i)}
                disabled={loading === i}
                className="flex items-center gap-1.5 text-[9px] font-semibold px-2 py-1 rounded-lg transition-all cursor-pointer"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.15)' }}
              >
                {loading === i ? <><Loader2 size={8} className="animate-spin" />Submitting...</> : '+ Add management response'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Client Portal ─────────────────────────────────────────────────────────────

function ClientPortalMock() {
  const [copied, setCopied] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, 'pending' | 'received' | 'not_available'>>({});

  const requests = [
    { title: 'Trial Balance - FY 31 Dec 2024', type: 'Trial Balance', required: true,  initStatus: 'received'  as const },
    { title: 'Bank Statements - all accounts', type: 'Bank Statements', required: true, initStatus: 'received'  as const },
    { title: 'Payroll Register - full year',   type: 'Payroll',        required: true,  initStatus: 'pending'   as const },
    { title: 'Board minutes - 3 meetings',     type: 'Board Minutes',  required: false, initStatus: 'pending'   as const },
    { title: 'Fixed Asset Register',           type: 'FAR',            required: false, initStatus: 'not_available' as const },
  ];

  const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
    received:      { label: 'Received',      color: '#059669', bg: 'rgba(16,185,129,0.12)' },
    pending:       { label: 'Pending',        color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
    not_available: { label: 'Not available', color: '#64748b', bg: 'rgba(148,163,184,0.12)' },
  };

  const cycle: Array<'pending' | 'received' | 'not_available'> = ['pending', 'received', 'not_available'];

  function copyLink() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const received = requests.filter((r, i) => (statuses[i] ?? r.initStatus) === 'received').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-900">Client Portal</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{received}/{requests.length} documents received</p>
        </div>
        <div className="w-full max-w-[120px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(received / requests.length) * 100}%` }} />
        </div>
      </div>

      {/* Portal link */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
      >
        <Link2 size={10} className="text-blue-500 flex-shrink-0" />
        <span className="text-[9px] font-mono text-slate-400 flex-1 truncate">auditlens.co.ke/portal/••••••••••••</span>
        <button
          onClick={copyLink}
          className="flex items-center gap-1 text-[9px] font-semibold flex-shrink-0 cursor-pointer transition-colors"
          style={{ color: copied ? '#059669' : '#2563eb' }}
        >
          {copied ? <><CheckCircle2 size={9} />Copied</> : <><Copy size={9} />Copy link</>}
        </button>
      </div>

      {/* Document requests */}
      <div className="space-y-1.5">
        {requests.map((r, i) => {
          const cur = statuses[i] ?? r.initStatus;
          const meta = statusMeta[cur];
          return (
            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(148,163,184,0.15)' }}>
              {cur === 'received'
                ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                : <Circle size={11} className="text-slate-300 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-700 font-medium truncate">{r.title}</p>
                <p className="text-[8px] text-slate-400">{r.type}{r.required ? ' · Required' : ''}</p>
              </div>
              <button
                onClick={() => {
                  const idx = cycle.indexOf(cur);
                  setStatuses(s => ({ ...s, [i]: cycle[(idx + 1) % cycle.length] }));
                }}
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                style={{ background: meta.bg, color: meta.color }}
              >{meta.label}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Showcase shell ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'working-papers', label: 'Working Papers', icon: FileText  },
  { id: 'itax',           label: 'KRA iTax',       icon: Receipt   },
  { id: 'audit-report',   label: 'Audit Report',   icon: BarChart3 },
  { id: 'mgmt-letter',    label: 'Mgmt Letter',    icon: Mail      },
  { id: 'portal',         label: 'Client Portal',  icon: Share2    },
];

function Panel({ id }: { id: string }) {
  if (id === 'working-papers') return <WorkingPapersMock />;
  if (id === 'itax')           return <ItaxMock />;
  if (id === 'audit-report')   return <AuditReportMock />;
  if (id === 'mgmt-letter')    return <MgmtLetterMock />;
  if (id === 'portal')         return <ClientPortalMock />;
  return null;
}

export function DemoShowcase() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const next = progressRef.current + (TICK_MS / TAB_DURATION) * 100;
      if (next >= 100) {
        setActiveIdx(i => (i + 1) % TABS.length);
        setProgress(0);
      } else {
        setProgress(next);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [paused]);

  function jumpTo(idx: number) {
    setActiveIdx(idx);
    setProgress(0);
  }

  const activeId = TABS[activeIdx].id;

  return (
    <section className="py-20" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
      <div className="max-w-5xl mx-auto px-5">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">A complete audit file, in minutes</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">
            Every tool in one workflow - from trial balance to signed-off working papers, KRA iTax reconciliation, management letter, and audit report.
          </p>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1px solid rgba(148,163,184,0.22)',
            boxShadow: '0 24px 64px rgba(37,99,235,0.1), 0 6px 20px rgba(0,0,0,0.07)',
          }}
        >
          {/* Browser bar */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#f1f5f9', borderBottom: '1px solid rgba(148,163,184,0.2)' }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ background: '#f87171' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#fbbf24' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#34d399' }} />
            </div>
            <div
              className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 text-[10px] text-slate-400"
              style={{ border: '1px solid rgba(148,163,184,0.2)', flex: '0 0 auto', maxWidth: 360 }}
            >
              <span className="text-slate-300 text-[9px]">https://</span>
              auditlens.co.ke/dashboard/engagements/ENG-2024-001
            </div>
            <div className="ml-auto">
              <button
                onClick={() => setPaused(p => !p)}
                className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                style={{
                  background: paused ? 'rgba(37,99,235,0.08)' : 'rgba(148,163,184,0.1)',
                  color: paused ? '#2563eb' : '#64748b',
                  border: paused ? '1px solid rgba(37,99,235,0.2)' : '1px solid rgba(148,163,184,0.2)',
                }}
              >
                {paused ? <><Play size={10} />Play</> : <><Pause size={10} />Pause</>}
              </button>
            </div>
          </div>

          {/* App layout */}
          <div className="flex" style={{ background: '#fff', minHeight: 460 }}>

            {/* Mini sidebar */}
            <div className="w-10 flex-shrink-0 flex flex-col items-center gap-3 py-4" style={{ background: '#f8fafc', borderRight: '1px solid rgba(148,163,184,0.1)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-[8px]" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>AL</div>
              {[FileText, BarChart3, Receipt, Share2].map((Icon, i) => (
                <div key={i} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: i === 0 ? 'rgba(37,99,235,0.1)' : 'transparent' }}>
                  <Icon size={12} style={{ color: i === 0 ? '#2563eb' : '#cbd5e1' }} />
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">

              {/* Tab bar */}
              <div className="flex items-stretch overflow-x-auto" style={{ borderBottom: '1px solid rgba(148,163,184,0.12)', background: '#fafafa' }}>
                {TABS.map((t, i) => {
                  const on = activeIdx === i;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => jumpTo(i)}
                      className="relative flex items-center gap-1.5 px-3.5 py-2.5 whitespace-nowrap cursor-pointer select-none transition-colors flex-shrink-0"
                      style={{
                        fontSize: 10,
                        fontWeight: on ? 600 : 500,
                        color: on ? '#2563eb' : '#94a3b8',
                        background: on ? 'rgba(37,99,235,0.04)' : 'transparent',
                      }}
                    >
                      <Icon size={10} />
                      {t.label}
                      {on && (
                        <>
                          <span
                            className="absolute bottom-0 left-0 h-0.5 rounded-full"
                            style={{
                              width: `${progress}%`,
                              background: '#2563eb',
                              transition: `width ${TICK_MS}ms linear`,
                            }}
                          />
                          <span className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'rgba(37,99,235,0.1)' }} />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Panel */}
              <div key={activeIdx} className="flex-1 p-4 overflow-auto">
                <Panel id={activeId} />
              </div>
            </div>
          </div>
        </div>

        {/* Proof chips */}
        <div className="flex flex-wrap justify-center gap-2.5 mt-8">
          {[
            { text: 'ISA-compliant output',          color: '#059669' },
            { text: 'Per-finding auditor judgment',  color: '#2563eb' },
            { text: '14 audit areas covered',         color: '#7c3aed' },
            { text: 'KRA VAT - PAYE - Corp Tax',      color: '#db2777' },
            { text: 'Kenya statutory deadlines',      color: '#d97706' },
          ].map(({ text, color }) => (
            <span key={text} className="text-[10px] font-medium text-slate-500 px-3 py-1.5 rounded-full" style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: color }} />
              {text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
