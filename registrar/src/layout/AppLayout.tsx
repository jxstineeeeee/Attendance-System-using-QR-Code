import { Outlet } from 'react-router-dom'
import { PrinterProvider } from '../lib/printer'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  // PrinterProvider sits here rather than at the root: /printers needs a
  // session, and the login screen has none.
  return (
    <PrinterProvider>
      <div className="flex min-h-screen bg-cream">
        <Sidebar />
        <main className="min-w-0 flex-1">
          {/* 1104px content column with a 40px gutter, matching the Figma frames. */}
          <div className="mx-auto max-w-[1184px] px-10 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </PrinterProvider>
  )
}
