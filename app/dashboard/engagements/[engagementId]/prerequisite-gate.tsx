import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRight, AlertTriangle } from 'lucide-react';

export interface PrerequisiteStep {
  label: string;
  done: boolean;
  action?: { label: string; href: string };
}

interface Props {
  title: string;
  description: string;
  steps: PrerequisiteStep[];
}

/**
 * Shown instead of an empty state + active generate button
 * when the prerequisites for a feature haven't been met.
 *
 * Each step shows completed (green tick) or blocked (grey circle).
 * The first incomplete step shows an action link.
 */
export function PrerequisiteGate({ title, description, steps }: Props) {
  const firstIncomplete = steps.find(s => !s.done);

  return (
    <div
      className="rounded-2xl p-10 text-center"
      style={{
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(148,163,184,0.2)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Warning icon */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: 'rgba(251,191,36,0.1)' }}
      >
        <AlertTriangle size={24} className="text-amber-500" />
      </div>

      <p className="font-semibold text-slate-900 mb-1.5">{title}</p>
      <p className="text-sm text-slate-500 mb-7 max-w-sm mx-auto leading-relaxed">{description}</p>

      {/* Steps */}
      <div className="inline-flex flex-col gap-2.5 text-left mb-7">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2.5">
            {step.done ? (
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle size={15} className="text-slate-300 flex-shrink-0" />
            )}
            <span
              className="text-sm"
              style={{ color: step.done ? '#64748b' : '#0f172a', fontWeight: step.done ? 400 : 500 }}
            >
              {step.label}
            </span>
            {!step.done && step === firstIncomplete && step.action && (
              <Link
                href={step.action.href}
                className="flex items-center gap-1 text-xs font-semibold ml-2 px-2.5 py-1 rounded-lg transition-all hover:brightness-110"
                style={{ background: 'rgba(37,99,235,0.1)', color: '#1d4ed8' }}
              >
                {step.action.label}
                <ArrowRight size={10} />
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Fallback action if no step has an action link */}
      {!firstIncomplete?.action && firstIncomplete && (
        <p className="text-xs text-slate-400 mt-2">Complete the steps above to unlock this feature.</p>
      )}
    </div>
  );
}
