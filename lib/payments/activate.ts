import type { db as DbType } from '@/lib/db';
import { PLAN_LIMITS } from '@/lib/audit/isa-standards';

/** Activate/extend org subscription after a successful payment. */
export async function activateSubscription(
  dbInstance: typeof DbType,
  orgId: string,
  planPurchased: 'pro' | 'firm' | 'enterprise',
  periodDays: number,
) {
  const { organizations } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const [org] = await dbInstance
    .select({ subscriptionExpiresAt: organizations.subscriptionExpiresAt })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  // Extend from current expiry if still active, else start from now
  const base = (org?.subscriptionExpiresAt && org.subscriptionExpiresAt > new Date())
    ? org.subscriptionExpiresAt
    : new Date();

  const subscriptionExpiresAt = new Date(base.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const limits = PLAN_LIMITS[planPurchased];

  await dbInstance.update(organizations).set({
    plan: planPurchased,
    subscriptionExpiresAt,
    subscriptionStartDate: new Date(),
    maxClients: limits.maxClients,
    maxEngagementsPerMonth: limits.maxEngagementsPerMonth,
    maxMembers: limits.maxMembers,
    maxFileSizeMb: limits.maxFileSizeMb,
    updatedAt: new Date(),
  }).where(eq(organizations.id, orgId));

  return subscriptionExpiresAt;
}
