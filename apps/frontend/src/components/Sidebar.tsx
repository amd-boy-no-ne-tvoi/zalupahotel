import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!user) return null

  const NAV: Record<string, { to: string; icon: string; label: string }[]> = {
    admin: [
      { to: '/admin', icon: '⬡', label: t('nav.home') },
      { to: '/admin/stays', icon: '🏠', label: t('nav.stays') },
      { to: '/admin/reports', icon: '📋', label: t('nav.allReports') },
      { to: '/employee/stays', icon: '📝', label: t('nav.fillReport') },
      { to: '/admin/pets', icon: '🐾', label: t('nav.pets') },
      { to: '/admin/cages', icon: '🔲', label: t('nav.cages') },
      { to: '/admin/users', icon: '👥', label: t('nav.users') },
      { to: '/admin/stats', icon: '📊', label: 'Статистика' },
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
      { to: '/owner/pets', icon: '🐾', label: t('nav.myPets') },
      { to: '/owner/stays', icon: '🏠', label: t('nav.stays') },
      { to: '/owner/reports', icon: '📋', label: t('nav.reports') },
      { to: '/settings', icon: '⚙', label: t('nav.settings') },
    ],
  }

  const items = NAV[user.role] ?? []

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>🐾</span>
        <span className={styles.brandName}>Pet Hotel</span>
      </div>

      <nav className={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.split('/').length === 2}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.bottom}>
        <NavLink to="/profile" className={({ isActive }) => `${styles.userInfo} ${isActive ? styles.userInfoActive : ''}`}>
          <div className={styles.userName}>{user.name}</div>
          <div className={styles.userRole}>{t(`roles.${user.role}`)}</div>
        </NavLink>
        <button className={styles.logoutBtn} onClick={handleLogout} title={t('common.logout')}>
          ↩
        </button>
      </div>
    </aside>
  )
}
