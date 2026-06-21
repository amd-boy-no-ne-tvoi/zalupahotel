import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styles from './SearchableSelect.module.css'

export interface SelectOption {
  value: string
  label: string
  sub?: string
}

interface Props {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

interface DropdownPos { top: number; left: number; width: number; openUp: boolean }

export default function SearchableSelect({
  options, value, onChange,
  placeholder = 'Выберите...', emptyText = 'Ничего не найдено',
  disabled, className,
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, width: 0, openUp: false })

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value)

  const filtered = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sub?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    const dropH = Math.min(filtered.length * 44 + 56, 280)
    const openUp = spaceBelow < dropH && spaceAbove > spaceBelow
    setPos({
      top: openUp ? r.top - dropH - 6 : r.bottom + 6,
      left: r.left,
      width: r.width,
      openUp,
    })
  }, [filtered.length])

  // Close on outside click / scroll / resize
  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
      setQuery('')
    }
    function closeOnScroll() { setOpen(false); setQuery('') }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', updatePos)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  function handleOpen() {
    if (disabled) return
    updatePos()
    setOpen(v => !v)
    setQuery('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleSelect(opt: SelectOption) {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
    >
      <div className={styles.searchWrap}>
        <input
          ref={inputRef}
          className={styles.searchInput}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск..."
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); setQuery('') }
            if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0])
          }}
        />
      </div>
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>{emptyText}</div>
        ) : (
          filtered.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.item} ${opt.value === value ? styles.itemActive : ''}`}
              onClick={() => handleSelect(opt)}
            >
              <span className={styles.itemLabel}>{opt.label}</span>
              {opt.sub && <span className={styles.itemSub}>{opt.sub}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null

  return (
    <div className={`${styles.wrap} ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={handleOpen}
        disabled={disabled}
      >
        <span className={selected ? styles.selectedLabel : styles.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.sub && <span className={styles.selectedSub}>{selected.sub}</span>}
        <span className={styles.arrow}>{open ? '▲' : '▼'}</span>
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  )
}
