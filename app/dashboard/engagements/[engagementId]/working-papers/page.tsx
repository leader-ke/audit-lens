'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AUDIT_AREAS } from '@/lib/audit/isa-standards';
import type { AuditArea } from '@/lib/audit/isa-standards';
import { Loader2, AlertTriangle, FileText, RefreshCw, CheckCircle, ArrowLeft, Zap } from 'lucide-react';

const AREA_ORDER: AuditArea[] = [
  'revenue', 'expenses', 'receivables', 'payables', 'cash_and_bank',
  'fixed_assets', 'payroll', 'tax', 'equity', 'provisions_and_liabilities',
  'inventory', 'investments', 'related_parties', 'going_concern',
];

const cardStyle = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export default function WorkingPapersPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();
  const [papers, setPapers] = useState<Record<AuditArea, any>>({} as any);
  const [generatingSet, setGeneratingSet] = useState<Set<AuditArea>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasTB, setHasTB] = useState<boolean | null>(null);

  const isAnyGenerating = generatingSet.size > 0;
  const isGenerating = (area: AuditArea) => generatingSet.has(area);

  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { loadAll(); }, [engagementId]);

  async function loadAll() {
    try {
      const [papersRes, financialsRes] = await Promise.all([
        fetch(`/api/engagements/${engagementId}/working-papers`),
        fetch(`/api/engagements/${engagementId}/financials`),
      ]);
      const papersData = await papersRes.json();
      const financialsData = await financialsRes.json();
      const map: Record<string, any> = {};
      for (const p of papersData.papers || []) map[p.auditArea] = p;
      setPapers(map);
      setHasTB((financialsData.financials?.length ?? 0) > 0);
    } catch { toast.error('Failed to load working papers'); }
    finally { setLoading(false); }
  }

  async function generatePaper(area: AuditArea, e?: React.MouseEvent) {
    e?.stopPropagation();
    setGeneratingSet(s => new Set(s).add(area));
    try {
      const res = await fetch(`/api/engagements/${engagementId}/working-papers/${area}/generate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Generation failed'); return; }
      toast.success(`${AUDIT_AREAS[area].label} working paper generated`);
      setPapers(p => ({ ...p, [area]: data.workingPaper }));
    } catch { toast.error('Network error'); }
    finally {
      setGeneratingSet(s => { const next = new Set(s); next.delete(area); return next; });
    }
  }

  function generateAll() {
    pending.forEach(a => { if (!isGenerating(a)) generatePaper(a); });
  }

  function regenerateAll() {
    AREA_ORDER.forEach(a => { if (!isGenerating(a)) generatePaper(a); });
  }

  const generated = AREA_ORDER.filter(a => !!papers[a]);
  const pending = AREA_ORDER.filter(a => !papers[a]);
  const canGenerate = hasTB === true;

  return (
    <div className="p-7">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Working Papers
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {generated.length} of {AREA_ORDER.length} audit areas drafted
            {generated.filter(a => papers[a]?.reviewed).length > 0 && (
              <> &nbsp;·&nbsp; {generated.filter(a => papers[a]?.reviewed).length} reviewed</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/dashboard/engagements/${engagementId}`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
          {canGenerate && (
            <div className="flex items-center gap-2">
              {generated.length > 0 && (
                <button
                  onClick={regenerateAll}
                  disabled={isAnyGenerating}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50 transition-all"
                  style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(148,163,184,0.3)', color: '#64748b' }}
                >
                  <RefreshCw size={13} />
                  Regen All
                </button>
              )}
              {pending.length > 0 && (
                <button
                  onClick={generateAll}
                  disabled={isAnyGenerating}
                  className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-xl disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 0 20px rgba(59,130,246,0.25)' }}
                >
                  <Zap size={13} />
                  {isAnyGenerating
                    ? `Generating ${generatingSet.size} of ${pending.length + generatingSet.size}…`
                    : 'Generate All Remaining'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* No trial balance warning */}
      {!loading && hasTB === false && (
        <div
          className="mb-6 rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}
        >
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">No trial balance uploaded</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Upload a trial balance before generating working papers. The AI needs financial data to perform meaningful audit analysis.
            </p>
            <a
              href={`/dashboard/engagements/${engagementId}`}
              className="inline-block mt-2 text-sm text-amber-800 underline font-medium hover:text-amber-900"
            >
              ← Go to engagement to upload trial balance
            </a>
          </div>
        </div>
      )}

      {/* Generating indicator */}
      {isAnyGenerating && (
        <div
          className="mb-5 rounded-xl p-4 flex items-center gap-4"
          style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <Loader2 size={20} className="animate-spin text-blue-500 shrink-0" />
          <div>
            <p className="font-medium text-blue-900 text-sm">
              {generatingSet.size === 1
                ? `Generating ${AUDIT_AREAS[[...generatingSet][0]]?.label} working paper…`
                : `Generating ${generatingSet.size} working papers in parallel…`}
            </p>
            <p className="text-xs text-blue-500 mt-0.5">
              {generatingSet.size > 1
                ? `${[...generatingSet].map(a => AUDIT_AREAS[a]?.label).join(', ')}`
                : 'Analysing trial balance against ISA standards. This takes 15-30 seconds.'}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Generated papers */}
          {generated.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Generated - click to view
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {AREA_ORDER.filter(a => !!papers[a]).map(area => {
                  const def = AUDIT_AREAS[area];
                  const paper = papers[area];
                  const isThisGenerating = isGenerating(area);
                  let riskSummary: string | undefined;
                  try {
                    const c = JSON.parse(paper.content);
                    const highs = (c.keyObservations || []).filter((o: any) => o.risk === 'high').length;
                    const meds = (c.keyObservations || []).filter((o: any) => o.risk === 'medium').length;
                    if (highs > 0) riskSummary = `${highs} high-risk`;
                    else if (meds > 0) riskSummary = `${meds} medium-risk`;
                  } catch {}

                  return (
                    <div
                      key={area}
                      onClick={() => router.push(`/dashboard/engagements/${engagementId}/working-papers/${area}`)}
                      className="rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md group"
                      style={cardStyle}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {def.label}
                          </p>
                          <p className="text-xs text-slate-300 font-mono mt-0.5">{def.workingPaperRef}</p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          {paper.reviewed && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1"
                              style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}
                            >
                              <CheckCircle size={9} /> Reviewed
                            </span>
                          )}
                          {riskSummary && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
                            >
                              {riskSummary}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          v{paper.version || 1} &nbsp;·&nbsp; {new Date(paper.updatedAt || paper.createdAt).toLocaleDateString('en-KE')}
                        </p>
                        <button
                          onClick={e => generatePaper(area, e)}
                          disabled={isThisGenerating || !canGenerate}
                          title={!canGenerate ? 'Upload a trial balance first' : 'Regenerate'}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2 py-0.5 rounded-lg hover:bg-amber-50"
                        >
                          {isThisGenerating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                          {isThisGenerating ? 'Generating…' : 'Regen'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pending papers */}
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Not yet generated
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {AREA_ORDER.filter(a => !papers[a]).map(area => {
                  const def = AUDIT_AREAS[area];
                  const isThisGenerating = isGenerating(area);
                  return (
                    <div
                      key={area}
                      className="rounded-2xl p-4 flex items-center justify-between"
                      style={{ ...cardStyle, opacity: !canGenerate ? 0.6 : 1 }}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">{def.label}</p>
                        <p className="text-xs text-slate-300 font-mono mt-0.5">{def.workingPaperRef}</p>
                      </div>
                      <button
                        onClick={e => generatePaper(area, e)}
                        disabled={isThisGenerating || !canGenerate}
                        title={!canGenerate ? 'Upload a trial balance first' : undefined}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 transition-all disabled:cursor-not-allowed"
                        style={!canGenerate ? {
                          background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
                        } : isThisGenerating ? {
                          background: 'rgba(59,130,246,0.08)', color: '#3b82f6',
                        } : {
                          background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                        }}
                      >
                        {isThisGenerating ? (
                          <><Loader2 size={11} className="animate-spin" /> Generating…</>
                        ) : !canGenerate ? 'No TB' : 'Generate'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {generated.length === 0 && (
            <div className="rounded-2xl p-12 text-center mt-4" style={cardStyle}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
                <FileText size={24} className="text-blue-500" />
              </div>
              <p className="font-semibold text-slate-900 mb-1.5">No working papers generated yet</p>
              <p className="text-sm text-slate-500 mb-4">
                Click &quot;Generate&quot; on any area above, or use &quot;Generate All Remaining&quot; to draft them all at once.
              </p>
              {!canGenerate && (
                <div
                  className="rounded-xl p-3 text-left text-xs text-amber-700"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                >
                  <AlertTriangle size={12} className="inline mr-1.5" />
                  Upload a trial balance first. Go to the engagement overview to upload files.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
