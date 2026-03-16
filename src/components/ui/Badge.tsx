import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: string
  className?: string
}

export function Badge({ children, variant = '', className = '' }: BadgeProps) {
  return (
    <span className={`badge ${variant ? `badge-${variant}` : ''} ${className}`}>
      {children}
    </span>
  )
}
