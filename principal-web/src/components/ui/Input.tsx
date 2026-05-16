import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#101828]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2 text-sm text-[#101828] bg-white
          border rounded-lg transition-colors duration-150
          placeholder:text-[#667085]
          focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent
          disabled:bg-gray-50 disabled:cursor-not-allowed
          ${error ? 'border-[#D92D20] focus:ring-[#D92D20]' : 'border-[#EAECF0]'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-[#D92D20]">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#667085]">{helperText}</p>}
    </div>
  )
}
