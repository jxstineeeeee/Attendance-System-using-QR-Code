import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar />
      <main className="min-w-0 flex-1">
        {/* Same 1104px content column and 40px gutter as the registrar app. */}
        <div className="mx-auto max-w-[1184px] px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
