'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface FieldErrors {
  fullName?: string;
  firmName?: string;
  email?: string;
  password?: string;
}

function validate(form: { fullName: string; firmName: string; email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.fullName.trim() || form.fullName.trim().length < 2)
    errors.fullName = 'Enter your full name (at least 2 characters)';
  if (!form.firmName.trim() || form.firmName.trim().length < 2)
    errors.firmName = 'Enter your firm or practice name';
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid work email address';
  if (!form.password || form.password.length < 8)
    errors.password = 'Password must be at least 8 characters';
  return errors;
}

function pwStrength(pw: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { level: 2, label: 'Fair', color: '#f59e0b' };
  return { level: 3, label: 'Strong', color: '#10b981' };
}

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({});
  const [form, setForm] = useState({ fullName: '', email: '', password: '', firmName: '', icpakNumber: '' });

  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;

  function touch(field: keyof FieldErrors) {
    setTouched(t => ({ ...t, [field]: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ fullName: true, firmName: true, email: true, password: true });
    if (hasErrors) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Registration failed'); return; }
      toast.success('Account created! Welcome to AuditLens.');
      router.push('/dashboard');
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const strength = pwStrength(form.password);

  function inputClass(field: keyof FieldErrors) {
    const base = 'input';
    if (touched[field] && errors[field]) return `${base} !border-red-400 !ring-red-100`;
    if (touched[field] && !errors[field] && form[field as keyof typeof form]) return `${base} !border-emerald-400`;
    return base;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{
        background: 'linear-gradient(145deg, #f0f4ff 0%, #f8fafc 50%, #f0f7ff 100%)',
      }}
    >
      {/* Background decorative blobs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-10%', left: '-5%', width: '50vw', height: '50vh',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-5%', right: '-5%', width: '40vw', height: '40vh',
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <div className="w-full max-w-md relative" style={{ zIndex: 1 }}>
        {/* Logo */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
              }}
            >
              AL
            </div>
            <span className="font-semibold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">
              AuditLens
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your firm account</h1>
          <p className="text-slate-500 text-sm mt-1.5">Set up your practice in under 2 minutes</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1.5px solid #d0d9e6',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.8) inset, 0 4px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Your full name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  onBlur={() => touch('fullName')}
                  className={inputClass('fullName')}
                  placeholder="John Kamau"
                  autoComplete="name"
                />
                {touched.fullName && errors.fullName && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.fullName}
                  </p>
                )}
              </div>

              {/* Firm name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Firm / practice name</label>
                <input
                  type="text"
                  value={form.firmName}
                  onChange={e => setForm(f => ({ ...f, firmName: e.target.value }))}
                  onBlur={() => touch('firmName')}
                  className={inputClass('firmName')}
                  placeholder="Kamau & Associates CPA"
                  autoComplete="organization"
                />
                {touched.firmName && errors.firmName && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.firmName}
                  </p>
                )}
              </div>

              {/* ICPAK */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  ICPAK membership number{' '}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.icpakNumber}
                  onChange={e => setForm(f => ({ ...f, icpakNumber: e.target.value }))}
                  className="input"
                  placeholder="FCPA/1234"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Work email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  onBlur={() => touch('email')}
                  className={inputClass('email')}
                  placeholder="you@yourfirm.com"
                  autoComplete="email"
                />
                {touched.email && errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onBlur={() => touch('password')}
                    className={`${inputClass('password')} pr-10`}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Password strength bar */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map(n => (
                        <div
                          key={n}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background: strength.level >= n ? strength.color : '#e2e8f0',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>{strength.label} password</p>
                  </div>
                )}
                {touched.password && errors.password && !form.password && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.password}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 flex items-center justify-center gap-2 font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                height: '46px',
                fontSize: '14.5px',
                background: loading ? 'rgba(37,99,235,0.7)' : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                boxShadow: loading ? 'none' : '0 2px 16px rgba(37,99,235,0.35), 0 1px 0 rgba(255,255,255,0.15) inset',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <p className="text-xs text-slate-400 text-center mt-3.5">
              By creating an account you agree to our terms of service.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
