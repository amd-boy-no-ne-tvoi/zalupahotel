import { useEffect } from 'react'
import styles from './Lightbox.module.css'

interface Props {
  urls: string[]
  index: number
  onClose: () => void
  onNav: (index: number) => void
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function toSrc(url: string) {
  return url.startsWith('http') ? url : `${API_BASE}${url}`
}

export default function Lightbox({ urls, index, onClose, onNav }: Props) {
  const src = toSrc(urls[index])
  const isVideo = urls[index].endsWith('.mp4')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && index < urls.length - 1) onNav(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, urls.length, onClose, onNav])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.close} onClick={onClose}>✕</button>

      {index > 0 && (
        <button className={`${styles.nav} ${styles.prev}`} onClick={(e) => { e.stopPropagation(); onNav(index - 1) }}>‹</button>
      )}

      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        {isVideo
          ? <video src={src} controls className={styles.media} autoPlay />
          : <img src={src} alt="" className={styles.media} />
        }
        {urls.length > 1 && (
          <div className={styles.counter}>{index + 1} / {urls.length}</div>
        )}
      </div>

      {index < urls.length - 1 && (
        <button className={`${styles.nav} ${styles.next}`} onClick={(e) => { e.stopPropagation(); onNav(index + 1) }}>›</button>
      )}
    </div>
  )
}
