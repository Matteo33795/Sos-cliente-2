import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { MaterialiListPage } from './pages/MaterialiListPage'
import { MaterialeDetailPage } from './pages/MaterialeDetailPage'
import { MaterialeFormPage } from './pages/MaterialeFormPage'
import { MovimentoFormPage } from './pages/MovimentoFormPage'
import { StoricoPage } from './pages/StoricoPage'
import { UbicazioniPage } from './pages/UbicazioniPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrati" element={<RegisterPage />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<MaterialiListPage />} />
          <Route path="/materiali/nuovo" element={<MaterialeFormPage />} />
          <Route path="/materiali/:id" element={<MaterialeDetailPage />} />
          <Route path="/materiali/:id/modifica" element={<MaterialeFormPage />} />
          <Route path="/movimento" element={<MovimentoFormPage />} />
          <Route path="/storico" element={<StoricoPage />} />
          <Route path="/ubicazioni" element={<UbicazioniPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
