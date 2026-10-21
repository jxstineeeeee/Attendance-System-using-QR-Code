import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Attendance } from './pages/Attendance'
import { Users } from './pages/Users'
import { Devices } from './pages/Devices'
import { Academic } from './pages/Academic'
import { AuditLog } from './pages/AuditLog'
import { Settings } from './pages/Settings'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />

      {/* Everything past here needs an admin session. */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/users" element={<Users />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/academic" element={<Academic />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
