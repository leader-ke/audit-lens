'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, FileText, BarChart3, CheckCircle,
  FileSignature, Calendar, RefreshCw, Receipt, Globe,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview',       path: '',                   icon: LayoutGrid   },
  { label: 'Working Papers', path: '/working-papers',    icon: FileText     },
  { label: 'Audit Report',   path: '/report',            icon: BarChart3    },
  { label: 'Mgmt Letter',    path: '/management-letter', icon: CheckCircle  },
  { label: 'Eng. Letter',    path: '/engagement-letter', icon: FileSignature },
  { label: 'Deadlines',      path: '/deadlines',         icon: Calendar     },
  { label: 'Bank Recon',     path: '/bank-reconciliation', icon: RefreshCw  },
  { label: 'iTax Recon',     path: '/itax',              icon: Receipt      },
  { label: 'Client Portal',  path: '/portal',            icon: Globe        },
];

interface Props {
  engagementId: string;
  clientName: string;
  fyYear: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
}

export function EngagementNav({
  engagementId, clientName, fyYear, statusLabel, statusColor, statusBg,
}: Props) {
  const pathname = usePathname();
  const base = `/dashboard/engagements/${engagementId}`;

  // Determine active item: match longest prefix
  const active = NAV_ITEMS.slice().reverse().find(item => {
    const full = base + item.path;
    return item.path === '' ? pathname === base || pathname === base + '/' : pathname.startsWith(full);
  });

  return (
    <div className="shrink-0 print:hidden" style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}>
      {/* Engagement identity bar */}
      <div
        className="px-6 pt-4 pb-2 flex items-center gap-3"
        style={{ background: 'rgba(248,250,252,0.7)' }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">{clientName}</h2>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none"
              style={{ background: statusBg, color: statusColor }}
            >
              {statusLabel}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">FY {fyYear}</p>
        </div>
      </div>

      {/* Tab strip */}
      <div
        className="flex items-stretch overflow-x-auto px-2"
        style={{ background: 'white', scrollbarWidth: 'none' }}
      >
        {NAV_ITEMS.map(item => {
          const href = base + item.path;
          const isActive = active?.path === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={href}
              className="flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap relative flex-shrink-0 transition-colors"
              style={{
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#1d4ed8' : '#64748b',
                borderBottom: isActive ? '2px solid #1d4ed8' : '2px solid transparent',
              }}
            >
              <Icon size={11} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
