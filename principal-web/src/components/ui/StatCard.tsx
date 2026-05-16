import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  icon: React.ReactNode
  value: string | number
  label: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  iconBg?: string
  className?: string
}

export function StatCard({ icon, value, label, trend, iconBg = 'bg-[#185FA5]/10', className = '' }: StatCardProps) {
  return (
    <div className={`bg-white border border-[#EAECF0] rounded-xl p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#667085] font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#101828]">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend.direction === 'up' && <TrendingUp size={14} className="text-[#16825D]" />}
              {trend.direction === 'down' && <TrendingDown size={14} className="text-[#D92D20]" />}
              {trend.direction === 'neutral' && <Minus size={14} className="text-[#667085]" />}
              <span
                className={`text-xs font-medium ${
                  trend.direction === 'up'
                    ? 'text-[#16825D]'
                    : trend.direction === 'down'
                    ? 'text-[#D92D20]'
                    : 'text-[#667085]'
                }`}
              >
                {trend.direction !== 'neutral' ? (trend.direction === 'up' ? '+' : '-') : ''}
                {Math.abs(trend.value)}%
              </span>
              {trend.label && <span className="text-xs text-[#667085]">{trend.label}</span>}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconBg} text-[#185FA5]`}>{icon}</div>
      </div>
    </div>
  )
}
