'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import {
  Paperclip, Upload, Loader2, X,
  CheckCircle, ChevronRight, BarChart3, TrendingUp, FileText, ArrowRight,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'planning',   label: 'Planning',   bg: 'rgba(251,191,36,0.12)',  color: '#d97706' },
  { value: 'fieldwork',  label: 'Fieldwork',  bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  { value: 'completion', label: 'Completion', bg: 'rgba(167,139,250,0.12)', color: '#8b5cf6' },
  { value: 'reporting',  label: 'Reporting',  bg: 'rgba(249,115,22,0.12)',  color: '#ea580c' },
  { value: 'signed_off', label: 'Signed off', bg: 'rgba(52,211,153,0.12)',  color: '#059669' },
  { value: 'archived',   label: 'Archived',   bg: 'rgba(148,163,184,0.1)', color: '#64748b' },
];

const AUDIT_AREA_LABELS: Record<string, string> = {
  revenue: 'Revenue', expenses: 'Expenses', receivables: 'Receivables',
  payables: 'Payables', cash_and_bank: 'Cash & Bank', fixed_assets: 'Fixed Assets',
  payroll: 'Payroll', tax: 'Tax', equity: 'Equity',
  provisions_and_liabilities: 'Provisions', inventory: 'Inventory',
  investments: 'Investments', related_parties: 'Related Parties',
  going_concern: 'Going Concern', opening_balances: 'Opening Balances',
};

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
  { value: 'other', label: 'Other' },
];

const cardStyle = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export default function EngagementDetailPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [engagement, setEngagement] = useState<any>(null);
  const [financials, setFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('trial_balance');
  const [parseResult, setParseResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/engagements/${engagementId}`).then(r => r.json()),
      fetch(`/api/engagements/${engagementId}/financials`).then(r => r.json()).catch(() => ({ financials: [] })),
    ]).then(([eData, fData]) => {
      if (eData.error) { toast.error(eData.error); router.push('/dashboard/engagements'); return; }
      setEngagement(eData.engagement);
      setFinancials(fData.financials || []);
    }).catch(() => toast.error('Failed to load engagement'))
    .finally(() => setLoading(false));
  }, [engagementId]);

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to update'); return; }
      setEngagement((e: any) => ({ ...e, status: newStatus }));
      toast.success('Status updated');
    } catch { toast.error('Network error'); }
    finally { setUpdatingStatus(false); }
  }

  function requestUpload(file: File) {
    if (!file) return;
    const hasExistingDoneTB = files.some(
      (f: any) => f.documentType === 'trial_balance' && f.processingStatus === 'done'
    );
    if (uploadDocType === 'trial_balance' && hasExistingDoneTB) {
      setPendingFile(file);
      setShowReplaceConfirm(true);
      return;
    }
    uploadFile(file);
  }

  async function uploadFile(file: File) {
    if (!file) return;
    setShowReplaceConfirm(false);
    setPendingFile(null);
    setUploading(true);
    setParseResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', uploadDocType);
      const res = await fetch(`/api/engagements/${engagementId}/files`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Upload failed'); return; }

      if (data.parsed) {
        setParseResult(data.parsed);
        toast.success(`Trial balance parsed: ${data.parsed.lineCount} accounts extracted`);
        if (data.parsed.warnings?.length) data.parsed.warnings.forEach((w: string) => toast.warning(w));
        const [eData, fData] = await Promise.all([
          fetch(`/api/engagements/${engagementId}`).then(r => r.json()),
          fetch(`/api/engagements/${engagementId}/financials`).then(r => r.json()),
        ]);
        setEngagement(eData.engagement);
        setFinancials(fData.financials || []);
      } else {
        toast.success(`${file.name} uploaded successfully`);
        const eData = await fetch(`/api/engagements/${engagementId}`).then(r => r.json());
        setEngagement(eData.engagement);
      }
    } catch { toast.error('Upload failed: network error'); }
    finally { setUploading(false); }
  }

  async function deleteFile(file: any) {
    setDeletingFileId(file.id);
    setConfirmDeleteFile(null);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/files?fileId=${file.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setEngagement((prev: any) => prev ? { ...prev, files: (prev.files || []).filter((f: any) => f.id !== file.id) } : prev);
          setFinancials([]);
          return;
        }
        toast.error(data.error || 'Delete failed'); return;
      }
      toast.success(data.clearedFinancials ? 'Trial balance and all extracted accounts deleted' : `${file.originalName} deleted`);
      const [eData, fData] = await Promise.all([
        fetch(`/api/engagements/${engagementId}`).then(r => r.json()),
        fetch(`/api/engagements/${engagementId}/financials`).then(r => r.json()).catch(() => ({ financials: [] })),
      ]);
      setEngagement(eData.engagement);
      setFinancials(fData.financials || []);
      setParseResult(null);
    } catch { toast.error('Delete failed: network error'); }
    finally { setDeletingFileId(null); }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) requestUpload(file);
  }

  if (loading) {
    return (
      <div className="p-7 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/2" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!engagement) return null;

  const statusInfo = STATUS_OPTIONS.find(s => s.value === engagement.status) || STATUS_OPTIONS[0];
  const client = engagement.client;
  const workingPapers: any[] = engagement.workingPapers || [];
  const files: any[] = engagement.files || [];
  const findings: any[] = engagement.findings || [];
  const tbFile = files.find((f: any) => f.documentType === 'trial_balance' && f.processingStatus === 'done');
  const hasTB = !!tbFile || financials.length > 0;

  const kes = (v: string | null) =>
    v ? `KES ${parseFloat(v).toLocaleString('en-KE', { minimumFractionDigits: 0 })}` : 'N/A';

  const byType: Record<string, number> = {};
  const byArea: Record<string, number> = {};
  for (const f of financials) {
    byType[f.accountType] = (byType[f.accountType] || 0) + 1;
    if (f.auditArea) byArea[f.auditArea] = (byArea[f.auditArea] || 0) + 1;
  }

  return (
    <div className="p-7 max-w-5xl mx-auto space-y-5">

      {/* Breadcrumb */}
      <nav className="text-xs flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
        <Link href="/dashboard/engagements" className="hover:text-slate-600 transition-colors">Engagements</Link>
        <ChevronRight size={11} />
        <span className="text-slate-700">{client?.name || 'Engagement'}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: statusInfo.bg, color: statusInfo.color }}
          >
            {(client?.name || 'U').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{client?.name}</h1>
            <p className="text-sm text-slate-500 capitalize">
              {engagement.auditType?.replace('_', ' ')} audit
              {engagement.engagementRef ? ` · ${engagement.engagementRef}` : ''}
              {' · '}FY {new Date(engagement.financialYearEnd).getFullYear()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: statusInfo.bg, color: statusInfo.color }}
          >
            {statusInfo.label}
          </span>
          <select
            value={engagement.status}
            onChange={e => updateStatus(e.target.value)}
            disabled={updatingStatus}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Key details */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { label: 'Financial year end', value: new Date(engagement.financialYearEnd).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }), sub: null },
            { label: 'Materiality', value: kes(engagement.materialityAmount), sub: engagement.materialityBasis || null },
            { label: 'Performance materiality', value: kes(engagement.performanceMateriality), sub: null },
            { label: 'Trivial threshold', value: kes(engagement.trivialThreshold), sub: null },
            { label: 'Entity type', value: client?.entityType?.replace(/_/g, ' ') || 'Not set', sub: null },
            { label: 'KRA PIN', value: client?.kraPin || 'Not set', sub: null },
            { label: 'Industry', value: client?.industry || 'Not set', sub: null },
            { label: 'Created', value: formatDate(engagement.createdAt), sub: null },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className="text-sm font-semibold text-slate-900 capitalize">{value}</p>
              {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Documents / Upload */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Upload size={15} className="text-blue-500" />
              Documents
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload a trial balance to enable AI working paper generation</p>
          </div>
          {hasTB && (
            <div className="flex items-center gap-2">
              {workingPapers.length > 0 && (
                <Link href={`/dashboard/engagements/${engagementId}/report`} className="btn-ghost">
                  <FileText size={13} /> Audit Report
                </Link>
              )}
              <Link href={`/dashboard/engagements/${engagementId}/working-papers`} className="btn-primary">
                Working Papers <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>

        {/* Doc type + upload button */}
        <div className="flex items-center gap-3 mb-3">
          <select
            value={uploadDocType}
            onChange={e => setUploadDocType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-ghost"
          >
            {uploading ? <><Loader2 size={13} className="animate-spin" /> Processing…</> : <><Upload size={13} /> Choose file</>}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) requestUpload(f); e.target.value = ''; }}
          />
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleFileDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`rounded-xl p-7 text-center cursor-pointer transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          style={{
            border: `2px dashed ${dragOver ? '#3b82f6' : 'rgba(148,163,184,0.35)'}`,
            background: dragOver ? 'rgba(59,130,246,0.04)' : 'rgba(248,250,252,0.6)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div>
              <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-slate-600 font-medium">Parsing trial balance…</p>
              <p className="text-xs text-slate-400 mt-1">Extracting accounts, calculating variances, flagging material items</p>
            </div>
          ) : (
            <div>
              <BarChart3 size={28} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600">Drop CSV or Excel here, or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">Supports QuickBooks, Sage, Xero, Tally exports · Max 20 MB</p>
            </div>
          )}
        </div>

        {/* Parse result */}
        {parseResult && (
          <div
            className="mt-4 rounded-xl p-4"
            style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}
          >
            <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-emerald-600" />
              Trial balance extracted and analysed
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
              {[
                { label: 'Accounts', value: parseResult.lineCount, warn: false },
                { label: 'Format', value: parseResult.detectedFormat, warn: false },
                { label: 'Material', value: parseResult.materialAccounts, warn: false },
                { label: 'Needs review', value: parseResult.needsReview ?? 0, warn: (parseResult.needsReview ?? 0) > 0 },
              ].map(i => (
                <div key={i.label}>
                  <span className="text-slate-500">{i.label}:</span>{' '}
                  <span className={`font-semibold ${i.warn ? 'text-amber-700' : 'text-slate-900'}`}>{i.value}</span>
                </div>
              ))}
            </div>
            {parseResult.analytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-emerald-100 mb-3">
                <div>
                  <span className="text-slate-500">Revenue:</span>{' '}
                  <span className="font-semibold text-slate-900">
                    {parseResult.analytics.totalRevenue > 0
                      ? `KES ${parseResult.analytics.totalRevenue.toLocaleString('en-KE', { maximumFractionDigits: 0 })}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Gross margin:</span>{' '}
                  <span className="font-semibold text-slate-900">
                    {parseResult.analytics.grossMargin != null ? `${parseResult.analytics.grossMargin.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Current ratio:</span>{' '}
                  <span className={`font-semibold ${parseResult.analytics.currentRatio == null ? 'text-slate-900' : parseResult.analytics.currentRatio >= 1 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {parseResult.analytics.currentRatio != null ? parseResult.analytics.currentRatio.toFixed(2) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Anomalies:</span>{' '}
                  <span className={`font-semibold ${parseResult.analytics.highRiskAnomalies > 0 ? 'text-red-600' : parseResult.analytics.anomalyCount > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {parseResult.analytics.anomalyCount} ({parseResult.analytics.highRiskAnomalies} high)
                  </span>
                </div>
              </div>
            )}
            {parseResult.warnings?.map((w: string, i: number) => (
              <p key={i} className="text-xs text-amber-700 mb-1">⚠ {w}</p>
            ))}
            <p className="text-xs text-emerald-700 mt-2 font-medium">
              Working papers ready →{' '}
              <Link href={`/dashboard/engagements/${engagementId}/working-papers`} className="underline">
                Generate Working Papers
              </Link>
            </p>
          </div>
        )}

        {/* Existing files */}
        {files.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {files.map((f: any) => (
              <div
                key={f.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(148,163,184,0.15)' }}
              >
                <div className="flex items-center gap-2">
                  {f.documentType === 'trial_balance'
                    ? <BarChart3 size={12} className="text-blue-500" />
                    : <Paperclip size={12} className="text-slate-400" />
                  }
                  <span className="font-medium text-slate-700">{f.originalName}</span>
                  <span className="text-slate-400">{(f.sizeBytes / 1024).toFixed(0)} KB</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="capitalize text-slate-400">{f.documentType?.replace(/_/g, ' ')}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-medium"
                    style={
                      f.processingStatus === 'done'
                        ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                        : f.processingStatus === 'failed'
                        ? { background: 'rgba(239,68,68,0.1)', color: '#dc2626' }
                        : { background: 'rgba(251,191,36,0.1)', color: '#d97706' }
                    }
                  >
                    {f.processingStatus}
                  </span>
                  <button
                    onClick={() => setConfirmDeleteFile(f)}
                    disabled={deletingFileId === f.id}
                    className="text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors ml-1"
                    title="Delete file"
                  >
                    {deletingFileId === f.id ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trial balance data */}
      {financials.length > 0 && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp size={15} className="text-blue-500" />
                Trial Balance
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {financials.length} accounts &nbsp;·&nbsp;
                {financials.filter((f: any) => f.isMaterial).length} material &nbsp;·&nbsp;
                {financials.filter((f: any) => f.isFlagged).length} flagged
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {Object.entries(byType).map(([type, count]) => (
                <span
                  key={type}
                  className="px-2 py-0.5 rounded-full capitalize"
                  style={{ background: 'rgba(148,163,184,0.12)', color: '#64748b' }}
                >
                  {type}: {count as number}
                </span>
              ))}
            </div>
          </div>

          {/* Audit area chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(byArea).map(([area, count]) => (
              <span
                key={area}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}
              >
                {AUDIT_AREA_LABELS[area] || area} ({count as number})
              </span>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-auto rounded-xl" style={{ maxHeight: '420px' }}>
            <table className="min-w-max w-full text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-10" style={{ background: 'rgba(248,250,252,0.95)' }}>
                <tr className="text-left text-slate-400">
                  {['Account', 'Area', 'CY Balance', 'PY Balance', 'Var %', 'Flags'].map(h => (
                    <th key={h} className="pb-2 pt-2 px-2 font-medium" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...financials]
                  .sort((a, b) => {
                    if (a.isFlagged !== b.isFlagged) return a.isFlagged ? -1 : 1;
                    if (a.isMaterial !== b.isMaterial) return a.isMaterial ? -1 : 1;
                    return Math.abs(parseFloat(b.currentYearBalance)) - Math.abs(parseFloat(a.currentYearBalance));
                  })
                  .map((f: any) => {
                    const bal = parseFloat(f.currentYearBalance);
                    const py = f.priorYearBalance ? parseFloat(f.priorYearBalance) : null;
                    const varPct = f.variancePct ? parseFloat(f.variancePct) : null;
                    return (
                      <tr
                        key={f.id}
                        className="hover:bg-slate-50/60 transition-colors"
                        style={{
                          borderBottom: '1px solid rgba(148,163,184,0.07)',
                          background: f.isFlagged ? 'rgba(251,191,36,0.04)' : f.isMaterial ? 'rgba(59,130,246,0.02)' : undefined,
                        }}
                      >
                        <td className="py-1.5 px-2">
                          {f.accountCode && <span className="text-slate-300 mr-1 font-mono">{f.accountCode}</span>}
                          <span className="text-slate-700">{f.accountName}</span>
                        </td>
                        <td className="py-1.5 px-2 text-slate-400">
                          {f.auditArea ? (AUDIT_AREA_LABELS[f.auditArea] || f.auditArea) : '-'}
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono tabular-nums ${bal < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                          {bal.toLocaleString('en-KE', { minimumFractionDigits: 0 })}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono tabular-nums text-slate-400">
                          {py !== null ? py.toLocaleString('en-KE', { minimumFractionDigits: 0 }) : '-'}
                        </td>
                        <td className={`py-1.5 px-2 text-right tabular-nums ${varPct !== null && Math.abs(varPct) > 20 ? 'text-amber-500 font-medium' : 'text-slate-400'}`}>
                          {varPct !== null ? `${varPct > 0 ? '+' : ''}${varPct.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="flex gap-1">
                            {f.isMaterial && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>M</span>
                            )}
                            {f.isFlagged && (
                              <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(251,191,36,0.12)', color: '#d97706' }} title={f.flagReason}>⚑</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-300 mt-2 text-right">{financials.length} accounts</p>
        </div>
      )}

      {/* Delete file modal */}
      {confirmDeleteFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ background: 'white' }}>
            <h2 className="text-base font-semibold text-slate-900 mb-2">Delete file?</h2>
            <p className="text-sm text-slate-600 mb-4">
              <span className="font-medium text-slate-900">{confirmDeleteFile.originalName}</span>
              {confirmDeleteFile.documentType === 'trial_balance' && (
                <span className="block mt-1 text-amber-700">
                  This will also remove all {financials.length} extracted account lines.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteFile(null)}
                className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteFile(confirmDeleteFile)}
                className="text-sm text-white px-4 py-2 rounded-lg transition-colors"
                style={{ background: '#dc2626' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace TB modal */}
      {showReplaceConfirm && pendingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ background: 'white' }}>
            <h2 className="text-base font-semibold text-slate-900 mb-2">Replace existing trial balance?</h2>
            <p className="text-sm text-slate-600 mb-1">A trial balance has already been processed ({financials.length} accounts).</p>
            <p className="text-sm text-slate-600 mb-4">Uploading <span className="font-medium text-slate-900">{pendingFile.name}</span> will:</p>
            <ul className="text-sm text-slate-700 space-y-1 mb-5 ml-4 list-disc">
              <li>Delete all {financials.length} existing extracted account lines</li>
              <li>Re-run the classification and analytics engine</li>
              <li>Previously generated working papers should be regenerated</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowReplaceConfirm(false); setPendingFile(null); }}
                className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => uploadFile(pendingFile)}
                className="text-sm text-white px-4 py-2 rounded-lg transition-colors"
                style={{ background: '#dc2626' }}>
                Replace trial balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Status strip – quick counts ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-xs text-slate-400 mb-1">Working Papers</p>
          <p className="text-2xl font-bold text-slate-900">{workingPapers.length}<span className="text-sm font-normal text-slate-400"> / 15</span></p>
          <p className="text-xs text-slate-400 mt-0.5">{workingPapers.filter((p: any) => p.reviewed).length} reviewed</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-xs text-slate-400 mb-1">Mgmt Letter findings</p>
          <p className="text-2xl font-bold text-slate-900">{findings.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{findings.filter((f: any) => f.priority === 'high').length} high priority</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-xs text-slate-400 mb-1">Documents uploaded</p>
          <p className="text-2xl font-bold text-slate-900">{files.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{files.filter((f: any) => f.processingStatus === 'done').length} processed</p>
        </div>
        <div className="rounded-2xl p-4" style={cardStyle}>
          <p className="text-xs text-slate-400 mb-1">TB accounts</p>
          <p className="text-2xl font-bold text-slate-900">{financials.length || '-'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{financials.filter((f: any) => f.isMaterial).length} material</p>
        </div>
      </div>



    </div>
  );
}
