import React from 'react'
import { Spinner } from './Spinner'

export interface TableColumn<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  keyExtractor: (row: T) => string | number
}

export function Table<T>({ columns, data, loading = false, emptyMessage = 'No data found', keyExtractor }: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table className="min-w-full divide-y divide-[#F0F4FF]">
        <thead className="bg-[#F8FAFF]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-3.5 text-left text-xs font-bold text-[#4B6FA8] uppercase tracking-wider whitespace-nowrap ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-[#F0F4FF]">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="md" className="text-[#185FA5]" />
                  <div className="space-y-2 w-48">
                    {[1,2,3].map(i => (
                      <div key={i} className="skeleton h-3 w-full" />
                    ))}
                  </div>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[#F0F4FF] flex items-center justify-center mb-1">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 12a1 1 0 110-2 1 1 0 010 2zm1-4a1 1 0 01-2 0V6a1 1 0 112 0v4z" fill="#185FA5" fillOpacity=".4"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[#344054]">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="transition-colors duration-150 hover:bg-[#F5F8FF]"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3.5 text-sm text-[#101828] ${col.className || ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
