import type { Toast } from '../context/ToastContext'
import styles from './Toast.module.css'

interface Props {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

const ICON: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  if (!toasts.length) return null
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
          <span className={styles.icon}>{ICON[t.type]}</span>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
