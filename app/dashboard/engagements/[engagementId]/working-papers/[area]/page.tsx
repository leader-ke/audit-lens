'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AUDIT_AREAS } from '@/lib/audit/isa-standards';
import type { AuditArea } from '@/lib/audit/isa-standards';

const AREA_ORDER: AuditArea[] = [
  'revenue', 'expenses', 'receivables', 'payables', 'cash_and_bank',
  'fixed_assets', 'payroll', 'tax', 'equity', 'provisions_and_liabilities',
  'inventory', 'investments', 'related_parties', 'going_concern',
];

export default function WorkingPaperDetailPage() {
  const { engagementId, area } = useParams<{ engagementId: string; area: string }>();
  const router = useRouter();
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [markingReviewed, setMarkingReviewed] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentIdx = AREA_ORDER.indexOf(area as AuditArea);
  const prevArea = currentIdx > 0 ? AREA_ORDER[currentIdx - 1] : null;
  const nextArea = currentIdx < AREA_ORDER.length - 1 ? AREA_ORDER[currentIdx + 1] : null;

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/engagements/${engagementId}/working-papers/${area}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.workingPaper) return;
        if (data.workingPaper.generationStatus === 'done') {
          setPaper(data.workingPaper);
          setReviewed(false);
          stopPolling(); setGenerating(false);
          toast.success(`${AUDIT_AREAS[area as AuditArea]?.label} working paper ready`);
        } else if (data.workingPaper.generationStatus === 'error') {
          stopPolling(); setGenerating(false);
          toast.error('Generation failed - please try again');
        }
      } catch { stopPolling(); setGenerating(false); }
    }, 2500);
  }

  const loadPaper = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/working-papers/${area}`);
      if (res.status === 404) {
        setPaper(null);
      } else {
        const data = await res.json();
        setPaper(data.workingPaper);
        setReviewed(data.workingPaper?.reviewed ?? false);
        if (data.workingPaper?.generationStatus === 'generating') {
          setGenerating(true);
          startPolling();
        }
      }
    } catch { toast.error('Failed to load working paper'); }
    finally { setLoading(false); }
  }, [engagementId, area]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPaper();
    return () => stopPolling();
  }, [loadPaper]);

  async function generatePaper() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/working-papers/${area}/generate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Generation failed');
        setGenerating(false);
        return;
      }
      setPaper(data.workingPaper);
      startPolling();
    } catch { toast.error('Network error'); setGenerating(false); }
  }

  async function handleMarkReviewed() {
    setMarkingReviewed(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/working-papers/${area}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: !reviewed }),
      });
      if (!res.ok) { toast.error('Failed to update review status'); return; }
      setReviewed(r => !r);
      toast.success(reviewed ? 'Marked as unreviewed' : 'Marked as reviewed ✓');
    } catch { toast.error('Network error'); }
    finally { setMarkingReviewed(false); }
  }

  const def = AUDIT_AREAS[area as AuditArea];
  const content = (() => {
    if (!paper?.content) return null;
    try { return JSON.parse(paper.content); } catch { return null; }
  })();

  const navigate = (target: AuditArea) => {
    router.push(`/dashboard/engagements/${engagementId}/working-papers/${target}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto print:p-0 print:max-w-none">
      {/* Top navigation */}
      <div className="print:hidden mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/engagements/${engagementId}/working-papers`)}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            ← All Papers
          </button>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-sm font-semibold text-slate-900">{def?.label}</span>
            <span className="ml-2 text-xs text-slate-400 font-mono">{def?.workingPaperRef}</span>
          </div>
        </div>

        {/* Area pagination */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevArea && navigate(prevArea)}
            disabled={!prevArea}
            className="text-xs border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← {prevArea ? AUDIT_AREAS[prevArea].label : 'Previous'}
          </button>
          <span className="text-xs text-slate-400">{currentIdx + 1} / {AREA_ORDER.length}</span>
          <button
            onClick={() => nextArea && navigate(nextArea)}
            disabled={!nextArea}
            className="text-xs border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {nextArea ? AUDIT_AREAS[nextArea].label : 'Next'} →
          </button>
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center print:hidden">
          <div className="text-2xl animate-spin inline-block mb-3">⚙️</div>
          <p className="text-slate-500 text-sm">Loading…</p>
        </div>
      ) : generating ? (
        <div className="print:hidden bg-white border border-blue-100 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-4 animate-spin inline-block">⚙️</div>
          <p className="font-semibold text-slate-900 mb-2">
            Generating {def?.label} working paper…
          </p>
          <p className="text-sm text-slate-500 mb-1">
            Analysing your trial balance against ISA standards and Kenya-specific risks.
          </p>
          <p className="text-xs text-slate-400">This takes 15-30 seconds. Do not close this page.</p>
          <div className="mt-6 max-w-xs mx-auto bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      ) : !paper ? (
        <div className="print:hidden bg-white border border-slate-100 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="font-medium text-slate-900 mb-2">No working paper for {def?.label} yet</p>
          <p className="text-sm text-slate-500 mb-6">
            Generate one from your trial balance data.
          </p>
          <button
            onClick={generatePaper}
            className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Generate Working Paper
          </button>
        </div>
      ) : !content ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-6">
          <pre className="text-xs text-slate-600 whitespace-pre-wrap">{paper.content}</pre>
        </div>
      ) : (
        <WorkingPaperViewer
          content={content}
          paper={paper}
          reviewed={reviewed}
          markingReviewed={markingReviewed}
          onMarkReviewed={handleMarkReviewed}
          onRegenerate={generatePaper}
          generating={generating}
        />
      )}

      {/* Bottom pagination */}
      {!loading && !generating && (
        <div className="print:hidden mt-6 flex items-center justify-between">
          <button
            onClick={() => prevArea && navigate(prevArea)}
            disabled={!prevArea}
            className="flex items-center gap-2 text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>←</span>
            <span>{prevArea ? AUDIT_AREAS[prevArea].label : 'Previous'}</span>
          </button>
          <button
            onClick={() => router.push(`/dashboard/engagements/${engagementId}/working-papers`)}
            className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            All Papers
          </button>
          <button
            onClick={() => nextArea && navigate(nextArea)}
            disabled={!nextArea}
            className="flex items-center gap-2 text-sm border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>{nextArea ? AUDIT_AREAS[nextArea].label : 'Next'}</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}

function formatWorkingPaperAsText(content: any, paper: any): string {
  const lines: string[] = [];
  const sep = '─'.repeat(60);

  lines.push(content.title ?? 'Working Paper');
  lines.push(`Ref: ${content.paperRef ?? ''}   |   ${content.isaReference ?? ''}`);
  lines.push(`Materiality: ${content.materialityApplied ?? ''}   |   v${paper.version ?? 1}   |   ${new Date(paper.updatedAt || paper.createdAt).toLocaleDateString('en-KE')}`);
  lines.push(sep);

  if (content.objective) {
    lines.push('OBJECTIVE');
    lines.push(content.objective);
    lines.push('');
  }

  if (content.scope) {
    lines.push('SCOPE');
    lines.push(content.scope);
    lines.push('');
  }

  if (content.dataLimitations?.length) {
    lines.push('DATA LIMITATIONS');
    content.dataLimitations.forEach((d: string) => lines.push(`  ⚠ ${d}`));
    lines.push('');
  }

  if (content.analyticalProcedures?.length) {
    lines.push('ANALYTICAL PROCEDURES');
    content.analyticalProcedures.forEach((p: any, i: number) => {
      lines.push(`${i + 1}. ${p.procedure}${p.assertion ? ` [${p.assertion}]` : ''}`);
      if (p.expectation) lines.push(`   Expected : ${p.expectation}`);
      if (p.finding)     lines.push(`   Finding  : ${p.finding}`);
      if (p.conclusion)  lines.push(`   Conclusion: ${p.conclusion}`);
      lines.push('');
    });
  }

  if (content.keyObservations?.length) {
    lines.push('KEY OBSERVATIONS');
    content.keyObservations.forEach((o: any, i: number) => {
      lines.push(`${i + 1}. [${(o.risk ?? 'low').toUpperCase()} RISK] ${o.observation}`);
      if (o.assertionAffected) lines.push(`   Assertion: ${o.assertionAffected}`);
      if (o.citation?.accountOrItem) lines.push(`   Source: ${o.citation.accountOrItem}${o.citation.amount ? `: ${o.citation.amount}` : ''}`);
      if (o.recommendation) lines.push(`   Action: ${o.recommendation}`);
      lines.push('');
    });
  }

  if (content.auditRequestList?.length) {
    lines.push('DOCUMENTS TO REQUEST FROM CLIENT');
    content.auditRequestList.forEach((r: string, i: number) => lines.push(`  ${i + 1}. ${r}`));
    lines.push('');
  }

  if (content.areasForFurtherTesting?.length) {
    lines.push('AREAS FOR FURTHER TESTING');
    content.areasForFurtherTesting.forEach((t: string) => lines.push(`  → ${t}`));
    lines.push('');
  }

  if (content.preliminaryConclusion) {
    lines.push('PRELIMINARY CONCLUSION');
    lines.push(content.preliminaryConclusion);
    lines.push('');
  }

  lines.push(sep);
  lines.push(content.disclaimer ?? 'DRAFT - AI-ASSISTED - MUST BE REVIEWED BY AUDIT MANAGER/PARTNER');

  return lines.join('\n');
}

function WorkingPaperViewer({
  content,
  paper,
  reviewed,
  markingReviewed,
  onMarkReviewed,
  onRegenerate,
  generating,
}: {
  content: any;
  paper: any;
  reviewed: boolean;
  markingReviewed: boolean;
  onMarkReviewed: () => void;
  onRegenerate: () => void;
  generating: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = formatWorkingPaperAsText(content, paper);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      {/* Header - sticky with action buttons so they're always accessible */}
      <div className="bg-slate-50 border-b border-slate-100 p-4 print:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-mono text-slate-500 mb-0.5">{content.paperRef}</p>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{content.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{content.isaReference}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <span className="text-xs text-slate-400 mr-1">
              {content.materialityApplied} &nbsp;·&nbsp; v{paper.version || 1}
              {reviewed && <span className="ml-2 text-green-600 font-medium">✓ Reviewed</span>}
            </span>
            <button
              onClick={handleCopy}
              title="Copy as plain text"
              className={`flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1.5 rounded-lg transition-colors ${
                copied ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {copied ? '✓ Copied' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-medium border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
            <button
              onClick={onRegenerate}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-medium border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={generating ? 'animate-spin' : ''}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              {generating ? 'Generating…' : 'Regenerate'}
            </button>
            <button
              onClick={onMarkReviewed}
              disabled={markingReviewed}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 border ${
                reviewed ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-green-600 text-white hover:bg-green-700 border-green-600'
              }`}
            >
              {markingReviewed ? 'Saving…' : reviewed ? '✓ Reviewed - Undo' : '✓ Mark Reviewed'}
            </button>
          </div>
        </div>
        {content.disclaimer && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-amber-800">{content.disclaimer}</p>
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(100vh - 280px)' }}>

        {/* Evidence sufficiency bar */}
        {content.evidenceSufficiency != null && (
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600">Evidence sufficiency</span>
                <span className={`text-xs font-semibold ${
                  content.evidenceSufficiency >= 70 ? 'text-green-700' :
                  content.evidenceSufficiency >= 40 ? 'text-yellow-700' : 'text-red-700'
                }`}>{content.evidenceSufficiency}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    content.evidenceSufficiency >= 70 ? 'bg-green-500' :
                    content.evidenceSufficiency >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${content.evidenceSufficiency}%` }}
                />
              </div>
            </div>
            {content.evidenceSufficiency < 70 && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg shrink-0">
                Additional evidence required
              </span>
            )}
          </div>
        )}

        {/* Data limitations - consolidated block */}
        {content.dataLimitations?.length > 0 && (
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-amber-900 mb-2 uppercase tracking-wide">Data Limitations</h3>
            <ul className="space-y-1">
              {content.dataLimitations.map((item: string, i: number) => (
                <li key={i} className="text-xs text-amber-800 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠</span> {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Objective */}
        {content.objective && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Objective</h3>
            <p className="text-sm text-slate-700">{content.objective}</p>
          </section>
        )}

        {/* Scope */}
        {content.scope && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Scope</h3>
            <p className="text-sm text-slate-700">{content.scope}</p>
          </section>
        )}

        {/* Analytical Procedures */}
        {content.analyticalProcedures?.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Analytical Procedures</h3>
            <div className="space-y-3">
              {content.analyticalProcedures.map((proc: any, i: number) => (
                <div key={i} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900">{proc.procedure}</p>
                    {proc.assertion && (
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-medium ml-2 shrink-0">
                        {proc.assertion}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs mt-2">
                    <div><span className="text-slate-500">Expected:</span> <span className="text-slate-700">{proc.expectation}</span></div>
                    <div><span className="text-slate-500">Finding:</span> <span className="text-slate-700">{proc.finding}</span></div>
                    <div><span className="text-slate-500">Conclusion:</span> <span className="text-slate-700">{proc.conclusion}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Observations */}
        {content.keyObservations?.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Key Observations</h3>
            <div className="space-y-3">
              {content.keyObservations.map((obs: any, i: number) => (
                <div key={i} className={`border rounded-lg p-4 ${
                  obs.risk === 'high' ? 'border-red-200 bg-red-50' :
                  obs.risk === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-slate-100'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-slate-900">{obs.observation}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 shrink-0 ${
                      obs.risk === 'high' ? 'bg-red-100 text-red-700' :
                      obs.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {obs.risk} risk
                    </span>
                  </div>
                  {obs.assertionAffected && (
                    <p className="text-xs text-slate-500 mb-1">Assertion: {obs.assertionAffected}</p>
                  )}
                  {obs.citation && (
                    <p className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mt-1">
                      Source: {obs.citation.accountOrItem}{obs.citation.amount ? `: ${obs.citation.amount}` : ''}
                      {obs.citation.confidence != null && (
                        <span className="ml-2 text-blue-400">({Math.round(obs.citation.confidence * 100)}% confidence)</span>
                      )}
                    </p>
                  )}
                  {obs.recommendation && (
                    <p className="text-xs text-slate-700 mt-2 bg-white border border-slate-100 rounded px-2 py-1.5">
                      <span className="font-semibold text-slate-900">Action: </span>{obs.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Audit Request List - what to ask the client */}
        {content.auditRequestList?.length > 0 && (
          <section className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Documents to Request from Client</h3>
            <ul className="space-y-1.5">
              {content.auditRequestList.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className="shrink-0 text-blue-400 mt-0.5">□</span> {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Areas for Further Testing */}
        {content.areasForFurtherTesting?.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Areas Requiring Further Testing</h3>
            <ul className="space-y-1.5">
              {content.areasForFurtherTesting.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-blue-600 mt-0.5 shrink-0">→</span> {item}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Preliminary Conclusion */}
        {content.preliminaryConclusion && (
          <section className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Preliminary Conclusion</h3>
            <p className="text-sm text-slate-700">{content.preliminaryConclusion}</p>
          </section>
        )}

        {/* Sign-off footer */}
        <div className="border-t border-slate-100 pt-3 print:hidden">
          <p className="text-xs text-slate-400">
            AI-assisted draft &nbsp;·&nbsp; {new Date(paper.updatedAt || paper.createdAt).toLocaleDateString('en-KE')} &nbsp;·&nbsp; v{paper.version || 1}
          </p>
        </div>
      </div>
    </div>
  );
}
