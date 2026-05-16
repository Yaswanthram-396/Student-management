import React from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
}

const variantClasses = {
  primary:
    'bg-[#185FA5] text-white hover:bg-[#1451891] active:bg-[#0e3d6e] focus:ring-[#185FA5]/40 disabled:bg-[#185FA5]/40 shadow-sm hover:shadow-md',
  secondary:
    'bg-white text-[#101828] border border-[#EAECF0] hover:bg-[#F8FAFF] hover:border-[#185FA5]/30 focus:ring-[#185FA5]/30 shadow-sm',
  danger:
    'bg-[#D92D20] text-white hover:bg-[#B42318] active:bg-[#912018] focus:ring-[#D92D20]/40 disabled:bg-[#D92D20]/40 shadow-sm',
  ghost:
    'bg-transparent text-[#185FA5] hover:bg-[#F0F4FF] focus:ring-[#185FA5]/30',
}

const sizeClasses = {
  sm: 'px-3.5 py-2 text-sm gap-1.5',
  md: 'px-4.5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center font-semibold rounded-[9px]
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      {children}
    </button>
  )
}
