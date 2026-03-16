import styles from './RiskValue.module.css'

interface RiskValueProps {
  risk: number
  value: number
}

const DOT = 5

function Dots({ filled, color }: { filled: number; color: string }) {
  return (
    <span className={styles.dots}>
      {Array.from({ length: DOT }).map((_, i) => (
        <span
          key={i}
          className={styles.dot}
          style={{ background: i < filled ? color : 'var(--gray-200)' }}
        />
      ))}
    </span>
  )
}

export function RiskValue({ risk, value }: RiskValueProps) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>R</span>
      <Dots filled={risk}  color="var(--c-red)" />
      <span className={styles.label}>V</span>
      <Dots filled={value} color="var(--c-green)" />
    </div>
  )
}
