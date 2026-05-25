import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { engagements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { EngagementNav } from './engagement-nav';

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  planning:   { label: 'Planning',   color: '#d97706', bg: 'rgba(251,191,36,0.12)' },
  fieldwork:  { label: 'Fieldwork',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  completion: { label: 'Completion', color: '#8b5cf6', bg: 'rgba(167,139,250,0.12)' },
  reporting:  { label: 'Reporting',  color: '#ea580c', bg: 'rgba(249,115,22,0.12)' },
  signed_off: { label: 'Signed off', color: '#059669', bg: 'rgba(52,211,153,0.12)' },
  archived:   { label: 'Archived',   color: '#64748b', bg: 'rgba(148,163,184,0.1)' },
};

export default async function EngagementLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ engagementId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const { engagementId } = await params;

  const engagement = await db.query.engagements.findFirst({
    where: (e, { eq, and }) => and(eq(e.id, engagementId), eq(e.orgId, session.orgId)),
    with: { client: true } as any,
  });

  if (!engagement) redirect('/dashboard/engagements');

  const status = STATUS_MAP[engagement.status] ?? STATUS_MAP.planning;
  const fyYear = new Date(engagement.financialYearEnd).getFullYear().toString();
  const clientName = (engagement as any).client?.name ?? 'Unknown client';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <EngagementNav
        engagementId={engagementId}
        clientName={clientName}
        fyYear={fyYear}
        statusLabel={status.label}
        statusColor={status.color}
        statusBg={status.bg}
      />
      <div className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
