import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/middleware';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { NavLinks } from './nav-links';
import { logout } from '@/app/actions/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/auth/login');

  const initials = session.fullName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="print:hidden w-[232px] bg-white border-r border-slate-100/80 flex flex-col fixed h-full z-10" style={{ boxShadow: '1px 0 0 rgba(226,232,240,0.6)' }}>

        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-100/80">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
              style={{ background: 'linear-gradient(150deg, #2563eb, #1d4ed8)' }}
            >
              AL
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">AuditLens</span>
          </Link>
        </div>

        {/* Nav - client component for active state */}
        <NavLinks />

        {/* User */}
        <div className="px-3 pt-3 border-t border-slate-100/80">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-700 font-bold text-[11px] flex-shrink-0"
              style={{ background: 'rgba(37,99,235,0.1)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{session.fullName}</p>
              <p className="text-[10.5px] text-slate-400 truncate leading-tight mt-0.5">{session.email}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Sign out"
                className="text-slate-300 hover:text-slate-500 transition-colors p-0.5"
              >
                <LogOut size={12} />
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="px-5 pb-3 pt-2">
          <p className="text-[10px] text-slate-300 leading-tight">
            &copy; {new Date().getFullYear()} Pemy. Kennedy Isiaho
          </p>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 ml-[232px] h-screen overflow-hidden print:ml-0">
        {children}
      </main>
    </div>
  );
}
