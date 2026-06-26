import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Search, Users, Package,
  FileText, ClipboardList, BarChart2, Archive, Settings, Anchor,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Duty Calculator intentionally absent — route deprecated ──────
type NavItem  = { to: string; label: string; icon: React.ElementType; end?: boolean }
type NavGroup = { group: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ],
  },
  {
    group: 'Tariff Tools',
    items: [
      { to: '/hs-lookup', label: 'HS Code Lookup', icon: Search },
    ],
  },
  {
    group: 'Broker Tools',
    items: [
      { to: '/clients',              label: 'Clients',            icon: Users         },
      { to: '/shipments',            label: 'Shipments',          icon: Package       },
      { to: '/entries',              label: 'Entry Worksheets',   icon: FileText      },
      { to: '/assessment',           label: 'Assessment Builder', icon: ClipboardList },
      { to: '/assessment-dashboard', label: 'Asmt. Dashboard',   icon: BarChart2     },
      { to: '/historical-sad',       label: 'Historical SAD',     icon: Archive       },
    ],
  },
  {
    group: 'Account',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">

      {/* Branding */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800">
        <Anchor size={18} className="text-sky-400 shrink-0" />
        <div>
          <h1 className="text-white font-bold text-sm tracking-tight">Customs Tech</h1>
          <p className="text-slate-500 text-[10px] mt-0.5">by Osias.org</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-5">
        {NAV_GROUPS.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
              {group}
            </p>
            <div className="space-y-0.5">
              {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors w-full',
                      isActive
                        ? 'bg-sky-900/50 text-sky-400 border-l-2 border-sky-500 pl-[10px]'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-2 border-transparent pl-[10px]'
                    )
                  }
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <p className="text-slate-700 text-[10px]">Phase 3 • Production</p>
      </div>
    </aside>
  )
}
