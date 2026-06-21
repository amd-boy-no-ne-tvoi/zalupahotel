import { usePushSubscription } from '../hooks/usePushSubscription'
import styles from './PushToggle.module.css'

export default function PushToggle() {
  const { state, subscribe, unsubscribe } = usePushSubscription()

  if (state === 'unsupported') return null

  if (state === 'denied') {
    return (
      <div className={styles.denied}>
        <span>🔕</span>
        <span>Уведомления заблокированы в настройках браузера</span>
      </div>
    )
  }

  if (state === 'loading') {
    return <div className={styles.loading}>Проверка уведомлений...</div>
  }

  if (state === 'subscribed') {
    return (
      <div className={styles.row}>
        <div className={styles.info}>
          <span className={styles.bell}>🔔</span>
          <div>
            <div className={styles.label}>Уведомления включены</div>
            <div className={styles.sub}>Вы получаете push-уведомления</div>
          </div>
        </div>
        <button className={styles.btnOff} onClick={unsubscribe}>Отключить</button>
      </div>
    )
  }

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={styles.bell}>🔕</span>
        <div>
          <div className={styles.label}>Уведомления выключены</div>
          <div className={styles.sub}>Включите, чтобы получать оповещения</div>
        </div>
      </div>
      <button className={styles.btnOn} onClick={subscribe}>Включить</button>
    </div>
  )
}
