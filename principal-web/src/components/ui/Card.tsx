import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
  onClick?: () => void
}

export function Card({ children, className = '', padding = true, onClick }: CardProps) {
  return (
    <div
      className={`
        bg-white border border-[#EAECF0] rounded-[12px] shadow-card
        transition-all-smooth
        ${padding ? 'p-6' : ''}
        ${onClick ? 'cursor-pointer hover:border-[#185FA5]/30 hover:shadow-card-hover' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
