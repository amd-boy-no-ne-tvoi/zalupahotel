import { useState, useEffect } from 'react'
import { usePushSubscription } from '../hooks/usePushSubscription'
import styles from './NotificationBanner.module.css'

const DISMISSED_KEY = 'push-banner-dismissed'

export default function NotificationBanner() {
  const { state, subscribe } = usePushSubscription()
  const [visible, setVisible] = useState(false)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (state === 'unsubscribed' && !sessionStorage.getItem(DISMISSED_KEY)) {
      setVisible(true)
    }
  }, [state])

  if (!visible || state !== 'unsubscribed') return null

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function handleEnable() {
    setAsking(true)
    await subscribe()
    setAsking(false)
    setVisible(false)
  }

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <span className={styles.icon}>🔔</span>
        <div>
          <div className={styles.title}>Включите push-уведомления</div>
          <div className={styles.sub}>Узнавайте об отчётах и напоминаниях сразу на телефон</div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.btnEnable} onClick={handleEnable} disabled={asking}>
          {asking ? 'Подождите...' : 'Включить'}
        </button>
        <button className={styles.btnDismiss} onClick={dismiss}>Позже</button>
      </div>
    </div>
  )
}
