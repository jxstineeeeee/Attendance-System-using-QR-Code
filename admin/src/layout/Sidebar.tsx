import { NavLink } from 'react-router-dom'
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  ScrollText,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Smartphone,
  UsersRound,
} from 'lucide-react'
import { ADMIN, SCHOOL } from '../lib/mock'
import { cx } from '../components/ui'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/users', label: 'Staff Accounts', icon: UsersRound },
  { to: '/devices', label: 'Gate Devices', icon: Smartphone },
  { to: '/academic', label: 'Academic Setup', icon: CalendarDays },
  { to: '/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-7 bg-brand px-[18px] py-7">
      <div className="flex items-center gap-3 px-2">
        <div className="display-title flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-[13px] text-brand">
          LOGO
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="display-title text-xl leading-[1.1] text-white">
            {SCHOOL.name}
          </span>
          <span className="text-sm text-brand-tint">QR Attendance</span>
        </div>
      </div>

      {/* The gold rule is what separates Admin from the registrar at a glance. */}
      <div className="flex items-center gap-2.5 rounded-lg border-l-[3px] border-gold bg-brand-active/45 px-3 py-2.5">
        <SlidersHorizontal size={16} strokeWidth={2.2} className="text-gold" />
        <span className="display-title text-[15px] tracking-wide text-white uppercase">
          Admin Console
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'flex h-[44px] items-center gap-3 rounded-lg px-3.5 transition-colors',
                isActive
                  ? 'bg-brand-active font-semibold text-white'
                  : 'font-medium text-brand-pale hover:bg-brand-active/55',
              )
            }
          >
            <Icon size={19} strokeWidth={1.9} className="shrink-0" />
            <span className="text-[15px]">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-3 border-t border-brand-line px-2.5 py-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-[15px] font-bold text-ink">
          {ADMIN.initials}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold text-white">
            {ADMIN.name}
          </span>
          <span className="text-[13px] text-brand-tint">{ADMIN.role}</span>
        </div>
      </div>
    </aside>
  )
}
