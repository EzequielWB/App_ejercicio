import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Biblioteca from './routes/Biblioteca'
import Dashboard from './routes/Dashboard'
import Historial from './routes/Historial'
import HistorialDetalle from './routes/HistorialDetalle'
import Perfil from './routes/Perfil'
import Progreso from './routes/Progreso'
import RutinaEditor from './routes/RutinaEditor'
import Rutinas from './routes/Rutinas'
import Sesion from './routes/Sesion'

export default function App() {
  const { pathname } = useLocation()
  const wide = pathname === '/sesion'
  return (
    <div className="app-shell">
      <main className={`app-main${wide ? ' session-wide' : ''}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rutinas" element={<Rutinas />} />
          <Route path="/rutinas/nueva" element={<RutinaEditor />} />
          <Route path="/rutinas/:id" element={<RutinaEditor />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/sesion" element={<Sesion />} />
          <Route path="/progreso" element={<Progreso />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/historial/:id" element={<HistorialDetalle />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
