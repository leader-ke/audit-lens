import Link from 'next/link';
import {
  FileText, AlertTriangle, MapPin, FileCheck, Shield, Users,
  ArrowRight, CheckCircle2, Zap, ChevronRight,
} from 'lucide-react';
import { DemoShowcase } from './demo-showcase';

const features = [
  {
    icon: FileText,
    title: 'AI Working Papers',
    desc: 'Upload a trial balance and get ISA-compliant working papers for all 15 audit areas in minutes, not days.',
    accent: '#2563eb',
    bg: 'rgba(37,99,235,0.07)',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment (ISA 315)',
    desc: 'AI identifies inherent, control, and fraud risks, tailored to Kenya-specific factors like KRA compliance and IFRS adoption.',
    accent: '#d97706',
    bg: 'rgba(217,119,6,0.07)',
  },
  {
    icon: MapPin,
    title: 'Kenyan Context Built-in',
    desc: 'PAYE, Housing Levy, NHIF/SHIF, VAT, withholding tax. AI knows the Kenyan tax and regulatory landscape.',
    accent: '#059669',
    bg: 'rgba(5,150,105,0.07)',
  },
  {
    icon: FileCheck,
    title: 'Audit Reports (ISA 700)',
    desc: 'Draft unmodified, qualified, adverse, and disclaimer opinions in ICPAK-standard format.',
    accent: '#7c3aed',
    bg: 'rgba(124,58,237,0.07)',
  },
  {
    icon: Shield,
    title: 'Anti-Hallucination Architecture',
    desc: 'Temperature=0. Every finding cites the exact account and amount. ISA references from hardcoded library, never invented.',
    accent: '#0891b2',
    bg: 'rgba(8,145,178,0.07)',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    desc: 'Partners, managers, seniors, and juniors with role-based access and review and approval workflows.',
    accent: '#db2777',
    bg: 'rgba(219,39,119,0.07)',
  },
];

const plans = [
  {
    name: 'Free',
    price: 'KES 0',
    period: 'forever',
    note: 'Try the core workflow',
    features: [
      '2 clients · 3 engagements / month',
      'AI working papers - 5 audit areas',
      'Single draft per area (no iteration)',
      'Draft audit report (ISA 700)',
      '1 user · 10 MB uploads',
    ],
    cta: 'Get started free',
    href: '/auth/signup',
    highlight: false,
  },
  {
    name: 'Solo',
    price: 'KES 3,500',
    period: '/month',
    note: 'For a practising auditor working alone',
    features: [
      '25 clients · unlimited engagements',
      'Working papers - all 14 audit areas',
      'Per-finding judgment layer: Accept / Modify / Reject',
      '1 iteration loop per working paper',
      'Audit report · management letter · engagement letter',
      'KRA iTax recon · client portal · filing deadlines',
      '1 user · 25 MB uploads',
    ],
    cta: 'Start with M-Pesa',
    href: '/auth/signup',
    highlight: false,
  },
  {
    name: 'Practice',
    price: 'KES 7,000',
    period: '/month',
    note: 'Small firm with manager review',
    features: [
      '100 clients · unlimited engagements',
      'All Solo features',
      'Unlimited iteration loops per working paper',
      'Manager review layer - query, approve, or return',
      'Evidence uncertainty tracking per finding',
      'Bank reconciliation · document portal',
      '5 users · 50 MB uploads',
    ],
    cta: 'Start with M-Pesa',
    href: '/auth/signup',
    highlight: true,
  },
  {
    name: 'Firm',
    price: 'KES 15,000',
    period: '/month',
    note: 'Full review hierarchy for larger firms',
    features: [
      'Unlimited clients & engagements',
      'All Practice features',
      'Full review chain: Manager → Partner → EQCR',
      'EQCR sign-off tracking (ISA 220)',
      'Custom AI model configuration',
      '20 users · 100 MB uploads',
      'Dedicated onboarding & support',
    ],
    cta: 'Contact us',
    href: '/auth/signup',
    highlight: false,
  },
];

const ISA_REFS = [
  'ISA 200','ISA 210','ISA 230','ISA 240','ISA 250','ISA 260','ISA 265',
  'ISA 300','ISA 315','ISA 320','ISA 330','ISA 402','ISA 450','ISA 500',
  'ISA 505','ISA 510','ISA 520','ISA 530','ISA 540','ISA 550','ISA 560',
  'ISA 570','ISA 580','ISA 600','ISA 620','ISA 700','ISA 701','ISA 705',
  'ISA 706','ISA 710','ISA 720','ISA 800','ISA 805','ISA 810',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav ───────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 border-b border-slate-100" style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
              AL
            </div>
            <span className="font-semibold text-slate-900 text-sm">AuditLens</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-600 px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(150deg, #2563eb, #1d4ed8)', boxShadow: '0 1px 8px rgba(37,99,235,0.3)' }}
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 pt-20 pb-20 text-center">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-7"
          style={{ background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)', color: '#1d4ed8' }}
        >
          <Zap size={11} />
          Built for ICPAK-registered auditors in Kenya
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-tight mb-5">
          AI Working Papers in
          <br />
          <span style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Minutes, Not Days
          </span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-9 leading-relaxed">
          Upload your trial balance and get ISA-compliant working papers, risk assessments, and audit reports
          grounded in real figures, Kenyan law, and your engagement data.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/signup"
            className="group flex items-center gap-2 font-semibold text-sm text-white px-7 py-3 rounded-xl transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 2px 16px rgba(37,99,235,0.35)' }}
          >
            Start free, no card required
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/auth/login"
            className="flex items-center gap-2 font-medium text-sm text-slate-600 px-7 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
          >
            Sign in to your firm <ChevronRight size={14} />
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-4">Pay with M-Pesa · from KES 3,500/month</p>
      </section>

      {/* ── Demo showcase ─────────────────────────────────────────────────────── */}
      <DemoShowcase />

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-16" style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Everything an ICPAK auditor needs</h2>
            <p className="text-slate-500 text-sm">Professional-grade tools designed for Kenyan practice</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: f.bg }}>
                  <f.icon size={18} style={{ color: f.accent }} />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 py-16 text-center">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">How it works</h2>
        <p className="text-slate-500 text-sm mb-12">Three steps from trial balance to complete audit file</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Upload trial balance', desc: 'Export from QuickBooks, Sage, or Xero. Upload the spreadsheet.' },
            { step: '02', title: 'AI analyses all areas', desc: 'Materiality-aware analysis across 15 audit areas: revenue, payroll, tax, fixed assets, and more.' },
            { step: '03', title: 'Review & approve', desc: 'Edit AI-generated papers, add observations, mark reviewed by manager, sign off.' },
          ].map((s, i) => (
            <div key={s.step} className="text-left relative">
              <div className="text-3xl font-bold mb-2" style={{ color: 'rgba(37,99,235,0.18)' }}>{s.step}</div>
              <h3 className="font-semibold text-slate-900 mb-1.5 text-sm">{s.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ISA coverage ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <h2 className="text-xl font-bold text-white mb-2">ISA coverage across all audit areas</h2>
          <p className="text-slate-400 text-sm mb-7">Hardcoded standards; the AI cannot invent ISA numbers</p>
          <div className="flex flex-wrap justify-center gap-2">
            {ISA_REFS.map(isa => (
              <span key={isa} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                {isa}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Simple, M-Pesa friendly pricing</h2>
          <p className="text-slate-500 text-sm">No credit card. Pay monthly via M-Pesa STK push.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map(p => (
            <div
              key={p.name}
              className={`rounded-2xl p-6 flex flex-col ${p.highlight ? 'shadow-xl' : 'border border-slate-200'}`}
              style={p.highlight ? {
                background: 'white',
                border: '2px solid #2563eb',
                boxShadow: '0 4px 32px rgba(37,99,235,0.15)',
              } : { background: 'white' }}
            >
              {p.highlight && (
                <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mb-3 w-fit">
                  Most popular
                </div>
              )}
              <h3 className="font-bold text-slate-900 text-lg">{p.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">{p.note}</p>
              <div className="mb-5">
                <span className="text-2xl font-bold text-slate-900">{p.price}</span>
                <span className="text-slate-500 text-sm">{p.period}</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={`block w-full text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  p.highlight ? 'text-white hover:brightness-110' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                style={p.highlight ? { background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 2px 12px rgba(37,99,235,0.3)' } : {}}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: '#1d4ed8' }}>
              AL
            </div>
            <span className="text-sm text-slate-500">AuditLens · Built for Kenyan auditors</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/auth/signup"
              className="text-xs font-medium text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
            >
              Sign up
            </Link>
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(150deg, #2563eb, #1d4ed8)', boxShadow: '0 1px 6px rgba(37,99,235,0.3)' }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
