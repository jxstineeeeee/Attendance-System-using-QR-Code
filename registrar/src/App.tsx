import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { RequireAuth } from './components/RequireAuth'
import { Login } from './pages/Login'
import { Students } from './pages/Students'
import { RegisterStudent } from './pages/RegisterStudent'
import { StudentProfile } from './pages/StudentProfile'
import { PrintQueue, ReissueRevoke } from './pages/Placeholder'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          <Route path="/register" element={<RegisterStudent />} />
          <Route path="/print-queue" element={<PrintQueue />} />
          <Route path="/reissue" element={<ReissueRevoke />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/students" replace />} />
    </Routes>
  )
}
