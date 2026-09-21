import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 } as const

const IconHome = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />
  </svg>
)

const IconList = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
)

const IconPlay = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5v7l6-3.5z" />
  </svg>
)

const IconChart = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <path d="M4 20h16M7 16v-4M12 16V7M17 16v-7" />
  </svg>
)

const IconUser = () => (
  <svg viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
)

const items = [
  { to: '/', end: true, label: 'Hoy', icon: <IconHome /> },
  { to: '/rutinas', end: false, label: 'Rutinas', icon: <IconList /> },
  { to: '/sesion', end: false, label: 'Sesión', icon: <IconPlay /> },
  { to: '/progreso', end: false, label: 'Progreso', icon: <IconChart /> },
  { to: '/perfil', end: false, label: 'Perfil', icon: <IconUser /> }
]

export default function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Navegación principal">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}