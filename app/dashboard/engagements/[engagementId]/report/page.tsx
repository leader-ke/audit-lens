'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FileCheck2, Loader2, ArrowLeft, RefreshCw, CheckCircle2,
  AlertTriangle, Shield, XCircle, HelpCircle, Printer, ChevronRight,
} from 'lucide-react';
import { PrerequisiteGate } from '../prerequisite-gate';

const OPINION_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType; description: string }> = {
  unmodified: {
    label: 'Unmodified Opinion', color: '#059669', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle2,
    description: 'Clean opinion - financial statements give a true and fair view.',
  },
  qualified: {
    label: 'Qualified Opinion', color: '#d97706', bg: 'rgba(251,191,36,0.09)', icon: AlertTriangle,
    description: 'Except for specific matters, the financial statements give a true and fair view.',
  },
  adverse: {
    label: 'Adverse Opinion', color: '#dc2626', bg: 'rgba(239,68,68,0.08)', icon: XCircle,
    description: 'Financial statements do not give a true and fair view.',
  },
  disclaimer: {
    label: 'Disclaimer of Opinion', color: '#7c3aed', bg: 'rgba(139,92,246,0.08)', icon: HelpCircle,
    description: 'Insufficient evidence to form an opinion.',
  },
};

const SECTION_ORDER = [
  { key: 'addressee',                      label: 'Addressee'                       },
  { key: 'opinionParagraph',               label: 'Opinion'                         },
  { key: 'basisOfOpinion',                 label: 'Basis for Opinion'               },
  { key: 'emphasisOfMatter',               label: 'Emphasis of Matter'              },
  { key: 'goingConcernParagraph',          label: 'Going Concern'                   },
  { key: 'responsibilitiesOfManagement',   label: 'Responsibilities of Management'  },
  { key: 'auditorResponsibilities',        label: "Auditor's Responsibilities"       },
  { key: 'otherReportingResponsibilities', label: 'Other Reporting Responsibilities'},
] as const;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid rgba(148,163,184,0.2)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div className="px-5 py-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-slate-700 leading-[1.75] whitespace-pre-wrap max-w-prose">{children}</p>
      </div>
    </div>
  );
}

export default function AuditReportPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();

  const [report, setReport]       = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [tab, setTab]             = useState<'overview' | 'full'>('overview');
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
        const res = await fetch(`/api/engagements/${engagementId}/reports`);
        const data = await res.json();
        if (!data.report) return;
        setReport(data.report);
        if (data.report.generationStatus === 'done') {
          stopPolling(); setGenerating(false);
          toast.success('Audit report ready');
          setTab('overview');
        } else if (data.report.generationStatus === 'error') {
          stopPolling(); setGenerating(false);
          toast.error('Generation failed - please try again');
        }
      } catch { stopPolling(); setGenerating(false); }
    }, 2500);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadReport();
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

  async function loadReport() {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/reports`);
      const data = await res.json();
      setReport(data.report);
      if (data.report?.generationStatus === 'generating') {
        setGenerating(true);
        startPolling();
      }
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/reports`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Generation failed'); setGenerating(false); return; }
      setReport(data.report);
      startPolling();
    } catch { toast.error('Network error'); setGenerating(false); }
  }

  async function approve() {
    setApproving(true);
    try {
      const action = report.isDraft ? 'approve' : 'revert_to_draft';
      const res = await fetch(`/api/engagements/${engagementId}/reports`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      setReport(data.report);
      toast.success(action === 'approve' ? 'Report approved' : 'Reverted to draft');
    } catch { toast.error('Network error'); }
    finally { setApproving(false); }
  }

  const meta = report ? (OPINION_META[report.reportType] ?? OPINION_META.unmodified) : null;
  const kams: any[] = report?.keyAuditMatters ?? [];

  return (
    // Full-viewport column - header pinned, content scrolls
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Pinned header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 max-w-3xl mx-auto w-full px-7 pt-7 pb-4">

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <button
              onClick={() => router.push(`/dashboard/engagements/${engagementId}`)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3"
            >
              <ArrowLeft size={12} /> Back to engagement
            </button>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 size={20} className="text-blue-500" />
              Audit Report
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {report
                ? `Version ${report.version} · ${report.isDraft ? 'Draft' : 'Approved'} · Generated ${new Date(report.createdAt).toLocaleDateString('en-KE')}`
                : 'No report generated yet'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {report && (
              <>
                <button onClick={() => window.print()} className="btn-ghost" aria-label="Print / Save as PDF">
                  <Printer size={13} /> Print
                </button>
                <button onClick={approve} disabled={approving} className="btn-ghost">
                  {approving
                    ? <Loader2 size={13} className="animate-spin" />
                    : report.isDraft
                    ? <><Shield size={13} /> Approve</>
                    : <><CheckCircle2 size={13} className="text-emerald-500" /> Approved</>}
                </button>
              </>
            )}
            <button onClick={generate} disabled={generating} className="btn-primary">
              {generating
                ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                : report
                ? <><RefreshCw size={13} /> Regenerate</>
                : <><FileCheck2 size={13} /> Generate Report</>}
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
              <p className="font-medium text-blue-900 text-sm">Drafting audit report…</p>
              <p className="text-xs text-blue-500 mt-0.5">Reading working papers, determining opinion type, drafting ISA 700 paragraphs. 30–60 seconds.</p>
            </div>
          </div>
        )}

        {/* Opinion badge - only when report exists */}
        {report && meta && (
          <div
            className="rounded-2xl p-4 mb-4 flex items-center gap-4"
            style={{ background: meta.bg, border: `1px solid ${meta.color}22` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}18` }}>
              <meta.icon size={18} style={{ color: meta.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">{meta.label}</p>
              {report.opinionBasis && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{report.opinionBasis}</p>
              )}
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
              style={report.isDraft
                ? { background: 'rgba(251,191,36,0.12)', color: '#d97706' }
                : { background: 'rgba(16,185,129,0.12)', color: '#059669' }}
            >
              {report.isDraft ? 'Draft' : 'Approved'}
            </span>
          </div>
        )}

        {/* Tabs */}
        {report && (
          <div className="flex gap-1 border-b border-slate-200">
            {(['overview', 'full'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: tab === t ? '#2563eb' : '#64748b',
                  borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
                }}
              >
                {t === 'overview' ? 'Structured View' : 'Full Report'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-7 pb-8">

          {loading ? (
            <div className="space-y-3 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : !report ? (
            wpCount === 0 ? (
              <div className="mt-2">
                <PrerequisiteGate
                  title="Working papers required"
                  description="The audit report opinion is derived from risk findings across all working paper areas. The AI needs completed working papers to determine the appropriate opinion type."
                  steps={[
                    { label: 'Engagement created', done: true },
                    {
                      label: 'Trial balance uploaded and parsed',
                      done: hasTB === true,
                      action: hasTB ? undefined : { label: 'Upload TB', href: `/dashboard/engagements/${engagementId}` },
                    },
                    {
                      label: 'Working papers generated',
                      done: false,
                      action: hasTB ? { label: 'Go to Working Papers', href: `/dashboard/engagements/${engagementId}/working-papers` } : undefined,
                    },
                    { label: 'Audit report (ISA 700)', done: false },
                  ]}
                />
              </div>
            ) : (
            <div
              className="rounded-2xl p-14 text-center mt-2"
              style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
                <FileCheck2 size={24} className="text-blue-500" />
              </div>
              <p className="font-semibold text-slate-900 mb-1.5">No report generated yet</p>
              <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                Click &quot;Generate Report&quot; to draft the ISA 700 audit opinion based on your working papers.
              </p>
              <button onClick={generate} disabled={generating} className="btn-primary">
                {generating ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : 'Generate Report'}
              </button>
            </div>
            )

          ) : tab === 'overview' ? (
            <div className="space-y-2 pt-3">
              {SECTION_ORDER.map(({ key, label }) => {
                const value = (report as any)[key];
                if (!value) return null;
                return (
                  <SectionCard key={key} title={label}>
                    {value}
                  </SectionCard>
                );
              })}

              {kams.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(148,163,184,0.2)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Key Audit Matters</span>
                    <span className="text-xs text-slate-400">{kams.length} matter{kams.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {kams.map((kam, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{kam.wpReference}</span>
                          <p className="text-sm font-semibold text-slate-900">{kam.title}</p>
                        </div>
                        <p className="text-sm text-slate-600 mb-2 leading-relaxed max-w-prose">{kam.description}</p>
                        <div className="flex gap-1.5 items-start">
                          <ChevronRight size={12} className="text-blue-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-slate-500 leading-relaxed max-w-prose">
                            <span className="font-medium text-slate-700">Auditor response: </span>
                            {kam.auditResponse}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          ) : (
            // Full report - constrained reading column
            <div
              className="rounded-2xl p-8 mt-3 print:shadow-none print:rounded-none print:p-0"
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(148,163,184,0.2)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
            >
              <div
                className="mx-auto"
                style={{ maxWidth: '62ch' }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(report.fullReportContent || '') }}
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
