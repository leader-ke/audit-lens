/**
 * Subscription Reminders Cron - runs daily at 01:00 UTC
 * Sends reminder emails at 30, 7, and 1 days before expiry.
 * Auto-downgrades expired orgs to Free plan.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { organizations } from '@/lib/db/schema';
import { and, lt, gte, ne, eq } from 'drizzle-orm';
import { PLAN_LIMITS } from '@/lib/audit/isa-standards';

export const runtime = 'nodejs';

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const remindersProcessed: string[] = [];
  const downgrades: string[] = [];

  // Find orgs with active subscriptions expiring in the next 30 days
  const expiringOrgs = await db.select().from(organizations).where(
    and(
      ne(organizations.plan, 'free'),
      gte(organizations.subscriptionExpiresAt, now),
      lt(organizations.subscriptionExpiresAt, addDays(now, 31))
    )
  );

  for (const org of expiringOrgs) {
    if (!org.subscriptionExpiresAt) continue;

    const daysLeft = Math.ceil(
      (org.subscriptionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const reminders = (org.subscriptionRemindersSent as Record<string, boolean>) || {};
    let shouldRemind = false;
    let reminderKey = '';

    if (daysLeft <= 1 && !reminders['1']) {
      shouldRemind = true; reminderKey = '1';
    } else if (daysLeft <= 7 && !reminders['7']) {
      shouldRemind = true; reminderKey = '7';
    } else if (daysLeft <= 30 && !reminders['30']) {
      shouldRemind = true; reminderKey = '30';
    }

    if (shouldRemind) {
      // TODO: send email via Resend
      console.log(`[reminders] Sending ${reminderKey}-day reminder to org ${org.id}`);
      await db.update(organizations).set({
        subscriptionRemindersSent: { ...reminders, [reminderKey]: true },
        updatedAt: new Date(),
      }).where(eq(organizations.id, org.id));
      remindersProcessed.push(org.id);
    }
  }

  // Auto-downgrade expired orgs
  const expiredOrgs = await db.select().from(organizations).where(
    and(ne(organizations.plan, 'free'), lt(organizations.subscriptionExpiresAt, now))
  );

  for (const org of expiredOrgs) {
    const freeLimits = PLAN_LIMITS.free;
    await db.update(organizations).set({
      plan: 'free',
      maxClients: freeLimits.maxClients,
      maxEngagementsPerMonth: freeLimits.maxEngagementsPerMonth,
      maxMembers: freeLimits.maxMembers,
      maxFileSizeMb: freeLimits.maxFileSizeMb,
      subscriptionRemindersSent: {},
      updatedAt: new Date(),
    }).where(eq(organizations.id, org.id));
    downgrades.push(org.id);
    console.log(`[reminders] Downgraded org ${org.id} to free plan`);
  }

  return NextResponse.json({
    ok: true,
    remindersProcessed: remindersProcessed.length,
    downgrades: downgrades.length,
  });
}
