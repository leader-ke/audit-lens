'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, Building2, X, ArrowRight, Loader2 } from 'lucide-react';

const ENTITY_TYPES = [
  'limited_company', 'public_company', 'ngo', 'sacco', 'county_government',
  'national_government', 'parastatals', 'church', 'school', 'bank', 'insurance', 'other',
];

const ENTITY_LABELS: Record<string, string> = {
  limited_company: 'Limited Company', public_company: 'Public Company', ngo: 'NGO/CBO',
  sacco: 'SACCO', county_government: 'County Government', national_government: 'National Government',
  parastatals: 'Parastatals', church: 'Church/Religious Org', school: 'School/College',
  bank: 'Bank/MFI', insurance: 'Insurance Company', other: 'Other',
};

const inputCls = 'input';

const ENTITY_COLORS: Record<string, { bg: string; color: string }> = {
  limited_company: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  ngo:             { bg: 'rgba(52,211,153,0.1)', color: '#10b981' },
  sacco:           { bg: 'rgba(167,139,250,0.1)', color: '#8b5cf6' },
  school:          { bg: 'rgba(251,191,36,0.1)', color: '#d97706' },
  bank:            { bg: 'rgba(251,113,133,0.1)', color: '#f43f5e' },
};

function entityStyle(type: string) {
  return ENTITY_COLORS[type] || { bg: 'rgba(148,163,184,0.1)', color: '#64748b' };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', entityType: 'limited_company', registrationNumber: '', kraPin: '',
    industry: '', financialYearEnd: '31 December', contactName: '', contactEmail: '', contactPhone: '',
  });

  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch { toast.error('Failed to load clients'); }
    finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to create client'); return; }
      toast.success(`${form.name} added successfully`);
      setClients(c => [data.client, ...c]);
      setShowForm(false);
      setForm({ name: '', entityType: 'limited_company', registrationNumber: '', kraPin: '', industry: '', financialYearEnd: '31 December', contactName: '', contactEmail: '', contactPhone: '' });
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-7 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''} in your firm
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus size={14} />
          Add Client
        </button>
      </div>

      {/* Add client form */}
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
            <h2 className="font-semibold text-slate-900">New Client</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Client / Entity name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} placeholder="ABC Limited" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Entity type *</label>
                <select value={form.entityType} onChange={e => setForm(f => ({ ...f, entityType: e.target.value }))}
                  className={inputCls}>
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{ENTITY_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Financial year end</label>
                <input value={form.financialYearEnd} onChange={e => setForm(f => ({ ...f, financialYearEnd: e.target.value }))}
                  className={inputCls} placeholder="31 December" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">KRA PIN</label>
                <input value={form.kraPin} onChange={e => setForm(f => ({ ...f, kraPin: e.target.value }))}
                  className={inputCls} placeholder="P000123456A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration number</label>
                <input value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))}
                  className={inputCls} placeholder="PVT/123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Industry</label>
                <input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  className={inputCls} placeholder="Manufacturing, Retail, NGO…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact name</label>
                <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                  className={inputCls} placeholder="Finance Director" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact email</label>
                <input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                  className={inputCls} placeholder="finance@client.co.ke" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Add Client'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Client list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 size={16} className="animate-spin" />
          Loading clients…
        </div>
      ) : clients.length === 0 ? (
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
            <Building2 size={22} className="text-blue-500" />
          </div>
          <p className="font-semibold text-slate-900 mb-1.5">No clients yet</p>
          <p className="text-slate-500 text-sm">Add your first client to start an audit engagement.</p>
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
          {clients.map((c, i) => {
            const style = entityStyle(c.entityType);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition-colors"
                style={i > 0 ? { borderTop: '1px solid rgba(148,163,184,0.12)' } : {}}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-500">
                      {ENTITY_LABELS[c.entityType] || c.entityType}
                      {c.kraPin ? ` · ${c.kraPin}` : ''}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/engagements?clientId=${c.id}`}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View engagements <ArrowRight size={11} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
