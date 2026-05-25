'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, ArrowLeft, CheckCircle2, Clock, AlertCircle, MinusCircle } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type DeadlineStatus = 'pending' | 'filed' | 'overdue' | 'not_applicable';

interface Deadline {
  id: string;
  engagementId: string;
  orgId: string;
  deadlineType: string;
  label: string;
  authority: string;
  dueDate: string;
  status: DeadlineStatus;
  notes: string | null;
  filedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<DeadlineStatus, DeadlineStatus> = {
  pending: 'filed',
  filed: 'not_applicable',
  not_applicable: 'pending',
  overdue: 'filed',
};

/** Format a date string as "20 Apr 2025" */
function formatDeadlineDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Returns days remaining (positive = future, negative = past). */
function daysFromNow(iso: string): number {
  const due = new Date(iso);
  const now = new Date();
  // Strip time from both
  due.setUTCHours(0, 0, 0, 0);
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - todayUTC) / (1000 * 60 * 60 * 24));
}

type DotColor = 'red' | 'amber' | 'green' | 'grey';

function getDotColor(d: Deadline): DotColor {
  if (d.status === 'not_applicable') return 'grey';
  if (d.status === 'filed') return 'green';
  if (d.status === 'overdue') return 'red';
  // pending - check days
  const days = daysFromNow(d.dueDate);
  if (days < 0) return 'red';
  if (days <= 30) return 'amber';
  return 'grey';
}

const DOT_STYLES: Record<DotColor, string> = {
  red: 'bg-red-500',
  amber: 'bg-amber-400',
  green: 'bg-emerald-500',
  grey: 'bg-slate-300',
};

interface StatusChipProps {
  status: DeadlineStatus;
  dueDate: string;
  onClick?: () => void;
  disabled?: boolean;
}

function StatusChip({ status, dueDate, onClick, disabled }: StatusChipProps) {
  const buttonProps = onClick
    ? { role: 'button' as const, onClick, title: 'Click to update status', tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick(); },
        style: { cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 } }
    : {};

  if (status === 'filed') {
    return (
      <span
        {...buttonProps}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:brightness-95 transition-all"
        style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', ...buttonProps.style }}
      >
        <CheckCircle2 size={10} />
        Filed
      </span>
    );
  }
  if (status === 'not_applicable') {
    return (
      <span
        {...buttonProps}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:brightness-95 transition-all"
        style={{ background: 'rgba(148,163,184,0.12)', color: '#64748b', ...buttonProps.style }}
      >
        <MinusCircle size={10} />
        N/A
      </span>
    );
  }

  const days = daysFromNow(dueDate);

  if (days < 0) {
    return (
      <span
        {...buttonProps}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:brightness-95 transition-all"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', ...buttonProps.style }}
      >
        <AlertCircle size={10} />
        Overdue {Math.abs(days)}d
      </span>
    );
  }
  if (days === 0) {
    return (
      <span
        {...buttonProps}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:brightness-95 transition-all"
        style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', ...buttonProps.style }}
      >
        <Clock size={10} />
        Due today
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span
        {...buttonProps}
        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:brightness-95 transition-all"
        style={{ background: 'rgba(251,191,36,0.12)', color: '#d97706', ...buttonProps.style }}
      >
        <Clock size={10} />
        {days}d left
      </span>
    );
  }
  return (
    <span
      {...buttonProps}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium hover:brightness-95 transition-all"
      style={{ background: 'rgba(148,163,184,0.1)', color: '#64748b', ...buttonProps.style }}
    >
      <Clock size={10} />
      Pending
    </span>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const AUTHORITY_ORDER = ['KRA', 'Companies Registry', 'ICPAK'];

const AUTHORITY_STYLES: Record<string, { bg: string; color: string; icon: string }> = {
  KRA: { bg: 'rgba(59,130,246,0.07)', color: '#2563eb', icon: 'KRA' },
  'Companies Registry': { bg: 'rgba(139,92,246,0.07)', color: '#7c3aed', icon: 'CR' },
  ICPAK: { bg: 'rgba(16,185,129,0.07)', color: '#059669', icon: 'ICP' },
};

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

// ── Row component ─────────────────────────────────────────────────────────────

interface DeadlineRowProps {
  deadline: Deadline;
  onCycleStatus: (d: Deadline) => void;
  onUpdateNotes: (d: Deadline, notes: string) => void;
  updating: boolean;
}

function DeadlineRow({ deadline: d, onCycleStatus, onUpdateNotes, updating }: DeadlineRowProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(d.notes ?? '');
  const dotColor = getDotColor(d);

  function handleNotesBlur() {
    setEditingNotes(false);
    if (notesValue !== (d.notes ?? '')) {
      onUpdateNotes(d, notesValue);
    }
  }

  // Keep local notes in sync if parent updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotesValue(d.notes ?? '');
  }, [d.notes]);

  return (
    <div
      className="flex flex-col gap-1.5 px-4 py-3 rounded-xl transition-colors"
      style={{
        background: d.status === 'not_applicable' ? 'rgba(248,250,252,0.5)' : 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(148,163,184,0.12)',
        opacity: d.status === 'not_applicable' ? 0.65 : 1,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Status colour dot (decorative only) */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DOT_STYLES[dotColor]}`} />

        {/* Label + authority */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-snug">{d.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{d.authority}</p>
        </div>

        {/* Due date */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-xs font-medium text-slate-600">{formatDeadlineDate(d.dueDate)}</p>
        </div>

        {/* Status chip - clickable to cycle status */}
        <div className="flex-shrink-0">
          <StatusChip
            status={d.status}
            dueDate={d.dueDate}
            onClick={() => onCycleStatus(d)}
            disabled={updating}
          />
        </div>
      </div>

      {/* Notes row */}
      <div className="pl-5">
        {editingNotes ? (
          <input
            autoFocus
            type="text"
            value={notesValue}
            onChange={e => setNotesValue(e.target.value)}
            onBlur={handleNotesBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setNotesValue(d.notes ?? ''); setEditingNotes(false); } }}
            className="input h-7 text-xs"
            placeholder="Add a note..."
            style={{ maxWidth: 360 }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors text-left"
          >
            {notesValue ? notesValue : <span className="italic opacity-60">Add note...</span>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DeadlinesPage() {
  const { engagementId } = useParams<{ engagementId: string }>();
  const router = useRouter();

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [engagementYear, setEngagementYear] = useState<string>('');

  // Load deadlines
  useEffect(() => {
    async function load() {
      try {
        // Load engagement for header subtitle
        const [dlRes, engRes] = await Promise.all([
          fetch(`/api/engagements/${engagementId}/deadlines`),
          fetch(`/api/engagements/${engagementId}`),
        ]);
        const dlData = await dlRes.json();
        const engData = await engRes.json();

        if (!dlRes.ok) {
          toast.error(dlData.error || 'Failed to load deadlines');
          return;
        }

        setDeadlines(dlData.deadlines ?? []);

        if (engData.engagement?.financialYearEnd) {
          const fyEnd = new Date(engData.engagement.financialYearEnd);
          setEngagementYear(
            fyEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
          );
        }
      } catch {
        toast.error('Failed to load deadlines');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [engagementId]);

  // Patch a deadline
  const patchDeadline = useCallback(
    async (id: string, update: { status?: DeadlineStatus; notes?: string; filedDate?: string | null }) => {
      setUpdatingId(id);
      try {
        const current = deadlines.find(d => d.id === id);
        if (!current) return;

        const body: Record<string, unknown> = { id, status: update.status ?? current.status };
        if (update.notes !== undefined) body.notes = update.notes;
        if ('filedDate' in update) body.filedDate = update.filedDate ?? null;

        const res = await fetch(`/api/engagements/${engagementId}/deadlines`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || 'Failed to update deadline');
          return;
        }

        setDeadlines(prev => prev.map(d => (d.id === id ? { ...d, ...data.deadline } : d)));
      } catch {
        toast.error('Network error');
      } finally {
        setUpdatingId(null);
      }
    },
    [engagementId, deadlines],
  );

  function handleCycleStatus(d: Deadline) {
    const next = STATUS_CYCLE[d.status];
    const filedDate = next === 'filed' ? new Date().toISOString() : null;
    patchDeadline(d.id, { status: next, filedDate });
  }

  function handleUpdateNotes(d: Deadline, notes: string) {
    patchDeadline(d.id, { notes });
  }

  // Summary stats
  const filed = deadlines.filter(d => d.status === 'filed').length;
  const overdue = deadlines.filter(d => {
    if (d.status === 'filed' || d.status === 'not_applicable') return false;
    return daysFromNow(d.dueDate) < 0;
  }).length;
  const upcoming = deadlines.filter(d => {
    if (d.status === 'filed' || d.status === 'not_applicable') return false;
    const days = daysFromNow(d.dueDate);
    return days >= 0 && days <= 30;
  }).length;

  // Group by authority
  const byAuthority: Record<string, Deadline[]> = {};
  for (const d of deadlines) {
    if (!byAuthority[d.authority]) byAuthority[d.authority] = [];
    byAuthority[d.authority].push(d);
  }

  const authorityGroups = AUTHORITY_ORDER.filter(a => byAuthority[a]?.length);

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
            style={{ background: 'rgba(59,130,246,0.09)' }}
          >
            <Calendar size={17} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Filing Deadlines</h1>
            {engagementYear && (
              <p className="text-xs text-slate-400 mt-0.5">Year end {engagementYear}</p>
            )}
          </div>
        </div>

        {/* Summary bar */}
        {!loading && deadlines.length > 0 && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-600 font-medium">{filed}</span>
              <span className="text-slate-400">filed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="text-slate-600 font-medium">{overdue}</span>
              <span className="text-slate-400">overdue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-slate-600 font-medium">{upcoming}</span>
              <span className="text-slate-400">due in 30d</span>
            </div>
          </div>
        )}
      </header>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl skeleton" />
              ))}
            </div>
          ) : deadlines.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={cardStyle}>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(59,130,246,0.08)' }}
              >
                <Calendar size={22} className="text-blue-400" />
              </div>
              <p className="font-semibold text-slate-800 mb-1">No deadlines found</p>
              <p className="text-sm text-slate-400">
                Could not generate deadlines - please check the engagement has a financial year end date set.
              </p>
            </div>
          ) : (
            <>
              {authorityGroups.map(authority => {
                const style = AUTHORITY_STYLES[authority] ?? { bg: 'rgba(148,163,184,0.08)', color: '#64748b', icon: authority.slice(0, 3).toUpperCase() };
                const group = byAuthority[authority];

                return (
                  <section key={authority}>
                    {/* Authority header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.icon}
                      </div>
                      <h2 className="text-sm font-semibold text-slate-700">{authority}</h2>
                      <span className="text-xs text-slate-400 ml-0.5">
                        {group.filter(d => d.status === 'filed').length}/{group.length} filed
                      </span>
                    </div>

                    {/* Deadline rows */}
                    <div className="rounded-2xl overflow-hidden space-y-1.5" style={cardStyle}>
                      <div className="p-3 space-y-1.5">
                        {group.map(d => (
                          <DeadlineRow
                            key={d.id}
                            deadline={d}
                            onCycleStatus={handleCycleStatus}
                            onUpdateNotes={handleUpdateNotes}
                            updating={updatingId === d.id}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}

              {/* Help text */}
              <p className="text-xs text-slate-400 text-center pb-4">
                Click a status badge to cycle it: pending - filed - N/A.
                Click a note to edit inline.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
