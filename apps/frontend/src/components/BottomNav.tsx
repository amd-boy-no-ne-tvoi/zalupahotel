import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  const { user } = useAuth()
  const { t } = useTranslation()

  if (!user) return null

  const NAV: Record<string, { to: string; icon: string; label: string }[]> = {
    admin: [
      { to: '/admin', icon: '⬡', label: t('nav.home') },
      { to: '/admin/stays', icon: '🏠', label: t('nav.stays') },
      { to: '/admin/reports', icon: '📋', label: t('nav.reports') },
      { to: '/admin/pets', icon: '🐾', label: t('nav.pets') },
      { to: '/settings', icon: '⚙', label: t('nav.settings') },
    ],
    employee: [
      { to: '/employee', icon: '⬡', label: t('nav.home') },
      { to: '/employee/stays', icon: '🐶', label: t('nav.guests') },
      { to: '/employee/reports', icon: '📋', label: t('nav.reports') },
      { to: '/settings', icon: '⚙', label: t('nav.settings') },
    ],
    owner: [
      { to: '/owner', icon: '⬡', label: t('nav.home') },
      { to: '/owner/pets', icon: '🐾', label: t('nav.pets') },
      { to: '/owner/stays', icon: '🏠', label: t('nav.stays') },
      { to: '/owner/reports', icon: '📋', label: t('nav.reports') },
      { to: '/settings', icon: '⚙', label: t('nav.settings') },
    ],
  }

  const items = NAV[user.role] ?? []

  return (
    <nav className={styles.nav}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split('/').length === 2}
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
