import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Printer, RotateCcw, UserPlus, Users } from 'lucide-react'
import { SCHOOL, nameInitials } from '../lib/types'
import { useAuth } from '../lib/auth'
import { cx } from '../components/ui'

const NAV = [
  { to: '/students', label: 'Students', icon: Users },
  { to: '/register', label: 'Register Student', icon: UserPlus },
  { to: '/print-queue', label: 'Print Queue', icon: Printer },
  { to: '/reissue', label: 'Reissue / Revoke', icon: RotateCcw },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { session, registrar, signOut } = useAuth()

  // The profile row can resolve a beat after the session does, so fall back to
  // the signed-in email rather than showing an empty footer.
  const name = registrar?.name ?? session?.user.email ?? 'Signed in'
  const role = registrar?.role ?? 'Registrar'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-8 bg-brand px-[18px] py-7">
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

      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'flex h-[46px] items-center gap-3 rounded-lg px-3.5 transition-colors',
                isActive
                  ? 'bg-brand-active font-semibold text-white'
                  : 'font-medium text-brand-pale hover:bg-brand-active/55',
              )
            }
          >
            <Icon size={20} strokeWidth={1.9} className="shrink-0" />
            <span className="text-base">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-3 border-t border-brand-line px-2.5 py-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold text-[15px] font-bold text-ink">
          {nameInitials(name)}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold text-white">
            {name}
          </span>
          <span className="text-[13px] text-brand-tint">{role}</span>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          aria-label="Sign out"
          title="Sign out"
          className="ml-auto shrink-0 cursor-pointer rounded-md p-1.5 text-brand-pale transition-colors hover:bg-brand-active/55 hover:text-white"
        >
          <LogOut size={18} strokeWidth={2} />
        </button>
      </div>
    </aside>
  )
}
