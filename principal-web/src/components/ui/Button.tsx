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
    'bg-[#185FA5] text-white hover:bg-[#1451891] focus:ring-[#185FA5] disabled:bg-[#185FA5]/50',
  secondary:
    'bg-white text-[#101828] border border-[#EAECF0] hover:bg-gray-50 focus:ring-gray-300',
  danger:
    'bg-[#D92D20] text-white hover:bg-[#B42318] focus:ring-[#D92D20] disabled:bg-[#D92D20]/50',
  ghost:
    'bg-transparent text-[#185FA5] hover:bg-[#185FA5]/10 focus:ring-[#185FA5]',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
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
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:cursor-not-allowed
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
