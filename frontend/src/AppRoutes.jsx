
import { Navigate, Route, Routes } from 'react-router-dom'
import App from './App'
import Login from './auth/Login'
import Signup from './auth/Signup'
import ProtectedRoute from './auth/ProtectedRoute'
import RoleDashboard from './auth/RoleDashboard'
import ConsumerDashboard from './auth/ConsumerDashboard'
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/*" element={<App />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
        <Route path="/farmer/*" element={<RoleDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['consumer']} />}>
        <Route path="/consumer/*" element={<ConsumerDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['bulk_buyer']} />}>
        <Route path="/bulk-buyer/*" element={<RoleDashboard />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default AppRoutes
