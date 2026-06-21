import { useState, useEffect } from 'react'
import styles from './InstallBanner.module.css'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window { __installPrompt?: BeforeInstallPromptEvent | null }
}

const DISMISSED_KEY = 'pwa-install-dismissed'

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    if (isIOS()) {
      setShowIOS(true)
      setVisible(true)
      return
    }

    // Проверяем глобальный промпт (захвачен до монтирования React)
    if (window.__installPrompt) {
      setDeferredPrompt(window.__installPrompt)
      setVisible(true)
      return
    }

    // Подписываемся на случай если событие придёт позже
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    } else {
      dismiss()
    }
    setDeferredPrompt(null)
  }

  if (!visible) return null

  if (showIOS) {
    return (
      <div className={styles.banner}>
        <div className={styles.icon}>🐾</div>
        <div className={styles.text}>
          <strong>Добавить на экран</strong>
          <span>
            Нажмите{' '}
            <span className={styles.shareIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>
            {' '}→ «На экран Домой»
          </span>
        </div>
        <button className={styles.close} onClick={dismiss} aria-label="Закрыть">✕</button>
      </div>
    )
  }

  return (
    <div className={styles.banner}>
      <div className={styles.icon}>🐾</div>
      <div className={styles.text}>
        <strong>Pet Hotel</strong>
        <span>Установить как приложение</span>
      </div>
      <button className={styles.installBtn} onClick={install}>Установить</button>
      <button className={styles.close} onClick={dismiss} aria-label="Закрыть">✕</button>
    </div>
  )
}
