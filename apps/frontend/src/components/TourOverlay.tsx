import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTour } from '../context/TourContext'
import styles from './TourOverlay.module.css'

interface Rect { top: number; left: number; width: number; height: number }

function getRect(selector: string): Rect | null {
  const el = document.querySelector(`[data-tour="${selector}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

const PAD = 10  // padding around highlighted element
const TIP_W = 340  // tooltip width

export default function TourOverlay() {
  const { active, currentStep, stepIndex, totalSteps, next, prev, stop } = useTour()
  const [rect, setRect] = useState<Rect | null>(null)
  const [visible, setVisible] = useState(false)

  const updateRect = useCallback(() => {
    if (!currentStep?.selector) { setRect(null); return }
    const r = getRect(currentStep.selector)
    setRect(r)
  }, [currentStep])

  // Update rect when step changes
  useEffect(() => {
    if (!active) { setVisible(false); return }
    setVisible(false)

    // Click element to open modal/panel before showing step
    if (currentStep?.clickBefore) {
      const el = document.querySelector(`[data-tour="${currentStep.clickBefore}"]`) as HTMLElement | null
      el?.click()
    }

    const baseDelay = 100
    const extraDelay = currentStep?.delay ?? 0
    const t = setTimeout(() => {
      updateRect()
      setVisible(true)
    }, baseDelay + extraDelay)
    return () => clearTimeout(t)
  }, [active, stepIndex, updateRect, currentStep])

  // Keep rect updated on scroll/resize
  useEffect(() => {
    if (!active || !currentStep?.selector) return
    const update = () => { updateRect() }
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [active, currentStep, updateRect])

  if (!active || !visible) return null

  const isCentered = !currentStep?.selector || !rect

  // Tooltip position — всегда явные координаты, без transform, с clamping
  let tipStyle: React.CSSProperties = {}
  const MARGIN = 16
  const TIP_H = 230  // примерная высота тултипа

  if (rect && currentStep?.selector) {
    const midX = rect.left + rect.width / 2
    const left = Math.min(
      Math.max(midX - TIP_W / 2, 12),
      window.innerWidth - TIP_W - 12
    )

    // Пространство снизу и сверху от элемента
    const spaceBelow = window.innerHeight - (rect.top + rect.height + PAD + MARGIN)
    const spaceAbove = rect.top - PAD - MARGIN

    // Предпочитаем сторону где больше места; hint из align
    const preferAbove = currentStep.align === 'top'
      ? spaceAbove >= TIP_H || spaceAbove >= spaceBelow
      : spaceAbove > spaceBelow && spaceAbove >= TIP_H

    let top: number
    if (preferAbove) {
      // Показываем ВЫШЕ элемента
      top = rect.top - PAD - MARGIN - TIP_H
    } else {
      // Показываем НИЖЕ элемента
      top = rect.top + rect.height + PAD + MARGIN
    }

    // Clamp: не выходить за экран
    top = Math.max(12, Math.min(top, window.innerHeight - TIP_H - 12))

    tipStyle = { top, left }
  }

  const spotStyle: React.CSSProperties = rect ? {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  } : {}

  const progress = ((stepIndex + 1) / totalSteps) * 100

  return createPortal(
    <div className={styles.root} onClick={(e) => e.target === e.currentTarget && stop()}>
      {/* Dark overlay */}
      <div className={`${styles.overlay} ${isCentered ? styles.overlayFull : ''}`} />

      {/* Spotlight cutout */}
      {!isCentered && rect && (
        <div className={styles.spotlight} style={spotStyle} />
      )}

      {/* Tooltip / modal */}
      <div
        className={`${styles.tooltip} ${isCentered ? styles.tooltipCentered : ''}`}
        style={isCentered ? {} : tipStyle}
      >
        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.tooltipInner}>
          <div className={styles.stepCount}>{stepIndex + 1} / {totalSteps}</div>
          <h3 className={styles.title}>{currentStep?.title}</h3>
          <p className={styles.body}>{currentStep?.body}</p>

          <div className={styles.actions}>
            <button className={styles.stopBtn} onClick={stop}>Выйти</button>
            <div className={styles.navBtns}>
              {stepIndex > 0 && (
                <button className={styles.prevBtn} onClick={prev}>← Назад</button>
              )}
              <button className={styles.nextBtn} onClick={next}>
                {stepIndex === totalSteps - 1 ? 'Завершить ✓' : 'Далее →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
