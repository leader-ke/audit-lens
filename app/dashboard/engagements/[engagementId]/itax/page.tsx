'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Receipt, Loader2, AlertTriangle, CheckCircle, Calculator,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ItaxReconciliation {
  id: string;
  taxYear: number;
  vatRevenueBase: string | null;
  vatExpectedOutput: string | null;
  vatPerTb: string | null;
  vatDifference: string | null;
  vatObservations: string[];
  payePayrollBase: string | null;
  payePerTb: string | null;
  payeDifference: string | null;
  payeObservations: string[];
  corpTaxPbt: string | null;
  corpTaxExpected: string | null;
  corpTaxPerTb: string | null;
  corpTaxDifference: string | null;
  corpTaxObservations: string[];
  overallRiskLevel: 'low' | 'medium' | 'high' | null;
  summary: string | null;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(s: string | null | undefined): number {
  if (s === null || s === undefined) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtKes(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return 'KES -';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return 'KES -';
  return 'KES ' + n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diffVariant(diff: string | null, expected: string | null): 'green' | 'amber' | 'red' {
  const d = toNum(diff);
  const e = toNum(expected);
  if (e === 0) return 'amber';
  const pct = Math.abs(d) / e;
  if (pct <= 0.05) return 'green';
  if (pct <= 0.20) return 'amber';
  return 'red';
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

// ── Risk badge ────────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string | null }) {
  const cfg = {
    low:    { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Low Risk' },
    medium: { bg: 'rgba(251,191,36,0.15)',  color: '#d97706', label: 'Medium Risk' },
    high:   { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626', label: 'High Risk' },
  }[level ?? 'medium'] ?? { bg: 'rgba(148,163,184,0.12)', color: '#64748b', label: 'Unknown' };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

// ── Observation chips ─────────────────────────────────────────────────────────

function ObservationList({ observations }: { observations: string[] }) {
  if (!observations || observations.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {observations.map((obs, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ background: 'rgba(251,191,36,0.13)', color: '#92400e', border: '1px solid rgba(251,191,36,0.25)' }}
        >
          <AlertTriangle size={10} className="flex-shrink-0" />
          {obs}
        </span>
      ))}
    </div>
  );
}

// ── Tax row ───────────────────────────────────────────────────────────────────

function TaxRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className="text-sm font-semibold font-mono tabular-nums"
        style={{ color: valueColor ?? '#1e293b' }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Tax section card ──────────────────────────────────────────────────────────

function TaxSectionCard({
  title,
  icon,
  accentColor,
  rows,
  difference,
  expected,
  observations,
}: {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  rows: { label: string; value: string; valueColor?: string }[];
  difference: string | null;
  expected: string | null;
  observations: string[];
}) {
  const variant = diffVariant(difference, expected);
  const diffColors = {
    green: { color: '#059669', bg: 'rgba(16,185,129,0.09)', border: 'rgba(16,185,129,0.2)' },
    amber: { color: '#d97706', bg: 'rgba(251,191,36,0.09)', border: 'rgba(251,191,36,0.25)' },
    red:   { color: '#dc2626', bg: 'rgba(239,68,68,0.09)',  border: 'rgba(239,68,68,0.2)' },
  }[variant];

  const diffNum = toNum(difference);
  const diffSign = diffNum > 0 ? '+' : diffNum < 0 ? '' : '';

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.1)', background: 'rgba(248,250,252,0.6)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: accentColor }}
        >
          {icon}
        </div>
        <h2 className="font-bold text-slate-900 text-base">{title}</h2>
      </div>

      {/* Rows */}
      <div className="px-5 py-1">
        {rows.map((row, i) => (
          <TaxRow key={i} label={row.label} value={row.value} valueColor={row.valueColor} />
        ))}

        {/* Difference highlight */}
        <div
          className="flex items-center justify-between px-3 py-2.5 rounded-xl mt-3"
          style={{ background: diffColors.bg, border: `1px solid ${diffColors.border}` }}
        >
          <span className="text-sm font-medium" style={{ color: diffColors.color }}>
            Difference (expected vs TB)
          </span>
          <span
            className="text-sm font-bold font-mono tabular-nums"
            style={{ color: diffColors.color }}
          >
            {diffSign}{fmtKes(difference)}
          </span>
        </div>

        {/* Observations */}
        <ObservationList observations={observations} />
        <div className="pb-4" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onCompute, computing }: { onCompute: () => void; computing: boolean }) {
  return (
    <div
      className="rounded-2xl p-10 flex flex-col items-center text-center gap-4"
      style={cardStyle}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(99,102,241,0.1)' }}
      >
        <Calculator size={26} style={{ color: '#6366f1' }} />
      </div>
      <div>
        <h2 className="font-bold text-slate-900 text-lg mb-1">No reconciliation computed yet</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Run the reconciliation engine to compare expected VAT, PAYE, and Corporate Tax
          against what is recorded in the trial balance.
        </p>
      </div>
      <button
        type="button"
        onClick={onCompute}
        disabled={computing}
        className="btn-primary"
      >
        {computing ? (
          <><Loader2 size={13} className="animate-spin" /> Computing...</>
        ) : (
          <><Calculator size={13} /> Compute iTax Reconciliation</>
        )}
      </button>
      <p className="text-xs text-slate-400 max-w-sm">
        Requires an uploaded and processed trial balance. Uses Kenya statutory tax rates.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ItaxPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();

  const [recon, setRecon] = useState<ItaxReconciliation | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    fetch(`/api/engagements/${engagementId}/itax`)
      .then(r => r.json())
      .then(data => {
        if (data.reconciliation) setRecon(data.reconciliation);
      })
      .catch(() => toast.error('Failed to load iTax reconciliation'))
      .finally(() => setLoading(false));
  }, [engagementId]);

  async function handleCompute() {
    setComputing(true);
    try {
      const res = await fetch(`/api/engagements/${engagementId}/itax`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Computation failed');
        return;
      }
      setRecon(data.reconciliation);
      toast.success('iTax reconciliation computed successfully');
    } catch {
      toast.error('Network error - computation failed');
    } finally {
      setComputing(false);
    }
  }

  const vatExpected = recon?.vatExpectedOutput ?? null;
  const payeExpected = recon
    ? String(toNum(recon.payePayrollBase) * 0.25)
    : null;

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
            style={{ background: 'rgba(99,102,241,0.1)' }}
          >
            <Receipt size={17} style={{ color: '#6366f1' }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              KRA iTax Reconciliation
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              TB vs expected tax liability
              {recon ? ` - Tax Year ${recon.taxYear}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {recon && <RiskBadge level={recon.overallRiskLevel} />}
          <button
            type="button"
            onClick={handleCompute}
            disabled={computing}
            className="btn-primary"
          >
            {computing ? (
              <><Loader2 size={13} className="animate-spin" /> Computing...</>
            ) : (
              <><Calculator size={13} /> {recon ? 'Recompute' : 'Compute'}</>
            )}
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl skeleton" />
              ))}
            </div>
          ) : !recon ? (
            <EmptyState onCompute={handleCompute} computing={computing} />
          ) : (
            <>
              {/* Summary banner */}
              {recon.summary && (
                <div
                  className="rounded-2xl px-5 py-4 flex items-start gap-3"
                  style={{
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.15)',
                  }}
                >
                  <Receipt size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#6366f1' }} />
                  <p className="text-sm text-slate-700 leading-relaxed">{recon.summary}</p>
                </div>
              )}

              {/* VAT card */}
              <TaxSectionCard
                title="Value Added Tax (VAT) - 16%"
                icon={<Receipt size={16} style={{ color: '#3b82f6' }} />}
                accentColor="rgba(59,130,246,0.1)"
                rows={[
                  {
                    label: 'Revenue base (all revenue accounts)',
                    value: fmtKes(recon.vatRevenueBase),
                  },
                  {
                    label: 'Expected output VAT (16% of revenue)',
                    value: fmtKes(recon.vatExpectedOutput),
                    valueColor: '#2563eb',
                  },
                  {
                    label: 'VAT payable per TB',
                    value: fmtKes(recon.vatPerTb),
                  },
                ]}
                difference={recon.vatDifference}
                expected={vatExpected}
                observations={recon.vatObservations ?? []}
              />

              {/* PAYE card */}
              <TaxSectionCard
                title="PAYE (Pay As You Earn) - 25% blended"
                icon={<Receipt size={16} style={{ color: '#8b5cf6' }} />}
                accentColor="rgba(139,92,246,0.1)"
                rows={[
                  {
                    label: 'Payroll base (payroll-area expense accounts)',
                    value: fmtKes(recon.payePayrollBase),
                  },
                  {
                    label: 'Estimated PAYE (25% of payroll)',
                    value: fmtKes(toNum(recon.payePayrollBase) * 0.25),
                    valueColor: '#7c3aed',
                  },
                  {
                    label: 'PAYE payable per TB',
                    value: fmtKes(recon.payePerTb),
                  },
                ]}
                difference={recon.payeDifference}
                expected={payeExpected}
                observations={recon.payeObservations ?? []}
              />

              {/* Corporate Tax card */}
              <TaxSectionCard
                title="Corporate Tax (30% rate, Kenya)"
                icon={<Receipt size={16} style={{ color: '#059669' }} />}
                accentColor="rgba(16,185,129,0.1)"
                rows={[
                  {
                    label: 'Pre-tax profit (revenue minus expenses)',
                    value: fmtKes(recon.corpTaxPbt),
                    valueColor: toNum(recon.corpTaxPbt) < 0 ? '#dc2626' : '#1e293b',
                  },
                  {
                    label: 'Expected tax (30% of PBT or 1% min tax, higher of)',
                    value: fmtKes(recon.corpTaxExpected),
                    valueColor: '#059669',
                  },
                  {
                    label: 'Tax expense per TB',
                    value: fmtKes(recon.corpTaxPerTb),
                  },
                ]}
                difference={recon.corpTaxDifference}
                expected={recon.corpTaxExpected}
                observations={recon.corpTaxObservations ?? []}
              />

              {/* Overall risk section */}
              <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap" style={cardStyle}>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">Overall Tax Risk</p>
                  <p className="text-xs text-slate-400">
                    Derived from magnitude of tax gaps across VAT, PAYE, and Corporate Tax
                  </p>
                </div>
                <RiskBadge level={recon.overallRiskLevel} />
              </div>

              {/* Disclaimer */}
              <div
                className="rounded-2xl px-5 py-4 flex items-start gap-3"
                style={{
                  background: 'rgba(251,191,36,0.07)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">
                    For audit planning purposes only
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    This reconciliation is not a substitute for actual KRA iTax returns or a formal
                    tax computation. Figures are indicative estimates based on standard Kenya tax
                    rates applied to trial balance balances. Zero-rated and exempt VAT supplies,
                    personal income tax exemptions, capital allowances, tax losses carried forward,
                    and other adjustments are not reflected. Engage a qualified tax advisor for
                    formal compliance matters.
                  </p>
                </div>
              </div>

              {/* Recompute note */}
              <p className="text-xs text-center text-slate-400 pb-2">
                Last computed based on current trial balance data. Use Recompute after uploading
                updated TB data.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
