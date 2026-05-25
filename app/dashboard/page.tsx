import { getSession } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { clients, engagements, workingPapers } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Building2, FolderOpen, Search, CheckSquare, Plus, FileText, Zap, ArrowRight, TrendingUp } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  planning:   { bg: 'rgba(251,191,36,0.12)',  color: '#d97706', label: 'Planning' },
  fieldwork:  { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb', label: 'Fieldwork' },
  completion: { bg: 'rgba(167,139,250,0.12)', color: '#7c3aed', label: 'Completion' },
  reporting:  { bg: 'rgba(249,115,22,0.12)',  color: '#ea580c', label: 'Reporting' },
  signed_off: { bg: 'rgba(52,211,153,0.12)',  color: '#059669', label: 'Signed off' },
  archived:   { bg: 'rgba(148,163,184,0.1)',  color: '#64748b', label: 'Archived' },
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [allClients, allEngagements, org] = await Promise.all([
    db.query.clients.findMany({
      where: (c, { eq, and }) => and(eq(c.orgId, session.orgId), eq(c.isActive, true)),
    }),
    db.query.engagements.findMany({
      where: (e, { eq }) => eq(e.orgId, session.orgId),
      with: { client: true } as any,
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      limit: 5,
    }),
    db.query.organizations.findFirst({
      where: (o, { eq }) => eq(o.id, session.orgId),
    }),
  ]);

  const engagementsByStatus = allEngagements.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activeCount = allEngagements.filter(e => !['signed_off', 'archived'].includes(e.status)).length;

  const stats = [
    { label: 'Total Clients', value: allClients.length, icon: Building2, href: '/dashboard/clients', color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Active Engagements', value: activeCount, icon: FolderOpen, href: '/dashboard/engagements', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
    { label: 'In Fieldwork', value: engagementsByStatus.fieldwork || 0, icon: Search, href: '/dashboard/engagements', color: '#059669', bg: 'rgba(5,150,105,0.08)' },
    { label: 'Signed Off', value: engagementsByStatus.signed_off || 0, icon: CheckSquare, href: '/dashboard/engagements', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  ];

  return (
    <div className="p-7 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Good morning, {session.fullName.split(' ')[0]}
          </h1>
          <p className="text-slate-500 mt-1 text-sm flex items-center gap-1.5 flex-wrap">
            {org?.name}
            <span className="text-slate-300">·</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={org?.plan === 'free'
                ? { background: 'rgba(148,163,184,0.1)', color: '#64748b' }
                : { background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
            >
              {org?.plan === 'free' ? 'Free Plan' : org?.plan === 'pro' ? 'Pro Plan' : org?.plan === 'firm' ? 'Firm Plan' : 'Enterprise'}
            </span>
            {org?.plan === 'free' && (
              <Link href="/dashboard/settings" className="text-blue-600 font-medium text-xs hover:text-blue-700 flex items-center gap-0.5">
                Upgrade <ArrowRight size={10} />
              </Link>
            )}
          </p>
        </div>
        <Link href="/dashboard/engagements" className="btn-primary hidden sm:inline-flex">
          <Plus size={14} />
          New engagement
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {stats.map(stat => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card card-hover rounded-2xl p-4 overflow-hidden relative group"
          >
            {/* Colored accent strip */}
            <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl" style={{ background: stat.color, opacity: 0.7 }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 mt-1" style={{ background: stat.bg }}>
              <stat.icon size={17} style={{ color: stat.color }} />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none mb-1">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent Engagements */}
      <div className="card rounded-2xl mb-6">
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp size={15} className="text-blue-600" />
            Recent Engagements
          </h2>
          <Link href="/dashboard/engagements" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5 transition-colors">
            View all <ArrowRight size={11} />
          </Link>
        </div>

        {allEngagements.length === 0 ? (
          <div className="text-center py-12 px-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-50">
              <FolderOpen size={20} className="text-blue-500" />
            </div>
            <p className="text-slate-500 text-sm mb-4">No engagements yet</p>
            <Link href="/dashboard/engagements" className="btn-primary">
              Start your first engagement <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="p-3">
            {allEngagements.map(e => {
              const s = STATUS_STYLES[e.status] || STATUS_STYLES.archived;
              return (
                <Link
                  key={e.id}
                  href={`/dashboard/engagements/${e.id}`}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {((e as any).client?.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{(e as any).client?.name || 'Unknown client'}</p>
                      <p className="text-xs text-slate-500">{e.auditType} · FY {new Date(e.financialYearEnd).getFullYear()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:block">{formatDate(e.createdAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'New Client', desc: 'Add a client to your firm', href: '/dashboard/clients', icon: Building2, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
          { title: 'New Engagement', desc: 'Start an audit engagement', href: '/dashboard/engagements', icon: FileText, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
          { title: 'Upgrade Plan', desc: 'M-Pesa · KES 2,500/month', href: '/dashboard/settings', icon: Zap, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
        ].map(a => (
          <Link
            key={a.title}
            href={a.href}
            className="card card-hover rounded-2xl p-5 group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: a.bg }}>
              <a.icon size={18} style={{ color: a.color }} />
            </div>
            <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
