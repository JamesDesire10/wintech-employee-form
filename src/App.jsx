import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import EmployeeForm from './components/EmployeeForm'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmployeeDetail from './pages/EmployeeDetail'

function PrivateRoute({ children }) {
  const stored = sessionStorage.getItem('wintech_admin')
  if (!stored) return <Navigate to="/admin" />
  
  try {
    const { expiry } = JSON.parse(stored)
    if (Date.now() > expiry) {
      sessionStorage.removeItem('wintech_admin')
      return <Navigate to="/admin" />
    }
    return children
  } catch {
    sessionStorage.removeItem('wintech_admin')
    return <Navigate to="/admin" />
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EmployeeForm />} />
        <Route path="/admin" element={<Login />} />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/dashboard/:id" element={
          <PrivateRoute>
            <EmployeeDetail />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App