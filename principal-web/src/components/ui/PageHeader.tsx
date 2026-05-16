import React from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-7 -mx-6 px-6 py-5 bg-gradient-to-r from-[#F0F4FF] to-[#F8FAFF] border-b border-[#DBEAFE]/60">
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="font-extrabold text-[#1a2340]"
            style={{ fontSize: '28px', lineHeight: '1.2', letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm font-medium text-[#4B6FA8]">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0 ml-4 mt-0.5">{action}</div>}
      </div>
    </div>
  )
}
