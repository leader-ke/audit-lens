'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Share2, Link2, Copy, Check, RefreshCw, Trash2,
  Plus, Loader2, Mail, X, ChevronDown,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type DocRequestStatus = 'pending' | 'received' | 'not_available';

interface DocumentRequest {
  id: string;
  engagementId: string;
  orgId: string;
  title: string;
  description: string | null;
  documentType: string | null;
  isRequired: boolean;
  status: DocRequestStatus;
  dueDate: string | null;
  clientResponse: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PortalToken {
  id: string;
  engagementId: string;
  orgId: string;
  token: string;
  clientEmail: string | null;
  clientName: string | null;
  permissions: Record<string, boolean>;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const DOC_TYPES = [
  { value: 'trial_balance', label: 'Trial Balance' },
  { value: 'financial_statements', label: 'Financial Statements' },
  { value: 'bank_statements', label: 'Bank Statements' },
  { value: 'gl_extract', label: 'GL Extract' },
  { value: 'payroll_register', label: 'Payroll Register' },
  { value: 'fixed_asset_register', label: 'Fixed Asset Register' },
  { value: 'board_minutes', label: 'Board Minutes' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'tax_returns', label: 'Tax Returns' },
  { value: 'management_accounts', label: 'Management Accounts' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'other', label: 'Other' },
];

const STATUS_META: Record<DocRequestStatus, { label: string; color: string; bg: string }> = {
  pending:       { label: 'Pending',       color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  received:      { label: 'Received',      color: '#059669', bg: 'rgba(16,185,129,0.12)' },
  not_available: { label: 'Not available', color: '#64748b', bg: 'rgba(148,163,184,0.12)' },
};

const cardStyle = {
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocRequestStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium"
      style={{ background: meta.bg, color: meta.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<'requests' | 'settings'>('requests');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<PortalToken | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [copied, setCopied] = useState(false);

  // New request form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDocType, setNewDocType] = useState('other');
  const [newIsRequired, setNewIsRequired] = useState(true);
  const [newDueDate, setNewDueDate] = useState('');
  const [addingRequest, setAddingRequest] = useState(false);

  // Token management
  const [generatingToken, setGeneratingToken] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [tokenClientName, setTokenClientName] = useState('');
  const [tokenClientEmail, setTokenClientEmail] = useState('');

  // Delete request
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const portalUrl =
    typeof window !== 'undefined' && token?.isActive
      ? `${window.location.origin}/portal/${token.token}`
      : null;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/engagements/${engagementId}/portal`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to load portal'); return; }
      setToken(data.token);
      setRequests(data.requests ?? []);
      if (data.token?.clientName) setTokenClientName(data.token.clientName);
      if (data.token?.clientEmail) setTokenClientEmail(data.token.clientEmail);
    } catch { toast.error('Failed to load portal data'); }
    finally { setLoading(false); }
  }, [engagementId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // ── Actions ────────────────────────────────────────────────────────────────

  async function generateToken() {
    setGeneratingToken(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: tokenClientName || undefined,
          clientEmail: tokenClientEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to generate link'); return; }
      setToken(data.token);
      toast.success('Portal link generated');
    } catch { toast.error('Network error'); }
    finally { setGeneratingToken(false); }
  }

  async function deactivateToken() {
    setDeactivating(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/portal`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Failed to deactivate'); return; }
      setToken(prev => prev ? { ...prev, isActive: false } : null);
      toast.success('Portal link deactivated');
    } catch { toast.error('Network error'); }
    finally { setDeactivating(false); }
  }

  async function addRequest() {
    if (!newTitle.trim()) { toast.error('Title is required'); return; }
    setAddingRequest(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/document-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          documentType: newDocType,
          isRequired: newIsRequired,
          dueDate: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to add request'); return; }
      setRequests(prev => [...prev, data.request]);
      setNewTitle('');
      setNewDescription('');
      setNewDocType('other');
      setNewIsRequired(true);
      setNewDueDate('');
      setShowAddForm(false);
      toast.success('Document request added');
    } catch { toast.error('Network error'); }
    finally { setAddingRequest(false); }
  }

  async function deleteRequest(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/engagements/${engagementId}/document-requests?id=${id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Delete failed'); return; }
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Request removed');
    } catch { toast.error('Network error'); }
    finally { setDeletingId(null); }
  }

  function copyLink() {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── Email template ─────────────────────────────────────────────────────────

  const emailTemplate = portalUrl
    ? `Subject: Audit Document Request - Action Required

Dear ${token?.clientName || 'Client'},

Please use the secure link below to view document requests for your audit and upload the required files. No account or login is needed.

${portalUrl}

This link expires on ${token?.expiresAt ? new Date(token.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}.

If you have any questions, please contact us directly.

Kind regards`
    : '';

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <header
          className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-slate-100"
          style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
        >
          <div className="skeleton h-8 w-48 rounded-lg" />
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Pinned header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/engagements/${engagementId}`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mr-1"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37,99,235,0.09)' }}
          >
            <Share2 size={16} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Client Portal</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {token?.isActive ? 'Active - share link with client' : 'No active link'}
            </p>
          </div>
        </div>

        {/* Quick copy */}
        {portalUrl && (
          <button
            type="button"
            onClick={copyLink}
            className="btn-ghost"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        )}
      </header>

      {/* Tabs */}
      <div
        className="flex-shrink-0 flex items-center gap-0 px-6 border-b border-slate-100"
        style={{ background: 'rgba(255,255,255,0.95)' }}
      >
        {(['requests', 'settings'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="relative px-4 py-3 text-sm font-medium transition-colors"
            style={{ color: tab === t ? '#2563eb' : '#64748b' }}
          >
            {t === 'requests' ? 'Document Requests' : 'Portal Settings'}
            {tab === t && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                style={{ background: '#2563eb' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6 space-y-4">

          {/* ── Document Requests tab ─────────────────────────────────────── */}
          {tab === 'requests' && (
            <>
              {/* Add request button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  {requests.length === 0
                    ? 'No document requests yet.'
                    : `${requests.length} request${requests.length !== 1 ? 's' : ''} - ${requests.filter(r => r.status === 'received').length} received`}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(v => !v)}
                  className="btn-primary"
                >
                  <Plus size={13} />
                  Add request
                </button>
              </div>

              {/* Add request form */}
              {showAddForm && (
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">New document request</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                      <input
                        className="input"
                        placeholder="e.g. Bank statements for FY 2024"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                      <textarea
                        className="input h-auto py-2"
                        rows={2}
                        placeholder="Additional details or instructions"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Document type</label>
                        <select
                          className="input"
                          value={newDocType}
                          onChange={e => setNewDocType(e.target.value)}
                        >
                          {DOC_TYPES.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Due date</label>
                        <input
                          className="input"
                          type="date"
                          value={newDueDate}
                          onChange={e => setNewDueDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={newIsRequired}
                        onChange={e => setNewIsRequired(e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-sm text-slate-700">Required document</span>
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addRequest}
                      disabled={addingRequest}
                      className="btn-primary"
                    >
                      {addingRequest ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      Add request
                    </button>
                  </div>
                </div>
              )}

              {/* Request list */}
              {requests.length > 0 && (
                <div className="space-y-2">
                  {requests.map(req => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      onDelete={deleteRequest}
                      deletingId={deletingId}
                    />
                  ))}
                </div>
              )}

              {requests.length === 0 && !showAddForm && (
                <div
                  className="rounded-2xl p-10 text-center"
                  style={{ border: '2px dashed rgba(148,163,184,0.3)', background: 'rgba(248,250,252,0.6)' }}
                >
                  <p className="text-sm text-slate-500 mb-1">No document requests yet</p>
                  <p className="text-xs text-slate-400">Add requests to send to the client via the portal link</p>
                </div>
              )}
            </>
          )}

          {/* ── Portal Settings tab ───────────────────────────────────────── */}
          {tab === 'settings' && (
            <>
              {/* Client details */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Client details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Client name</label>
                    <input
                      className="input"
                      placeholder="e.g. Acme Ltd"
                      value={tokenClientName}
                      onChange={e => setTokenClientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Client email</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="e.g. cfo@acme.co.ke"
                      value={tokenClientEmail}
                      onChange={e => setTokenClientEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Token management */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Portal link</h3>

                {token?.isActive ? (
                  <>
                    {/* Link display */}
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4"
                      style={{ background: 'rgba(37,99,235,0.05)', border: '1px solid rgba(37,99,235,0.15)' }}
                    >
                      <Link2 size={13} className="text-blue-500 flex-shrink-0" />
                      <span className="text-xs font-mono text-slate-700 truncate flex-1">
                        {portalUrl}
                      </span>
                      <button
                        type="button"
                        onClick={copyLink}
                        className="flex-shrink-0 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Copy link"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                      <div>
                        <p className="text-slate-400 mb-0.5">Status</p>
                        <span
                          className="inline-flex items-center gap-1 font-medium"
                          style={{ color: '#059669' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Active
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Client</p>
                        <p className="font-medium text-slate-700">{token.clientName || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Expires</p>
                        <p className="font-medium text-slate-700">
                          {token.expiresAt
                            ? new Date(token.expiresAt).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: 'numeric',
                              })
                            : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={generateToken}
                        disabled={generatingToken}
                        className="btn-ghost"
                      >
                        {generatingToken
                          ? <Loader2 size={13} className="animate-spin" />
                          : <RefreshCw size={13} />}
                        Reset link
                      </button>
                      <button
                        type="button"
                        onClick={deactivateToken}
                        disabled={deactivating}
                        className="btn-ghost"
                        style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
                      >
                        {deactivating ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                        Deactivate
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500 mb-4">No active portal link for this engagement.</p>
                    <button
                      type="button"
                      onClick={generateToken}
                      disabled={generatingToken}
                      className="btn-primary"
                    >
                      {generatingToken ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                      Generate portal link
                    </button>
                  </div>
                )}
              </div>

              {/* Share with client */}
              {portalUrl && (
                <div className="rounded-2xl p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-3">
                    <Mail size={14} className="text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Share with client</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Copy this email template to send to the client:</p>
                  <div
                    className="rounded-xl p-4 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed mb-3"
                    style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(148,163,184,0.2)' }}
                  >
                    {emailTemplate}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(emailTemplate);
                      toast.success('Email template copied');
                    }}
                    className="btn-ghost"
                  >
                    <Copy size={13} />
                    Copy email template
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── RequestCard ───────────────────────────────────────────────────────────────

function RequestCard({
  request,
  onDelete,
  deletingId,
}: {
  request: DocumentRequest;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const cardStyle = {
    background: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(148,163,184,0.2)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown
            size={14}
            className="flex-shrink-0 text-slate-400 transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-900">{request.title}</span>
              {request.isRequired && (
                <span className="text-xs text-red-500 font-medium">Required</span>
              )}
            </div>
            {request.documentType && (
              <p className="text-xs text-slate-400 mt-0.5 capitalize">
                {request.documentType.replace(/_/g, ' ')}
                {request.dueDate && (
                  <> - due {new Date(request.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <StatusBadge status={request.status as DocRequestStatus} />
          <button
            type="button"
            onClick={() => onDelete(request.id)}
            disabled={deletingId === request.id}
            className="text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors p-1"
            title="Delete request"
          >
            {deletingId === request.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="px-4 pb-4 text-sm space-y-2"
          style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}
        >
          {request.description && (
            <p className="text-xs text-slate-600 pt-3">{request.description}</p>
          )}
          {request.clientResponse && (
            <div
              className="rounded-xl p-3 mt-2"
              style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <p className="text-xs font-medium text-emerald-800 mb-1">Client response</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{request.clientResponse}</p>
            </div>
          )}
          {!request.description && !request.clientResponse && (
            <p className="text-xs text-slate-400 pt-3">No additional details or client response yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
