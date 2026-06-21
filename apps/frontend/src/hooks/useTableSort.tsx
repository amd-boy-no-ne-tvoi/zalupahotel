import { useState, useMemo } from 'react'

type SortDir = 'asc' | 'desc'

// Standalone stable component — NOT defined inside the hook to avoid React remounting on every render
export function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span style={{ opacity: 0.3, fontSize: 10, marginLeft: 3 }}>⇅</span>
  return <span style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 3 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

export function useTableSort<T extends Record<string, unknown>>(data: T[]) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), 'ru', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  return { sorted, toggleSort, sortKey, sortDir }
}
