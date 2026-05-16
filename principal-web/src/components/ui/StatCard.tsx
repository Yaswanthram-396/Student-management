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

/** Tiny inline sparkline — 8 bars, last one highlighted */
function Sparkline({ direction }: { direction: 'up' | 'down' | 'neutral' }) {
  const color =
    direction === 'up' ? '#16825D' : direction === 'down' ? '#D92D20' : '#667085'
  const heights = [30, 45, 35, 55, 40, 60, 50, 70]
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" className="mt-2">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 9}
          y={24 - h * 0.3}
          width="6"
          height={h * 0.3}
          rx="2"
          fill={i === heights.length - 1 ? color : color + '40'}
        />
      ))}
    </svg>
  )
}

export function StatCard({ icon, value, label, trend, iconBg = 'bg-[#185FA5]/10', className = '' }: StatCardProps) {
  return (
    <div
      className={`
        relative bg-[#F0F4FF] border border-[#DBEAFE]/80 rounded-[12px]
        p-6 shadow-card overflow-hidden transition-all-smooth hover:shadow-card-hover
        ${className}
      `}
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#185FA5] to-[#3B82F6] rounded-t-[12px]" />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#4B6FA8] mb-1 tracking-wide uppercase" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
            {label}
          </p>
          <p className="text-[32px] font-extrabold text-[#1a2340] leading-none mt-1">{value}</p>

          {trend && (
            <>
              <Sparkline direction={trend.direction} />
              <div className="flex items-center gap-1.5 mt-1">
                {trend.direction === 'up'      && <TrendingUp  size={13} className="text-[#16825D]" />}
                {trend.direction === 'down'    && <TrendingDown size={13} className="text-[#D92D20]" />}
                {trend.direction === 'neutral' && <Minus       size={13} className="text-[#667085]" />}
                <span
                  className={`text-xs font-semibold ${
                    trend.direction === 'up'
                      ? 'text-[#16825D]'
                      : trend.direction === 'down'
                      ? 'text-[#D92D20]'
                      : 'text-[#667085]'
                  }`}
                >
                  {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : ''}
                  {' '}{Math.abs(trend.value)}%
                </span>
                {trend.label && (
                  <span className="text-xs text-[#667085]">{trend.label}</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className={`p-3 rounded-[10px] ${iconBg} text-[#185FA5] ml-4 flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
