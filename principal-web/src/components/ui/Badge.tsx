import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md'
  className?: string
}

const variantClasses = {
  default: 'bg-[#F2F4F7] text-[#344054] border border-[#EAECF0]',
  success: 'bg-[#DCFAE6] text-[#16825D] border border-[#ABEFC6]',
  warning: 'bg-[#FEF0C7] text-[#C76A00] border border-[#FED082]',
  danger:  'bg-[#FEE4E2] text-[#D92D20] border border-[#FCA5A5]',
  info:    'bg-[#EFF8FF] text-[#185FA5] border border-[#BFDBFE]',
  purple:  'bg-[#F5F3FF] text-[#6941C6] border border-[#DDD6FE]',
}

const sizeClasses = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-semibold rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
