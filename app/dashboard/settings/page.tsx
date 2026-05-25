'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Building2, User, CreditCard, CheckCircle2, Loader2, Zap } from 'lucide-react';

interface OrgData {
  id: string; name: string; icpakFirmNumber: string | null;
  plan: string; subscriptionExpiresAt: string | null;
  maxClients: number; maxEngagementsPerMonth: number; maxMembers: number;
}

interface MeData {
  user: { id: string; email: string; fullName: string; icpakNumber: string | null };
  org: OrgData; role: string;
  usage: { clients: number; engagementsThisMonth: number; members: number };
}

const PLAN_STYLES = {
  free:       { bg: 'rgba(148,163,184,0.12)', color: '#64748b', label: 'Free' },
  pro:        { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', label: 'Pro' },
  firm:       { bg: 'rgba(167,139,250,0.12)', color: '#8b5cf6', label: 'Firm' },
  enterprise: { bg: 'rgba(251,191,36,0.12)',  color: '#d97706', label: 'Enterprise' },
};

const cardStyle = {
  background: 'rgba(255,255,255,0.88)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(148,163,184,0.2)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export default function SettingsPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradePhone, setUpgradePhone] = useState('');
  const [upgradePlan, setUpgradePlan] = useState<'pro' | 'firm'>('pro');
  const [upgrading, setUpgrading] = useState(false);
  const [pollPaymentId, setPollPaymentId] = useState<string | null>(null);
  const pollStartRef = useRef<number>(0);
  const POLL_TIMEOUT_MS = 95_000;

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => { setMe(d); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!pollPaymentId) return;
    pollStartRef.current = Date.now();
    const iv = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        clearInterval(iv); setPollPaymentId(null);
        toast.error('No M-Pesa response after 90 seconds. If you paid, contact support.');
        return;
      }
      const res = await fetch(`/api/payments/mpesa/status?paymentId=${pollPaymentId}`);
      const data = await res.json();
      if (data.status === 'success') {
        clearInterval(iv); setPollPaymentId(null);
        toast.success('Payment confirmed! Plan upgraded.');
        fetch('/api/me').then(r => r.json()).then(d => setMe(d));
      } else if (data.status === 'failed') {
        clearInterval(iv); setPollPaymentId(null);
        const reason: string = data.failureReason ?? '';
        if (/cancel|1032/i.test(reason)) toast.error('Payment cancelled.');
        else if (/timeout|1037/i.test(reason)) toast.error('M-Pesa request timed out. Try again.');
        else toast.error(`Payment failed: ${reason || 'Unknown error'}`);
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [pollPaymentId]);

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    if (!upgradePhone.trim()) { toast.error('Enter your M-Pesa phone number'); return; }
    setUpgrading(true);
    try {
      const res = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: upgradePhone, plan: upgradePlan }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to initiate payment'); return; }
      toast.success('STK push sent! Check your phone and enter your M-Pesa PIN.');
      setPollPaymentId(data.paymentId);
    } catch { toast.error('Network error'); }
    finally { setUpgrading(false); }
  }

  if (loading) {
    return (
      <div className="p-7 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-40 bg-slate-200 rounded-2xl" />
          <div className="h-60 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!me) return null;

  const planStyle = PLAN_STYLES[me.org.plan as keyof typeof PLAN_STYLES] || PLAN_STYLES.free;
  const expiresAt = me.org.subscriptionExpiresAt
    ? new Date(me.org.subscriptionExpiresAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const daysLeft = me.org.subscriptionExpiresAt
    // eslint-disable-next-line react-hooks/purity
    ? Math.max(0, Math.ceil((new Date(me.org.subscriptionExpiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const usageItems = [
    { label: 'Clients', used: me.usage.clients, max: me.org.maxClients },
    { label: 'Engagements this month', used: me.usage.engagementsThisMonth, max: me.org.maxEngagementsPerMonth },
    { label: 'Team members', used: me.usage.members, max: me.org.maxMembers },
  ];

  return (
    <div className="p-7 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings & Plan</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your firm account and subscription</p>
      </div>

      {/* Current Plan */}
      <section className="rounded-2xl p-6" style={cardStyle}>
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <CreditCard size={15} className="text-blue-500" />
          Current Plan
        </h2>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full"
              style={{ background: planStyle.bg, color: planStyle.color }}
            >
              {planStyle.label}
            </span>
            <span className="text-slate-600 text-sm font-medium">
              {me.org.plan === 'free' ? 'KES 0' : me.org.plan === 'pro' ? 'KES 2,500/mo' : me.org.plan === 'firm' ? 'KES 8,000/mo' : 'Custom'}
            </span>
          </div>
          {expiresAt && (
            <div className="text-sm">
              {daysLeft !== null && daysLeft <= 7 ? (
                <span className="text-amber-600 font-medium">Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} ({expiresAt})</span>
              ) : (
                <span className="text-slate-500">Renews {expiresAt}</span>
              )}
            </div>
          )}
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid rgba(148,163,184,0.15)' }}>
          {usageItems.map(item => {
            const unlimited = item.max >= 9999;
            const pct = unlimited ? 0 : Math.min(100, (item.used / item.max) * 100);
            const atLimit = !unlimited && item.used >= item.max;
            return (
              <div key={item.label}>
                <div className={`font-bold text-lg tabular-nums ${atLimit ? 'text-amber-600' : 'text-slate-900'}`}>
                  {item.used}
                  <span className="text-sm font-normal text-slate-400"> / {unlimited ? '∞' : item.max}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 mb-1.5">{item.label}</div>
                {!unlimited && (
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.2)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: atLimit ? '#f59e0b' : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Upgrade */}
      {me.org.plan !== 'enterprise' && (
        <section className="rounded-2xl p-6" style={cardStyle}>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-1">
            <Zap size={15} className="text-amber-500" />
            Upgrade with M-Pesa
          </h2>
          <p className="text-slate-500 text-sm mb-5">Instant activation · No card required · 30-day subscription</p>

          {/* Plan selector */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {(['pro', 'firm'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setUpgradePlan(p)}
                className="rounded-xl p-4 text-left transition-all"
                style={upgradePlan === p ? {
                  border: '2px solid #3b82f6',
                  background: 'rgba(59,130,246,0.05)',
                } : {
                  border: '1px solid rgba(148,163,184,0.25)',
                  background: 'rgba(248,250,252,0.6)',
                }}
              >
                <div className="font-semibold text-slate-900 capitalize mb-1">{p}</div>
                <div className="font-bold text-lg" style={{ color: '#3b82f6' }}>
                  {p === 'pro' ? 'KES 2,500' : 'KES 8,000'}
                  <span className="text-xs font-normal text-slate-400">/month</span>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {(p === 'pro'
                    ? ['50 clients', '20 engagements/mo', '5 team members']
                    : ['Unlimited clients', 'Unlimited engagements', '20 team members']
                  ).map(f => (
                    <li key={f} className="text-xs text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 size={10} className="text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <form onSubmit={handleUpgrade} className="flex gap-3">
            <input
              type="tel"
              value={upgradePhone}
              onChange={e => setUpgradePhone(e.target.value)}
              placeholder="07XX XXX XXX or 254XX XXX XXX"
              className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={upgrading || !!pollPaymentId}
              className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl disabled:opacity-50 transition-all whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 0 16px rgba(22,163,74,0.25)' }}
            >
              {upgrading ? 'Sending…' : pollPaymentId ? <span className="flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Waiting…</span> : 'Pay with M-Pesa'}
            </button>
          </form>
          {pollPaymentId && (
            <p className="text-xs text-slate-400 mt-2 animate-pulse">
              STK push sent. Enter your M-Pesa PIN on your phone. Checking for confirmation…
            </p>
          )}
        </section>
      )}

      {/* Firm info */}
      <section className="rounded-2xl p-6" style={cardStyle}>
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Building2 size={15} className="text-blue-500" />
          Firm Information
        </h2>
        <dl className="space-y-3">
          {[
            { label: 'Firm name', value: me.org.name },
            { label: 'ICPAK firm number', value: me.org.icpakFirmNumber || 'Not set' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-sm py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              <dt className="text-slate-400">{label}</dt>
              <dd className="text-slate-900 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Account */}
      <section className="rounded-2xl p-6" style={cardStyle}>
        <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <User size={15} className="text-blue-500" />
          Your Account
        </h2>
        <dl className="space-y-3">
          {[
            { label: 'Full name', value: me.user.fullName },
            { label: 'Email', value: me.user.email },
            { label: 'ICPAK number', value: me.user.icpakNumber || 'Not set' },
            { label: 'Role', value: me.role },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-sm py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              <dt className="text-slate-400">{label}</dt>
              <dd className="text-slate-900 font-medium capitalize">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
