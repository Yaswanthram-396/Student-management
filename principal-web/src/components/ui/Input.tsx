import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({ label, error, helperText, id, className = '', ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-[#1a2340]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-2.5 text-sm text-[#101828] bg-white
          border rounded-[10px] transition-all duration-150
          placeholder:text-[#9CA3AF]
          focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 focus:border-[#185FA5]
          disabled:bg-[#F8FAFF] disabled:cursor-not-allowed
          ${error ? 'border-[#D92D20] focus:ring-[#D92D20]/30 focus:border-[#D92D20]' : 'border-[#EAECF0] hover:border-[#185FA5]/30'}
          ${className}
        `}
        {...props}
      />
      {error      && <p className="text-xs text-[#D92D20] font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-[#667085]">{helperText}</p>}
    </div>
  )
}
