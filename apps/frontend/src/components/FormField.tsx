import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react'
import styles from './FormField.module.css'

interface BaseProps { label: string; error?: string; wrapClassName?: string }

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' }
type SelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { as: 'select'; children: ReactNode }

type Props = InputProps | SelectProps

export default function FormField(props: Props) {
  const { label, error, as, wrapClassName, ...rest } = props as Props & { wrapClassName?: string }
  return (
    <label className={`${styles.field} ${wrapClassName ?? ''}`}>
      <span className={styles.label}>{label}</span>
      {as === 'select'
        ? <select className={`${styles.input} ${error ? styles.hasError : ''}`} {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}>
            {(props as SelectProps).children}
          </select>
        : <input className={`${styles.input} ${error ? styles.hasError : ''}`} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      }
      {error && <span className={styles.error}>{error}</span>}
    </label>
  )
}
