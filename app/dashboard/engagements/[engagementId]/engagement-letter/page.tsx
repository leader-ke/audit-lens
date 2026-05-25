'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  FileSignature, Loader2, ArrowLeft, RefreshCw, CheckCircle2,
  Printer, Zap,
} from 'lucide-react';

const SECTION_ORDER = [
  { key: 'introduction',                  label: 'Introduction'                          },
  { key: 'financialStatementsComponents', label: 'Financial Statements to be Audited'    },
  { key: 'scope',                         label: 'Scope of the Audit'                    },
  { key: 'managementResponsibilities',    label: 'Responsibilities of Management'        },
  { key: 'auditorResponsibilities',       label: 'Responsibilities of the Auditor'       },
  { key: 'limitationOfAuditRisk',         label: 'Inherent Limitations of an Audit'      },
  { key: 'reportingClause',               label: 'Form of Report'                        },
  { key: 'feesClause',                    label: 'Fees and Billing'                      },
  { key: 'independenceStatement',         label: 'Independence'                          },
  { key: 'confidentialityClause',         label: 'Confidentiality'                       },
  { key: 'liabilityClause',               label: 'Limitation of Liability'               },
  { key: 'governingLawClause',            label: 'Governing Law and Dispute Resolution'  },
  { key: 'otherMatters',                  label: 'Other Matters'                         },
  { key: 'acceptanceBlock',               label: 'Acceptance'                            },
] as const;

const cardStyle = {
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      <div className="px-5 py-3 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-slate-700 leading-[1.75] whitespace-pre-wrap max-w-prose">{children}</p>
      </div>
    </div>
  );
}

export default function EngagementLetterPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();

  const [letter, setLetter]           = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [finalising, setFinalising]   = useState(false);
  const [tab, setTab]                 = useState<'sections' | 'full'>('sections');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/engagements/${engagementId}/engagement-letter`);
        const data = await res.json();
        if (!data.letter) return;
        setLetter(data.letter);
        if (data.letter.generationStatus === 'done') {
          stopPolling(); setGenerating(false);
          toast.success('Engagement letter ready');
          setTab('sections');
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
    return () => stopPolling();
  }, [engagementId]);

  async function loadLetter() {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/engagement-letter`);
      const data = await res.json();
      setLetter(data.letter);
      // Resume polling if generation was in progress when user navigated away
      if (data.letter?.generationStatus === 'generating') {
        setGenerating(true);
        startPolling();
      }
    } catch { toast.error('Failed to load engagement letter'); }
    finally { setLoading(false); }
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/engagement-letter`, { method: 'POST' });
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
      const res = await fetch(`/api/engagements/${engagementId}/engagement-letter`, {
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

  return (
    // Full-viewport column - header pinned, content scrolls
    <div className="h-full flex flex-col overflow-hidden">

      {/* Pinned header */}
      <div className="shrink-0 max-w-3xl mx-auto w-full px-7 pt-7 pb-4">

        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <button
              onClick={() => router.push(`/dashboard/engagements/${engagementId}`)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3"
            >
              <ArrowLeft size={12} /> Back to engagement
            </button>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileSignature size={20} className="text-blue-500" />
              Engagement Letter
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {letter
                ? `v${letter.version} · ${letter.isDraft ? 'Draft' : 'Finalised'} · Generated ${new Date(letter.createdAt).toLocaleDateString('en-KE')}`
                : 'ISA 210 - terms of the audit engagement'}
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
              <p className="font-medium text-blue-900 text-sm">Drafting engagement letter…</p>
              <p className="text-xs text-blue-500 mt-0.5">Writing ISA 210 terms of engagement for this client. 30-45 seconds.</p>
            </div>
          </div>
        )}

        {/* Tabs - only when letter exists */}
        {letter && (
          <div className="flex gap-1 border-b border-slate-200">
            {(['sections', 'full'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-4 py-2.5 text-sm font-medium transition-colors"
                style={{
                  color: tab === t ? '#2563eb' : '#64748b',
                  borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent',
                }}
              >
                {t === 'sections' ? 'Sections' : 'Full Letter'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-7 pb-8">

          {loading ? (
            <div className="space-y-3 pt-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100/60 rounded-2xl animate-pulse" />
              ))}
            </div>

          ) : !letter ? (
            <div className="mt-2 space-y-4">
              {/* What this uses - no upload needed */}
              <div
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
              >
                <Zap size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-blue-900">No document upload required</p>
                  <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                    Generated from your engagement record: client name, entity type, audit type, financial year end, auditor firm name, and materiality. No trial balance or supporting files needed.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl p-14 text-center" style={cardStyle}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(59,130,246,0.08)' }}
                >
                  <FileSignature size={24} className="text-blue-500" />
                </div>
                <p className="font-semibold text-slate-900 mb-1.5">No engagement letter yet</p>
                <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
                  Generate an ISA 210 engagement letter confirming the terms of the audit with your client.
                </p>
                <button onClick={generate} disabled={generating} className="btn-primary">
                  {generating
                    ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                    : 'Generate Letter'}
                </button>
              </div>
            </div>

          ) : tab === 'sections' ? (
            <div className="space-y-2 pt-3">
              {SECTION_ORDER.map(({ key, label }) => {
                const value = (letter as any)[key];
                if (!value) return null;
                return (
                  <SectionCard key={key} title={label}>
                    {value}
                  </SectionCard>
                );
              })}
            </div>

          ) : (
            // Full letter - constrained reading column with serif font
            <div
              className="rounded-2xl p-8 mt-3 print:shadow-none print:rounded-none print:p-0"
              style={{
                ...cardStyle,
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}
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
