'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Plus, FolderOpen, X, Loader2, ArrowRight } from 'lucide-react';

const AUDIT_TYPES = ['statutory', 'internal', 'special_purpose', 'review', 'compilation', 'forensic', 'tax', 'compliance', 'performance'];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  planning:   { bg: 'rgba(251,191,36,0.12)',  color: '#d97706', label: 'Planning' },
  fieldwork:  { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Fieldwork' },
  completion: { bg: 'rgba(167,139,250,0.12)', color: '#8b5cf6', label: 'Completion' },
  reporting:  { bg: 'rgba(249,115,22,0.12)',  color: '#ea580c', label: 'Reporting' },
  signed_off: { bg: 'rgba(52,211,153,0.12)',  color: '#059669', label: 'Signed off' },
  archived:   { bg: 'rgba(148,163,184,0.1)',  color: '#64748b', label: 'Archived' },
};

const inputCls = 'input';

export default function EngagementsPage() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '', engagementRef: '', financialYearStart: '', financialYearEnd: '',
    auditType: 'statutory', materialityAmount: '', materialityBasis: '5% of profit before tax',
    performanceMateriality: '', trivialThreshold: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/engagements').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ]).then(([eData, cData]) => {
      setEngagements(eData.engagements || []);
      setClients(cData.clients || []);
    }).catch(() => toast.error('Failed to load data')).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) { toast.error('Select a client'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        materialityAmount: form.materialityAmount ? parseFloat(form.materialityAmount) : undefined,
        performanceMateriality: form.performanceMateriality ? parseFloat(form.performanceMateriality) : undefined,
        trivialThreshold: form.trivialThreshold ? parseFloat(form.trivialThreshold) : undefined,
      };
      const res = await fetch('/api/engagements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to create engagement'); return; }
      toast.success('Engagement created');
      const createdClient = clients.find(c => c.id === form.clientId) || null;
      setEngagements(prev => [{ ...data.engagement, client: createdClient }, ...prev]);
      setShowForm(false);
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-7 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Engagements</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {engagements.length} engagement{engagements.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={14} />
          New Engagement
        </button>
      </div>

      {/* New engagement form */}
      {showForm && (
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(148,163,184,0.25)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">New Audit Engagement</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Client *</label>
                <select required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                  className={inputCls}>
                  <option value="">Select a client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {clients.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No clients found. <Link href="/dashboard/clients" className="underline">Add a client first.</Link>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Audit type *</label>
                <select value={form.auditType} onChange={e => setForm(f => ({ ...f, auditType: e.target.value }))}
                  className={inputCls}>
                  {AUDIT_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Engagement ref</label>
                <input value={form.engagementRef} onChange={e => setForm(f => ({ ...f, engagementRef: e.target.value }))}
                  className={inputCls} placeholder="2024/ABC/001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Financial year start *</label>
                <input type="date" required value={form.financialYearStart}
                  onChange={e => setForm(f => ({ ...f, financialYearStart: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Financial year end *</label>
                <input type="date" required value={form.financialYearEnd}
                  onChange={e => setForm(f => ({ ...f, financialYearEnd: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Materiality (KES)</label>
                <input type="number" value={form.materialityAmount}
                  onChange={e => setForm(f => ({ ...f, materialityAmount: e.target.value }))}
                  className={inputCls} placeholder="500000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Materiality basis</label>
                <input value={form.materialityBasis} onChange={e => setForm(f => ({ ...f, materialityBasis: e.target.value }))}
                  className={inputCls} placeholder="5% of profit before tax" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Performance materiality (KES)</label>
                <input type="number" value={form.performanceMateriality}
                  onChange={e => setForm(f => ({ ...f, performanceMateriality: e.target.value }))}
                  className={inputCls} placeholder="375000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trivial threshold (KES)</label>
                <input type="number" value={form.trivialThreshold}
                  onChange={e => setForm(f => ({ ...f, trivialThreshold: e.target.value }))}
                  className={inputCls} placeholder="25000" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <><Loader2 size={13} className="animate-spin" /> Creating…</> : 'Create Engagement'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </div>
      ) : engagements.length === 0 ? (
        <div
          className="rounded-2xl p-14 text-center"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(148,163,184,0.2)',
          }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(59,130,246,0.08)' }}>
            <FolderOpen size={22} className="text-blue-500" />
          </div>
          <p className="font-semibold text-slate-900 mb-1.5">No engagements yet</p>
          <p className="text-sm text-slate-500">Create your first audit engagement to get started.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(148,163,184,0.2)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {engagements.map((e, i) => {
            const s = STATUS_STYLES[e.status] || STATUS_STYLES.archived;
            return (
              <Link
                key={e.id}
                href={`/dashboard/engagements/${e.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors group"
                style={i > 0 ? { borderTop: '1px solid rgba(148,163,184,0.12)' } : {}}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {(e.client?.name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{e.client?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">
                      {e.auditType} · FY {new Date(e.financialYearEnd).getFullYear()}
                      {e.engagementRef ? ` · ${e.engagementRef}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:block">{formatDate(e.createdAt)}</span>
                  <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
