import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { users, organizations, organizationMembers } from '@/lib/db/schema';
import { signToken } from '@/lib/auth/jwt';
import { PLAN_LIMITS } from '@/lib/audit/isa-standards';
import { z } from 'zod';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  firmName: z.string().min(2),
  icpakNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = SignupSchema.parse(body);

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, data.email),
    });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await hash(data.password, 12);

    // Create user
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      icpakNumber: data.icpakNumber,
      emailVerified: true, // simplified - add email verification in production
    }).returning();

    // Create organization (audit firm)
    const limits = PLAN_LIMITS.free;
    const [org] = await db.insert(organizations).values({
      name: data.firmName,
      plan: 'free',
      maxClients: limits.maxClients,
      maxEngagementsPerMonth: limits.maxEngagementsPerMonth,
      maxMembers: limits.maxMembers,
      maxFileSizeMb: limits.maxFileSizeMb,
    }).returning();

    // Add user as owner
    await db.insert(organizationMembers).values({
      orgId: org.id,
      userId: user.id,
      role: 'owner',
    });

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      orgId: org.id,
      email: user.email,
      fullName: user.fullName,
      role: 'owner',
    });

    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName } });
    response.cookies.set('auditlens_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
