import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import InstallBanner from './InstallBanner'
import styles from './Layout.module.css'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      {/* Desktop sidebar */}
      <div className={styles.sidebarWrap}>
        <Sidebar />
      </div>

      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>

      {/* Mobile bottom nav — hidden on desktop via CSS */}
      <BottomNav />

      {/* "Add to home screen" prompt — mobile only */}
      <InstallBanner />
    </div>
  )
}
