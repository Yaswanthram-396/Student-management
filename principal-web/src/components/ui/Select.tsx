import React from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, id, className = '', ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-[#1a2340]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={`
            w-full px-4 py-2.5 pr-9 text-sm text-[#101828] bg-white
            border rounded-[10px] appearance-none transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 focus:border-[#185FA5]
            hover:border-[#185FA5]/30
            disabled:bg-[#F8FAFF] disabled:cursor-not-allowed
            ${error ? 'border-[#D92D20] focus:ring-[#D92D20]/30' : 'border-[#EAECF0]'}
            ${className}
          `}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
        />
      </div>
      {error && <p className="text-xs text-[#D92D20] font-medium">{error}</p>}
    </div>
  )
}
