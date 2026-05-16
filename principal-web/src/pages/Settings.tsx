import React, { useEffect, useState, useCallback } from 'react'
import { Save, School as SchoolIcon, Settings2 } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { Card } from '../components/ui/Card'
import { getSchool, getConfiguration, updateConfiguration } from '../api/principal'
import type { School, Configuration } from '../types'

export default function SettingsPage() {
  const [school, setSchool] = useState<School | null>(null)
  const [config, setConfig] = useState<Configuration>({
    school_id: '',
    subdomain: '',
    attendance_frequency: 'TWICE',
    parent_query_enabled: true,
    whatsapp_absent_automation_enabled: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [schoolData, configData] = await Promise.allSettled([
        getSchool(),
        getConfiguration(),
      ])
      if (schoolData.status === 'fulfilled') setSchool(schoolData.value)
      if (configData.status === 'fulfilled') setConfig(configData.value)
    } catch {
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const updated = await updateConfiguration({
        attendance_frequency: config.attendance_frequency,
        whatsapp_absent_automation_enabled: config.whatsapp_absent_automation_enabled,
        parent_query_enabled: config.parent_query_enabled,
      })
      setConfig(prev => ({ ...prev, ...updated }))
      setSuccessMsg('Settings saved successfully!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" className="text-[#185FA5]" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage school configuration and preferences"
      />

      {error && (
        <div className="mb-4 p-3 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg text-sm text-[#D92D20]">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-[#DCFAE6] border border-[#16825D]/20 rounded-lg text-sm text-[#16825D]">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* School Info (read-only) */}
        {school && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-[#185FA5]/10 rounded-lg text-[#185FA5]">
                <SchoolIcon size={18} />
              </div>
              <h2 className="text-sm font-semibold text-[#101828]">School Information</h2>
            </div>
            <div className="space-y-3">
              <InfoRow label="School Name" value={school.name} />
              <InfoRow label="Subdomain" value={school.subdomain} />
              {school.contact_email && (
                <InfoRow label="Contact Email" value={school.contact_email} />
              )}
              {school.contact_phone && (
                <InfoRow label="Contact Phone" value={school.contact_phone} />
              )}
              {school.address && (
                <InfoRow label="Address" value={school.address} />
              )}
            </div>
          </Card>
        )}

        {/* Configuration */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-[#185FA5]/10 rounded-lg text-[#185FA5]">
              <Settings2 size={18} />
            </div>
            <h2 className="text-sm font-semibold text-[#101828]">School Configuration</h2>
          </div>
          <div className="space-y-5">
            {/* Attendance Frequency */}
            <div>
              <p className="text-sm font-medium text-[#101828] mb-2">Attendance Frequency</p>
              <p className="text-xs text-[#667085] mb-3">
                How often attendance is taken per day
              </p>
              <div className="flex gap-3">
                {(['ONCE', 'TWICE'] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setConfig((c) => ({ ...c, attendance_frequency: freq }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      config.attendance_frequency === freq
                        ? 'bg-[#185FA5] text-white border-[#185FA5]'
                        : 'bg-white text-[#667085] border-[#EAECF0] hover:border-[#185FA5]/40'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <ToggleRow
              label="WhatsApp Absent Automation"
              description="Automatically send WhatsApp messages to parents of absent students"
              checked={config.whatsapp_absent_automation_enabled}
              onChange={(v) => setConfig((c) => ({ ...c, whatsapp_absent_automation_enabled: v }))}
            />

            <ToggleRow
              label="Parent Query"
              description="Allow parents to raise queries through the system"
              checked={config.parent_query_enabled}
              onChange={(v) => setConfig((c) => ({ ...c, parent_query_enabled: v }))}
            />
          </div>

          <div className="mt-6 pt-4 border-t border-[#EAECF0]">
            <Button
              variant="primary"
              size="md"
              loading={saving}
              leftIcon={<Save size={16} />}
              onClick={handleSave}
            >
              Save Settings
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#EAECF0] last:border-0">
      <span className="text-sm text-[#667085] flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-[#101828] text-right">{value}</span>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-[#101828]">{label}</p>
        <p className="text-xs text-[#667085] mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:ring-offset-1 ${
          checked ? 'bg-[#185FA5]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
