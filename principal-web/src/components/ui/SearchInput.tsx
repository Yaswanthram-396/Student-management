import React from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function SearchInput({ className = '', ...props }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none"
      />
      <input
        type="text"
        className="w-full pl-9 pr-3 py-2 text-sm text-[#101828] bg-white border border-[#EAECF0] rounded-lg
          placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent
          transition-colors duration-150"
        {...props}
      />
    </div>
  )
}
