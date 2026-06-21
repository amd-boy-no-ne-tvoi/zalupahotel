import { useRef, useState } from 'react'
import api from '../lib/api'
import styles from './PhotoUpload.module.css'

interface Props {
  value?: string
  onChange: (url: string) => void
  label?: string
}

interface MultiProps {
  onAdd: (urls: string[]) => void
  uploading?: boolean
  onUploading?: (v: boolean) => void
  label?: string
  buttonClassName?: string
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function uploadFile(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.url as string
}

// Single-file upload (pet photo, etc.)
export default function PhotoUpload({ value, onChange, label = 'Фото' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    try {
      onChange(await uploadFile(file))
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const previewSrc = value ? (value.startsWith('http') ? value : `${API_BASE}${value}`) : null

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>{label}</span>
      <div
        className={`${styles.dropzone} ${uploading ? styles.uploading : ''}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {previewSrc ? (
          <div className={styles.preview}>
            <img src={previewSrc} alt="preview" />
            <button
              className={styles.remove}
              onClick={(e) => { e.stopPropagation(); onChange('') }}
            >✕</button>
          </div>
        ) : (
          <div className={styles.placeholder}>
            {uploading ? (
              <><span className={styles.spinner} />Загрузка...</>
            ) : (
              <><span>📷</span><span>Нажмите или перетащите</span><span className={styles.hint}>jpg, png, webp, mp4 · до 20 МБ</span></>
            )}
          </div>
        )}
      </div>
      {error && <span className={styles.error}>{error}</span>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

// Multi-file upload button — for report photo section
export function MultiPhotoButton({ onAdd, onUploading, label = '+ Добавить фото', buttonClassName }: MultiProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    if (!files.length) return
    setError('')
    setUploading(true)
    onUploading?.(true)
    setProgress({ done: 0, total: files.length })

    const urls: string[] = []
    for (const file of Array.from(files)) {
      try {
        const url = await uploadFile(file)
        urls.push(url)
        setProgress((p) => p ? { ...p, done: p.done + 1 } : null)
      } catch {
        // skip failed files silently, keep uploading others
      }
    }

    if (urls.length) onAdd(urls)
    setUploading(false)
    onUploading?.(false)
    setProgress(null)
    // reset input so same files can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {uploading && progress
          ? `⏳ ${progress.done} / ${progress.total}...`
          : label}
      </button>
      {error && <span className={styles.error}>{error}</span>}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,video/mp4"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files) }}
      />
    </>
  )
}
