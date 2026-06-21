import styles from './Pagination.module.css'

interface Props {
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
}

export default function Pagination({ total, page, pageSize, onChange }: Props) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  function pageNumbers(): (number | '…')[] {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    const result: (number | '…')[] = [1]
    if (page > 3) result.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) result.push(i)
    if (page < pages - 2) result.push('…')
    result.push(pages)
    return result
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.info}>{start}–{end} из {total}</span>
      <div className={styles.pages}>
        <button className={styles.btn} onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
        {pageNumbers().map((n, i) =>
          n === '…'
            ? <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
            : <button
                key={n}
                className={`${styles.btn} ${page === n ? styles.active : ''}`}
                onClick={() => onChange(n)}
              >{n}</button>
        )}
        <button className={styles.btn} onClick={() => onChange(page + 1)} disabled={page === pages}>›</button>
      </div>
    </div>
  )
}
