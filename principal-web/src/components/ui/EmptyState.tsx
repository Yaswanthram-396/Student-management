import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-5 w-16 h-16 rounded-2xl bg-[#F0F4FF] border border-[#DBEAFE] flex items-center justify-center text-[#185FA5]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[#1a2340] mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-[#667085] max-w-sm mb-5 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  )
}
