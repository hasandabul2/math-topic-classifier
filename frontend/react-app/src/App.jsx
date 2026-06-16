import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ClassifierPage from './pages/ClassifierPage'
import BulkClassifierPage from './pages/BulkClassifierPage'
import HistoryPage from './pages/HistoryPage'
import PricingPage from './pages/PricingPage'
import AdminPage from './pages/AdminPage'
import PaymentResultPage from './pages/PaymentResultPage'
import Navbar from './components/Navbar'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  const { theme } = useTheme()

  const shellClass = theme === 'dark'
    ? 'min-h-screen font-sans bg-slate-950 text-slate-100'
    : 'min-h-screen font-sans bg-slate-50 text-slate-900'

  return (
    <div className={shellClass}>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><ClassifierPage /></ProtectedRoute>} />
        <Route path="/bulk" element={<ProtectedRoute><BulkClassifierPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/payment-result" element={<PaymentResultPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
