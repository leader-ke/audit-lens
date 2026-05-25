'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, FileText, CheckCircle2, AlertCircle, ChevronDown, Save } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type DocRequestStatus = 'pending' | 'received' | 'not_available';

interface DocumentRequest {
  id: string;
  title: string;
  description: string | null;
  documentType: string | null;
  isRequired: boolean;
  status: DocRequestStatus;
  dueDate: string | null;
  clientResponse: string | null;
}

interface ManagementLetterFinding {
  area: string;
  deficiency: string;
  recommendation: string;
  managementResponse: string | null;
}

interface PortalData {
  portal: {
    clientName: string | null;
    clientEmail: string | null;
    permissions: Record<string, boolean>;
    expiresAt: string | null;
  };
  engagement: {
    id: string;
    clientName: string;
    financialYearEnd: string;
    auditType: string;
    firmName: string;
    engagementRef: string | null;
  };
  documentRequests: DocumentRequest[];
  managementLetter: {
    isDraft: boolean;
    findings: ManagementLetterFinding[];
  } | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatYear(iso: string): string {
  return new Date(iso).getFullYear().toString();
}

// ── Sub-components ───────────────────────────────────────────────────────────

const STATUS_META: Record<DocRequestStatus, { label: string; color: string; bg: string }> = {
  pending:       { label: 'Pending',       color: '#b45309', bg: 'rgba(251,191,36,0.12)' },
  received:      { label: 'Received',      color: '#047857', bg: 'rgba(16,185,129,0.12)' },
  not_available: { label: 'Not available', color: '#475569', bg: 'rgba(148,163,184,0.12)' },
};

function StatusBadge({ status }: { status: DocRequestStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold"
      style={{ background: meta.bg, color: meta.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

// ── Request card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  token,
  onUpdate,
}: {
  request: DocumentRequest;
  token: string;
  onUpdate: (updated: DocumentRequest) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [response, setResponse] = useState(request.clientResponse ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(newStatus?: DocRequestStatus) {
    setSaving(true);
    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          clientResponse: response,
          status: newStatus ?? (response.trim() ? 'received' : request.status),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to save response');
        return;
      }
      onUpdate(data.request);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Network error saving response', err);
    } finally {
      setSaving(false);
    }
  }

  async function markNotAvailable() {
    await save('not_available');
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown
            size={15}
            className="flex-shrink-0 text-slate-400 transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900">{request.title}</span>
              {request.isRequired && (
                <span className="text-xs font-medium text-red-500">Required</span>
              )}
            </div>
            {(request.documentType || request.dueDate) && (
              <p className="text-xs text-slate-400 mt-0.5">
                {request.documentType && (
                  <span className="capitalize">{request.documentType.replace(/_/g, ' ')}</span>
                )}
                {request.documentType && request.dueDate && ' - '}
                {request.dueDate && (
                  <span>Due {formatDate(request.dueDate)}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <StatusBadge status={request.status} />
        </div>
      </div>

      {/* Expanded area */}
      {expanded && (
        <div
          className="px-5 pb-5 space-y-4"
          style={{ borderTop: '1px solid #f1f5f9' }}
        >
          {request.description && (
            <p className="text-sm text-slate-600 pt-3 leading-relaxed">{request.description}</p>
          )}

          {/* Response area */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Your response or notes
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              rows={3}
              placeholder="Type your response here, or describe any issues..."
              value={response}
              onChange={e => setResponse(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
              style={{
                background: saved ? '#059669' : 'linear-gradient(150deg,#2563eb,#1d4ed8)',
                boxShadow: '0 2px 8px rgba(29,78,216,0.25)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={13} />
              ) : (
                <Save size={13} />
              )}
              {saved ? 'Saved' : 'Save response'}
            </button>

            {request.status !== 'not_available' && (
              <button
                type="button"
                onClick={markNotAvailable}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                Mark as not available
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main portal page ──────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/${token}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'This portal link is not valid.');
        return;
      }
      setData(json);
      setRequests(json.documentRequests ?? []);
    } catch {
      setError('Unable to load the portal. Please check your link and try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function handleRequestUpdate(updated: DocumentRequest) {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading portal...</p>
        </div>
      </div>
    );
  }

  // ── Error / invalid token ──────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f8fafc' }}>
        <div
          className="max-w-md w-full rounded-3xl p-8 text-center"
          style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.08)' }}
          >
            <AlertCircle size={24} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 mb-2">Link not valid</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {error || 'This portal link is not valid or has expired. Please contact your auditor for a new link.'}
          </p>
        </div>
      </div>
    );
  }

  const { engagement, portal, managementLetter } = data;
  const hasFinalizedFindings =
    managementLetter && !managementLetter.isDraft && managementLetter.findings.length > 0;
  const hasDraftFindings =
    managementLetter && managementLetter.isDraft && managementLetter.findings.length > 0;

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const receivedCount = requests.filter(r => r.status === 'received').length;

  return (
    <div className="min-h-screen" style={{ background: '#f1f5f9' }}>

      {/* Header */}
      <header
        className="border-b border-slate-200"
        style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(150deg,#2563eb,#1d4ed8)' }}
            >
              AL
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">AuditLens</p>
              <p className="text-xs text-slate-400 leading-tight">Audit Document Portal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-700">{engagement.firmName}</p>
            {engagement.auditType && (
              <p className="text-xs text-slate-400 capitalize mt-0.5">
                {engagement.auditType.replace(/_/g, ' ')} audit
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* Engagement summary */}
        <div
          className="rounded-3xl p-6"
          style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {portal.clientName && (
                <p className="text-xs font-medium text-blue-600 mb-1 uppercase tracking-wide">
                  Prepared for
                </p>
              )}
              <h1 className="text-xl font-bold text-slate-900">{engagement.clientName}</h1>
              <p className="text-sm text-slate-500 mt-1">
                Financial year ending {formatDate(engagement.financialYearEnd)}
              </p>
            </div>
            <div
              className="flex-shrink-0 rounded-2xl px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
            >
              FY {formatYear(engagement.financialYearEnd)}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-slate-400 mb-0.5">Audit firm</p>
              <p className="font-semibold text-slate-800">{engagement.firmName}</p>
            </div>
            {engagement.engagementRef && (
              <div>
                <p className="text-slate-400 mb-0.5">Reference</p>
                <p className="font-semibold text-slate-800">{engagement.engagementRef}</p>
              </div>
            )}
            <div>
              <p className="text-slate-400 mb-0.5">Documents</p>
              <p className="font-semibold text-slate-800">
                {receivedCount}/{requests.length} received
              </p>
            </div>
          </div>
        </div>

        {/* Progress summary */}
        {requests.length > 0 && (
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{
              background: pendingCount === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(251,191,36,0.08)',
              border: `1px solid ${pendingCount === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.2)'}`,
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: pendingCount === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
              }}
            >
              {pendingCount === 0
                ? <CheckCircle2 size={18} className="text-emerald-600" />
                : <FileText size={18} className="text-amber-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: pendingCount === 0 ? '#047857' : '#92400e' }}>
                {pendingCount === 0
                  ? 'All documents received - thank you'
                  : `${pendingCount} document${pendingCount !== 1 ? 's' : ''} still needed`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: pendingCount === 0 ? '#065f46' : '#78350f' }}>
                {receivedCount} of {requests.length} received
              </p>
            </div>
          </div>
        )}

        {/* Document requests */}
        <section>
          <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            Document Requests
          </h2>

          {requests.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'white', border: '1px solid #e2e8f0' }}
            >
              <p className="text-sm text-slate-400">No document requests at this time.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(req => (
                <RequestCard
                  key={req.id}
                  request={req}
                  token={token}
                  onUpdate={handleRequestUpdate}
                />
              ))}
            </div>
          )}
        </section>

        {/* Management letter findings */}
        {(hasFinalizedFindings || hasDraftFindings) && (
          <section>
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              Management Letter Findings
            </h2>
            {hasDraftFindings && (
              <p className="text-xs text-amber-600 mb-3 font-medium">
                These findings are in draft and subject to change.
              </p>
            )}

            <div className="space-y-3">
              {managementLetter!.findings.map((finding, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-5"
                  style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#92400e' }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      {finding.area && (
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                          {finding.area}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-slate-900 mb-2">{finding.deficiency}</p>
                      <div
                        className="rounded-xl p-3"
                        style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.1)' }}
                      >
                        <p className="text-xs font-semibold text-blue-700 mb-1">Recommendation</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{finding.recommendation}</p>
                      </div>
                      {finding.managementResponse && (
                        <div
                          className="rounded-xl p-3 mt-2"
                          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
                        >
                          <p className="text-xs font-semibold text-emerald-700 mb-1">Management response</p>
                          <p className="text-xs text-slate-700 leading-relaxed">{finding.managementResponse}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-5 py-8 mt-4">
        <div className="border-t border-slate-200 pt-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Confidential - for addressee only
          </p>
          <p className="text-xs text-slate-300 mt-1">
            This document is intended solely for the named recipient and may contain privileged information.
            {portal.expiresAt && (
              <> Access expires {formatDate(portal.expiresAt)}.</>
            )}
          </p>
        </div>
      </footer>

    </div>
  );
}
