'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Landmark, Upload, Loader2, CheckCircle, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedTransaction {
  date: string;
  description: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
  rawLine: string;
  isFlagged?: boolean;
  flagReasons?: string[];
}

interface MatchedItem {
  bankTxn: ParsedTransaction;
  flagReasons: string[];
}

interface Reconciliation {
  id: string;
  accountName: string;
  bankClosingBalance: string | null;
  tbCashBalance: string | null;
  difference: string | null;
  transactions: ParsedTransaction[];
  matchedItems: MatchedItem[];
  unmatchedBankItems: ParsedTransaction[];
  isReconciled: boolean;
  notes: string | null;
  version: number;
  updatedAt: string;
}

type TabKey = 'unmatched' | 'all' | 'flagged';
type SortDir = 'asc' | 'desc' | null;
type SortCol = 'date' | 'description' | 'debit' | 'credit' | 'balance' | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '-';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '-';
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  variant = 'neutral',
}: {
  label: string;
  value: string;
  variant?: 'neutral' | 'red' | 'green';
}) {
  const colors = {
    neutral: { bg: 'rgba(59,130,246,0.07)', color: '#1e40af' },
    red:     { bg: 'rgba(239,68,68,0.08)',  color: '#dc2626' },
    green:   { bg: 'rgba(16,185,129,0.08)', color: '#059669' },
  }[variant];

  return (
    <div
      className="flex-1 rounded-2xl p-4 min-w-0"
      style={{ ...cardStyle, background: colors.bg }}
    >
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums truncate" style={{ color: colors.color }}>
        {value}
      </p>
    </div>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────

function TxnRow({ txn, showFlags }: { txn: ParsedTransaction; showFlags?: boolean }) {
  return (
    <tr
      className="transition-colors hover:bg-slate-50/60"
      style={{
        background: txn.isFlagged ? 'rgba(251,191,36,0.04)' : undefined,
        borderBottom: '1px solid rgba(148,163,184,0.07)',
      }}
    >
      <td className="py-2 px-3 text-xs text-slate-500 whitespace-nowrap font-mono">
        {fmtDate(txn.date)}
      </td>
      <td className="py-2 px-3 text-xs text-slate-700 max-w-xs truncate">
        {txn.description || '-'}
      </td>
      <td className="py-2 px-3 text-xs text-right font-mono tabular-nums text-red-600">
        {txn.debit !== null ? fmt(txn.debit) : ''}
      </td>
      <td className="py-2 px-3 text-xs text-right font-mono tabular-nums text-emerald-700">
        {txn.credit !== null ? fmt(txn.credit) : ''}
      </td>
      <td className="py-2 px-3 text-xs text-right font-mono tabular-nums text-slate-600">
        {txn.balance !== null ? fmt(txn.balance) : '-'}
      </td>
      {showFlags && (
        <td className="py-2 px-3 text-xs max-w-xs">
          {txn.isFlagged && txn.flagReasons && txn.flagReasons.length > 0 ? (
            <span
              className="inline-block px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ background: 'rgba(251,191,36,0.15)', color: '#b45309' }}
              title={txn.flagReasons.join('; ')}
            >
              {txn.flagReasons[0].length > 40
                ? txn.flagReasons[0].slice(0, 40) + '...'
                : txn.flagReasons[0]}
            </span>
          ) : null}
        </td>
      )}
    </tr>
  );
}

// ── Sortable table header ─────────────────────────────────────────────────────

function SortTh({
  col,
  label,
  sortCol,
  sortDir,
  onSort,
  className = '',
}: {
  col: SortCol;
  label: string;
  sortCol: SortCol;
  sortDir: SortDir;
  onSort: (col: SortCol) => void;
  className?: string;
}) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`pb-2 pt-2 px-3 font-medium cursor-pointer select-none whitespace-nowrap ${className}`}
      style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: active ? '#3b82f6' : '#94a3b8' }}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
        ) : (
          <ChevronsUpDown size={11} className="opacity-40" />
        )}
      </span>
    </th>
  );
}

// ── Unmatched item card ───────────────────────────────────────────────────────

function UnmatchedCard({ txn }: { txn: ParsedTransaction }) {
  const hints: string[] = [];

  const amount = txn.debit ?? txn.credit ?? 0;
  if (amount > 0) {
    hints.push('Check TB for matching entry around this date');
  }
  const day = txn.date ? parseInt(txn.date.slice(8, 10), 10) : 0;
  if (day >= 28) hints.push('Late-month entry - possible timing difference');
  if (txn.description?.toLowerCase().includes('chq') || txn.description?.toLowerCase().includes('cheque')) {
    hints.push('Cheque - may be outstanding in TB');
  }
  if (txn.description?.toLowerCase().includes('deposit')) {
    hints.push('Deposit - verify TB receipt posting');
  }
  if (hints.length === 0) hints.push('No matching TB entry identified');

  return (
    <div
      className="rounded-xl px-4 py-3 flex flex-col gap-1"
      style={{
        background: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(148,163,184,0.12)',
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-mono text-slate-400 flex-shrink-0">
            {fmtDate(txn.date)}
          </span>
          <span className="text-sm text-slate-800 font-medium truncate">
            {txn.description || '(no description)'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {txn.debit !== null && (
            <span className="text-sm font-bold font-mono text-red-600">
              -{fmt(txn.debit)}
            </span>
          )}
          {txn.credit !== null && (
            <span className="text-sm font-bold font-mono text-emerald-700">
              +{fmt(txn.credit)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {hints.map((h, i) => (
          <span
            key={i}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.08)', color: '#3b82f6' }}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({
  onFile,
  uploading,
}: {
  onFile: (f: File) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`rounded-2xl p-10 text-center cursor-pointer transition-all ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      style={{
        border: `2px dashed ${dragOver ? '#3b82f6' : 'rgba(148,163,184,0.35)'}`,
        background: dragOver ? 'rgba(59,130,246,0.04)' : 'rgba(248,250,252,0.6)',
      }}
    >
      {uploading ? (
        <div>
          <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Parsing bank statement...</p>
          <p className="text-xs text-slate-400 mt-1">Detecting columns, parsing transactions, running matching</p>
        </div>
      ) : (
        <div>
          <Landmark size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Drop CSV bank statement here, or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">Supports most bank CSV exports - auto-detects columns</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BankReconciliationPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();

  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [togglingRecon, setTogglingRecon] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('unmatched');
  const [sortCol, setSortCol] = useState<SortCol>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Load reconciliation on mount
  useEffect(() => {
    fetch(`/api/engagements/${engagementId}/bank-reconciliation`)
      .then(r => r.json())
      .then(data => {
        if (data.reconciliation) {
          setRecon(data.reconciliation);
          setNotes(data.reconciliation.notes ?? '');
        }
      })
      .catch(() => toast.error('Failed to load reconciliation'))
      .finally(() => setLoading(false));
  }, [engagementId]);

  // Upload CSV
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only CSV files are supported');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/engagements/${engagementId}/bank-reconciliation`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        if (data.warnings?.length) data.warnings.forEach((w: string) => toast.warning(w));
        return;
      }
      setRecon(data.reconciliation);
      setNotes(data.reconciliation.notes ?? '');
      toast.success(
        `Parsed ${data.stats.totalTransactions} transactions - ${data.stats.flaggedCount} flagged`,
      );
      if (data.parseWarnings?.length) {
        data.parseWarnings.forEach((w: string) => toast.warning(w));
      }
      if (Math.abs(data.stats.difference) < 0.01) {
        toast.success('Bank statement reconciles with TB cash balance');
      } else {
        toast.warning(
          `Difference of ${fmt(Math.abs(data.stats.difference))} - review unmatched items`,
        );
      }
    } catch {
      toast.error('Upload failed: network error');
    } finally {
      setUploading(false);
    }
  }, [engagementId]);

  // Toggle isReconciled
  async function toggleReconciled() {
    if (!recon) return;
    setTogglingRecon(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/bank-reconciliation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReconciled: !recon.isReconciled }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to update'); return; }
      setRecon(data.reconciliation);
      toast.success(data.reconciliation.isReconciled ? 'Marked as reconciled' : 'Marked as unreconciled');
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingRecon(false);
    }
  }

  // Save notes on blur
  async function saveNotes() {
    if (!recon || notes === (recon.notes ?? '')) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/bank-reconciliation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to save notes'); return; }
      setRecon(data.reconciliation);
      toast.success('Notes saved');
    } catch {
      toast.error('Network error');
    } finally {
      setSavingNotes(false);
    }
  }

  // Sorting
  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  function sortTxns(txns: ParsedTransaction[]): ParsedTransaction[] {
    if (!sortCol) return txns;
    return [...txns].sort((a, b) => {
      let va: string | number | null = null;
      let vb: string | number | null = null;
      if (sortCol === 'date') { va = a.date; vb = b.date; }
      else if (sortCol === 'description') { va = a.description; vb = b.description; }
      else if (sortCol === 'debit') { va = a.debit; vb = b.debit; }
      else if (sortCol === 'credit') { va = a.credit; vb = b.credit; }
      else if (sortCol === 'balance') { va = a.balance; vb = b.balance; }

      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  // Derived data
  const transactions = recon?.transactions ?? [];
  const unmatchedItems = recon?.unmatchedBankItems ?? [];
  const flaggedItems: ParsedTransaction[] = (recon?.matchedItems ?? []).map((mi: MatchedItem) => ({
    ...mi.bankTxn,
    isFlagged: true,
    flagReasons: mi.flagReasons,
  }));

  const bankBal = recon?.bankClosingBalance ? parseFloat(recon.bankClosingBalance) : null;
  const tbBal = recon?.tbCashBalance ? parseFloat(recon.tbCashBalance) : null;
  const diff = recon?.difference ? parseFloat(recon.difference) : null;
  const diffVariant = diff === null ? 'neutral' : Math.abs(diff) < 0.01 ? 'green' : 'red';

  const sortedAll = sortTxns(transactions);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Pinned header */}
      <header
        className="flex-shrink-0 flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 flex-wrap"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/engagements/${engagementId}`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mr-1 flex-shrink-0"
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(59,130,246,0.09)' }}
          >
            <Landmark size={17} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight">Bank Reconciliation</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {recon
                ? `${recon.accountName} - v${recon.version} - last updated ${fmtDate(recon.updatedAt.slice(0, 10))}`
                : 'Upload a bank statement CSV to begin'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {recon && (
            <button
              type="button"
              onClick={toggleReconciled}
              disabled={togglingRecon}
              className={recon.isReconciled ? 'btn-primary' : 'btn-ghost'}
            >
              {togglingRecon ? (
                <Loader2 size={13} className="animate-spin" />
              ) : recon.isReconciled ? (
                <><CheckCircle size={13} /> Reconciled</>
              ) : (
                <><CheckCircle size={13} /> Mark Reconciled</>
              )}
            </button>
          )}
          <label className="btn-ghost cursor-pointer">
            {uploading
              ? <><Loader2 size={13} className="animate-spin" /> Processing...</>
              : <><Upload size={13} /> Upload CSV</>
            }
            <input
              type="file"
              accept=".csv"
              className="hidden"
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
          </label>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-2xl skeleton" />
              ))}
            </div>
          ) : !recon ? (
            /* No reconciliation yet - show drop zone */
            <div className="rounded-2xl p-6" style={cardStyle}>
              <div className="mb-5">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
                  <Landmark size={15} className="text-blue-500" />
                  Upload Bank Statement
                </h2>
                <p className="text-xs text-slate-500">
                  Upload a CSV export from your client bank account. Columns will be auto-detected.
                </p>
              </div>
              <DropZone onFile={handleFile} uploading={uploading} />
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="flex gap-4 flex-wrap">
                <StatCard
                  label="Bank Closing Balance"
                  value={bankBal !== null ? fmt(bankBal) : 'N/A'}
                  variant="neutral"
                />
                <StatCard
                  label="TB Cash Balance"
                  value={tbBal !== null ? fmt(tbBal) : 'N/A'}
                  variant="neutral"
                />
                <StatCard
                  label="Difference"
                  value={diff !== null ? fmt(Math.abs(diff)) : 'N/A'}
                  variant={diffVariant}
                />
              </div>

              {/* Upload new / notes */}
              <div className="rounded-2xl p-5 flex flex-col sm:flex-row gap-4" style={cardStyle}>
                <div className="flex-1 min-w-0">
                  <label className="text-xs font-medium text-slate-500 block mb-1.5">
                    Reconciliation notes
                  </label>
                  <textarea
                    className="input h-auto resize-none text-sm"
                    style={{ minHeight: 68, paddingTop: 8, paddingBottom: 8 }}
                    placeholder="Add notes about timing differences, outstanding cheques, etc."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onBlur={saveNotes}
                  />
                  {savingNotes && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Loader2 size={10} className="animate-spin" /> Saving...
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-end">
                  <DropZone onFile={handleFile} uploading={uploading} />
                </div>
              </div>

              {/* Tabs */}
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {/* Tab bar */}
                <div
                  className="flex border-b border-slate-100"
                  style={{ background: 'rgba(248,250,252,0.8)' }}
                >
                  {(
                    [
                      { key: 'unmatched', label: 'Unmatched Items', count: unmatchedItems.length },
                      { key: 'all',       label: 'All Transactions', count: transactions.length },
                      { key: 'flagged',   label: 'Flagged',          count: flaggedItems.length },
                    ] as { key: TabKey; label: string; count: number }[]
                  ).map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
                      style={{
                        borderBottomColor: activeTab === tab.key ? '#3b82f6' : 'transparent',
                        color: activeTab === tab.key ? '#2563eb' : '#64748b',
                      }}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={
                            activeTab === tab.key
                              ? { background: 'rgba(59,130,246,0.15)', color: '#2563eb' }
                              : { background: 'rgba(148,163,184,0.12)', color: '#64748b' }
                          }
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-4">

                  {/* Unmatched tab */}
                  {activeTab === 'unmatched' && (
                    unmatchedItems.length === 0 ? (
                      <div className="py-12 text-center">
                        <CheckCircle size={28} className="text-emerald-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-700">No unmatched items</p>
                        <p className="text-xs text-slate-400 mt-1">
                          All bank transactions have a corresponding TB entry
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 mb-3">
                          {unmatchedItems.length} bank transaction{unmatchedItems.length !== 1 ? 's' : ''} with no direct match in the trial balance
                        </p>
                        {unmatchedItems.map((txn, i) => (
                          <UnmatchedCard key={i} txn={txn} />
                        ))}
                      </div>
                    )
                  )}

                  {/* All transactions tab */}
                  {activeTab === 'all' && (
                    transactions.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-sm text-slate-400">No transactions</p>
                      </div>
                    ) : (
                      <div className="overflow-auto rounded-xl">
                        <table className="min-w-max w-full text-xs border-separate border-spacing-0">
                          <thead className="sticky top-0 z-10" style={{ background: 'rgba(248,250,252,0.97)' }}>
                            <tr className="text-left">
                              <SortTh col="date"        label="Date"        sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                              <SortTh col="description" label="Description" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                              <SortTh col="debit"       label="Debit"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                              <SortTh col="credit"      label="Credit"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                              <SortTh col="balance"     label="Balance"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-right" />
                            </tr>
                          </thead>
                          <tbody>
                            {sortedAll.map((txn, i) => (
                              <TxnRow key={i} txn={txn} />
                            ))}
                          </tbody>
                        </table>
                        <p className="text-xs text-slate-300 mt-2 text-right">
                          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )
                  )}

                  {/* Flagged tab */}
                  {activeTab === 'flagged' && (
                    flaggedItems.length === 0 ? (
                      <div className="py-12 text-center">
                        <CheckCircle size={28} className="text-emerald-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-700">No flagged transactions</p>
                        <p className="text-xs text-slate-400 mt-1">
                          No round-number, large withdrawal, or unusual description items detected
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-slate-400 mb-3">
                          {flaggedItems.length} transaction{flaggedItems.length !== 1 ? 's' : ''} flagged for review
                        </p>
                        <div className="overflow-auto rounded-xl">
                          <table className="min-w-max w-full text-xs border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10" style={{ background: 'rgba(248,250,252,0.97)' }}>
                              <tr className="text-left">
                                <th className="pb-2 pt-2 px-3 font-medium whitespace-nowrap" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>Date</th>
                                <th className="pb-2 pt-2 px-3 font-medium" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>Description</th>
                                <th className="pb-2 pt-2 px-3 font-medium text-right" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>Debit</th>
                                <th className="pb-2 pt-2 px-3 font-medium text-right" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>Credit</th>
                                <th className="pb-2 pt-2 px-3 font-medium text-right" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>Balance</th>
                                <th className="pb-2 pt-2 px-3 font-medium" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>Flag reason</th>
                              </tr>
                            </thead>
                            <tbody>
                              {flaggedItems.map((txn, i) => (
                                <TxnRow key={i} txn={txn} showFlags />
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div
                          className="mt-3 p-3 rounded-xl flex items-start gap-2"
                          style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}
                        >
                          <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-amber-800">
                            Flagged transactions include: round-number amounts over KES 100,000, large withdrawals over KES 500,000, late-month entries (day 28+), and descriptions containing CASH, WITHDRAWAL, REVERSAL, or similar terms. These should be investigated and documented in the working papers.
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
