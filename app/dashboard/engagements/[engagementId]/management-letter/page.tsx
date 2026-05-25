'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Mail, Loader2, ArrowLeft, RefreshCw, CheckCircle2,
  Printer, Zap,
} from 'lucide-react';
import { PrerequisiteGate } from '../prerequisite-gate';

const PRIORITY_META = {
  high:   { label: 'Significant Deficiency', color: '#dc2626', bg: 'rgba(239,68,68,0.08)',  dot: '#dc2626' },
  medium: { label: 'Other Deficiency',       color: '#d97706', bg: 'rgba(251,191,36,0.09)', dot: '#d97706' },
  low:    { label: 'Best Practice',          color: '#6366f1', bg: 'rgba(99,102,241,0.08)', dot: '#6366f1' },
};

const cardStyle = {
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

function FindingCard({
  finding, index, onSaveResponse,
}: {
  finding: any;
  index: number;
  onSaveResponse: (index: number, response: string) => Promise<void>;
}) {
  const [editing, setEditing]   = useState(false);
  const [response, setResponse] = useState(finding.managementResponse || '');
  const [saving, setSaving]     = useState(false);
  const meta = PRIORITY_META[finding.priority as keyof typeof PRIORITY_META] ?? PRIORITY_META.medium;

  async function save() {
    setSaving(true);
    await onSaveResponse(index, response);
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.dot }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{finding.deficiency}</p>
            <p className="text-xs text-slate-400 mt-0.5">{finding.area} · {finding.wpReference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
          {finding.managementResponse && (
            <CheckCircle2 size={13} className="text-emerald-500" aria-label="Response recorded" />
          )}
        </div>
      </div>

      {/* Body - always visible */}
      <div className="px-4 pb-4 pt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.05)' }}>
            <p className="text-xs font-semibold text-slate-500 mb-1">Risk / Impact</p>
            <p className="text-sm text-slate-700">{finding.risk}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(248,250,252,0.8)' }}>
            <p className="text-xs font-semibold text-slate-500 mb-1">Root Cause</p>
            <p className="text-sm text-slate-700">{finding.rootCause}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'rgba(59,130,246,0.04)' }}>
            <p className="text-xs font-semibold text-slate-500 mb-1">Recommendation</p>
            <p className="text-sm text-slate-700">{finding.recommendation}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Management Response</p>
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={response}
                onChange={e => setResponse(e.target.value)}
                rows={3}
                className="input h-auto py-2 resize-none"
                placeholder="Enter management's response to this finding…"
              />
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="btn-primary" style={{ height: '32px', fontSize: '12px' }}>
                  {saving ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setResponse(finding.managementResponse || ''); }}
                  className="btn-ghost"
                  style={{ height: '32px', fontSize: '12px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-3 cursor-pointer hover:bg-slate-50 transition-colors"
              style={{ background: 'rgba(248,250,252,0.8)', border: '1px dashed rgba(148,163,184,0.3)' }}
              onClick={() => setEditing(true)}
            >
              {finding.managementResponse
                ? <p className="text-sm text-slate-700">{finding.managementResponse}</p>
                : <p className="text-sm text-slate-400 italic">Click to add management response…</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ManagementLetterPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();

  const [letter, setLetter]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [tab, setTab]             = useState<'findings' | 'full'>('findings');
  const [wpCount, setWpCount]     = useState<number | null>(null);
  const [hasTB, setHasTB]         = useState<boolean | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/engagements/${engagementId}/management-letter`);
        const data = await res.json();
        if (!data.letter) return;
        setLetter(data.letter);
        if (data.letter.generationStatus === 'done') {
          stopPolling(); setGenerating(false);
          toast.success('Management letter ready');
          setTab('findings');
        } else if (data.letter.generationStatus === 'error') {
          stopPolling(); setGenerating(false);
          toast.error('Generation failed - please try again');
        }
      } catch { stopPolling(); setGenerating(false); }
    }, 2500);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadLetter();
    fetch(`/api/engagements/${engagementId}`)
      .then(r => r.json())
      .then(d => {
        const eng = d.engagement;
        setWpCount((eng?.workingPapers ?? []).length);
        const files: any[] = eng?.files ?? [];
        setHasTB(files.some((f: any) => f.documentType === 'trial_balance' && f.processingStatus === 'done'));
      })
      .catch(() => { setWpCount(0); setHasTB(false); });
    return () => stopPolling();
  }, [engagementId]);

  async function loadLetter() {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/management-letter`);
      const data = await res.json();
      setLetter(data.letter);
      if (data.letter?.generationStatus === 'generating') {
        setGenerating(true);
        startPolling();
      }
    } catch { toast.error('Failed to load management letter'); }
    finally { setLoading(false); }
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/management-letter`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Generation failed'); setGenerating(false); return; }
      setLetter(data.letter);
      startPolling();
    } catch { toast.error('Network error'); setGenerating(false); }
  }

  async function finalise() {
    setFinalising(true);
    try {
      const action = letter.isDraft ? 'finalise' : 'revert_to_draft';
      const res = await fetch(`/api/engagements/${engagementId}/management-letter`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      setLetter(data.letter);
      toast.success(action === 'finalise' ? 'Letter finalised' : 'Reverted to draft');
    } catch { toast.error('Network error'); }
    finally { setFinalising(false); }
  }

  async function saveResponse(index: number, response: string) {
    const res = await fetch(`/api/engagements/${engagementId}/management-letter`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_response', findingIndex: index, response }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error('Failed to save response'); return; }
    setLetter(data.letter);
    toast.success('Response saved');
  }

  const findings: any[]  = letter?.findings ?? [];
  const highCount        = findings.filter(f => f.priority === 'high').length;
  const mediumCount      = findings.filter(f => f.priority === 'medium').length;
  const lowCount         = findings.filter(f => f.priority === 'low').length;
  const responsesGiven   = findings.filter(f => f.managementResponse).length;

  return (
    // Full-viewport column - header pinned, content scrolls
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Pinned header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 max-w-4xl mx-auto w-full px-7 pt-7 pb-4">

        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <button
              onClick={() => router.push(`/dashboard/engagements/${engagementId}`)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3"
            >
              <ArrowLeft size={12} /> Back to engagement
            </button>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Mail size={20} className="text-blue-500" />
              Management Letter
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {letter
                ? `${findings.length} findings · v${letter.version} · ${letter.isDraft ? 'Draft' : 'Finalised'} · ${responsesGiven}/${findings.length} responses`
                : 'ISA 265 - internal control recommendations'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {letter && (
              <>
                <button onClick={() => window.print()} className="btn-ghost">
                  <Printer size={13} /> Print
                </button>
                <button onClick={finalise} disabled={finalising} className="btn-ghost">
                  {finalising
                    ? <Loader2 size={13} className="animate-spin" />
                    : letter.isDraft
                    ? <><CheckCircle2 size={13} /> Finalise</>
                    : <><CheckCircle2 size={13} className="text-emerald-500" /> Finalised</>}
                </button>
              </>
            )}
            <button onClick={generate} disabled={generating} className="btn-primary">
              {generating
                ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                : letter
                ? <><RefreshCw size={13} /> Regenerate</>
                : <><Zap size={13} /> Generate Letter</>}
            </button>
          </div>
        </div>

        {/* Generating banner */}
        {generating && (
          <div
            className="mb-4 rounded-xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}
          >
            <Loader2 size={20} className="animate-spin text-blue-500 shrink-0" />
            <div>
              <p className="font-medium text-blue-900 text-sm">Drafting management letter…</p>
              <p className="text-xs text-blue-500 mt-0.5">Reading working papers, extracting control deficiencies, writing ISA 265 recommendations. 30–60 seconds.</p>
            </div>
          </div>
        )}

        {/* Summary stats + tabs - only when letter exists */}
        {letter && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Significant Deficiencies', value: highCount,   color: '#dc2626', bg: 'rgba(239,68,68,0.07)'    },
                { label: 'Other Deficiencies',       value: mediumCount, color: '#d97706', bg: 'rgba(251,191,36,0.08)'   },
                { label: 'Best Practice',            value: lowCount,    color: '#6366f1', bg: 'rgba(99,102,241,0.07)'   },
                { label: 'Responses Given',          value: `${responsesGiven}/${findings.length}`, color: '#059669', bg: 'rgba(16,185,129,0.07)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="rounded-2xl p-3 text-center" style={{ background: bg }}>
                  <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-1 border-b border-slate-200">
              {(['findings', 'full'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    color: tab === t ? '#2563eb' : '#64748b',
                    borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
                  }}
                >
                  {t === 'findings' ? `Findings (${findings.length})` : 'Full Letter'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-7 pb-8">

          {loading ? (
            <div className="space-y-3 pt-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100/60 rounded-2xl animate-pulse" />)}
            </div>

          ) : !letter ? (
            wpCount === 0 ? (
              <div className="mt-2">
                <PrerequisiteGate
                  title="Working papers required"
                  description="The management letter is compiled from internal control observations found across all audit areas. It cannot be generated until working papers exist."
                  steps={[
                    { label: 'Engagement created', done: true },
                    {
                      label: 'Trial balance uploaded and parsed',
                      done: hasTB === true,
                      action: hasTB ? undefined : { label: 'Upload TB', href: `/dashboard/engagements/${engagementId}` },
                    },
                    {
                      label: 'Working papers generated (at least 1 area)',
                      done: false,
                      action: hasTB ? { label: 'Go to Working Papers', href: `/dashboard/engagements/${engagementId}/working-papers` } : undefined,
                    },
                    { label: 'Management letter (ISA 265)', done: false },
                  ]}
                />
              </div>
            ) : (
            <div className="rounded-2xl p-14 text-center mt-2" style={cardStyle}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
                <Mail size={24} className="text-blue-500" />
              </div>
              <p className="font-semibold text-slate-900 mb-1.5">No management letter yet</p>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                Generate the ISA 265 management letter from your working paper observations.
              </p>
              <button onClick={generate} disabled={generating} className="btn-primary">
                {generating ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : 'Generate Letter'}
              </button>
            </div>
            )

          ) : tab === 'findings' ? (
            <div className="space-y-3 pt-3">
              {letter.introduction && (
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Introduction</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{letter.introduction}</p>
                </div>
              )}

              {['high', 'medium', 'low'].map(priority =>
                findings
                  .map((f, i) => ({ f, i }))
                  .filter(({ f }) => f.priority === priority)
                  .map(({ f, i }) => (
                    <FindingCard key={i} finding={f} index={i} onSaveResponse={saveResponse} />
                  ))
              )}

              {findings.length === 0 && (
                <div
                  className="rounded-2xl p-8 text-center"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
                >
                  <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-900">No reportable deficiencies identified</p>
                  <p className="text-sm text-slate-500 mt-1">No medium or high-risk observations were found across the working papers.</p>
                </div>
              )}

              {letter.conclusion && (
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Conclusion</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{letter.conclusion}</p>
                </div>
              )}
            </div>

          ) : (
            <div
              className="rounded-2xl p-8 mt-3 print:shadow-none"
              style={{ ...cardStyle, fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              <div
                className="mx-auto"
                style={{ maxWidth: '62ch' }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(letter.fullLetterContent || '') }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1rem;font-weight:700;margin:2rem 0 0.5rem;color:#0f172a;letter-spacing:-0.01em">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:0.9rem;font-weight:600;margin:1.4rem 0 0.3rem;color:#1e293b">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:2rem 0"/>')
    .replace(/\n\n/g, '</p><p style="margin:0.9rem 0;line-height:1.8;color:#334155">')
    .replace(/^/, '<p style="margin:0.9rem 0;line-height:1.8;color:#334155">')
    .replace(/$/, '</p>');
}
