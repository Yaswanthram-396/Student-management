import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setError('Enter a valid 10-digit phone number')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }

    setLoading(true)
    try {
      await login(phone.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EAECF0] p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-[#185FA5] rounded-2xl flex items-center justify-center mb-4 shadow-md">
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#101828]">Principal Dashboard</h1>
            <p className="text-sm text-[#667085] mt-1">Sign in to manage your school</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 mb-5 bg-[#FEE4E2] border border-[#D92D20]/20 rounded-lg">
              <AlertCircle size={16} className="text-[#D92D20] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[#D92D20]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter your 10-digit phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              autoFocus
              maxLength={10}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#101828]">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 pr-10 text-sm text-[#101828] bg-white border border-[#EAECF0] rounded-lg
                    placeholder:text-[#667085] focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent
                    transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Sign in
            </Button>
          </form>

          <p className="text-center text-xs text-[#667085] mt-6">
            School Management System &mdash; Principal Portal
          </p>
        </div>
      </div>
    </div>
  )
}
