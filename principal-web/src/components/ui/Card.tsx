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
        bg-white border border-[#EAECF0] rounded-xl shadow-sm
        ${padding ? 'p-5' : ''}
        ${onClick ? 'cursor-pointer hover:border-[#185FA5]/40 hover:shadow-md transition-shadow duration-150' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
