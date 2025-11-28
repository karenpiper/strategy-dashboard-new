'use client'

import { Card } from '@/components/ui/card'
import { useMode } from '@/contexts/mode-context'
import { usePermissions } from '@/contexts/permissions-context'
import { 
  Users, 
  TrendingUp, 
  Heart, 
  MessageSquare, 
  FileText, 
  FolderOpen, 
  Briefcase,
  Activity,
  Loader2,
  Calendar
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface AnalyticsData {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  logins: {
    totalUsers: number
    newSignups: number
    activeUsers: number
    totalLogins: number
    loginsOverTime: Array<{ date: string; count: number }>
    loginsPerUser: Array<{ userId: string; count: number; full_name: string | null; email: string | null; avatar_url: string | null }>
  }
  sentiment: {
    current: number
    historical: Array<{ week: string; mood: number; responses: number }>
    responseRate: number
    currentWeekResponses: number
  }
  snaps: {
    total: number
    inPeriod: number
    overTime: Array<{ date: string; count: number }>
    perUser: Array<{ userId: string; count: number }>
  }
  content: {
    workSamples: { total: number; inPeriod: number }
    mustReads: { total: number; inPeriod: number }
    resources: { total: number; inPeriod: number }
  }
  engagement: {
    toolViews: { total: number; inPeriod: number }
    teamPulseResponseRate: number
  }
}

export default function AnalyticsPage() {
  const { mode } = useMode()
  const { permissions } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<number>(30)

  // Check permissions - only admins should access
  useEffect(() => {
    if (permissions && !permissions.canManageUsers) {
      setError('You do not have permission to view analytics')
      setLoading(false)
    }
  }, [permissions])

  useEffect(() => {
    async function fetchAnalytics() {
      if (!permissions?.canManageUsers) return
      
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/analytics?days=${timeRange}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics')
        }
        
        const analyticsData = await response.json()
        setData(analyticsData)
      } catch (err: any) {
        console.error('Error fetching analytics:', err)
        setError(err.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [timeRange, permissions])

  const getBgClass = () => {
    switch (mode) {
      case 'chaos': return 'bg-[#1A1A1A]'
      case 'chill': return 'bg-[#F5E6D3]'
      case 'code': return 'bg-black'
      default: return 'bg-[#1A1A1A]'
    }
  }

  const getTextClass = () => {
    switch (mode) {
      case 'chaos': return 'text-white'
      case 'chill': return 'text-[#4A1818]'
      case 'code': return 'text-[#FFFFFF]'
      default: return 'text-white'
    }
  }

  const getCardStyle = () => {
    if (mode === 'chaos') {
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#C4F500]', 
        text: 'text-white', 
        accent: '#C4F500' 
      }
    } else if (mode === 'chill') {
      return { 
        bg: 'bg-white', 
        border: 'border border-[#FFC043]/30', 
        text: 'text-[#4A1818]', 
        accent: '#FFC043' 
      }
    } else {
      return { 
        bg: 'bg-[#000000]', 
        border: 'border border-[#FFFFFF]', 
        text: 'text-[#FFFFFF]', 
        accent: '#FFFFFF' 
      }
    }
  }

  const getRoundedClass = (base: string) => {
    if (mode === 'chaos') return base.replace('rounded', 'rounded-[1.5rem]')
    if (mode === 'chill') return base.replace('rounded', 'rounded-2xl')
    return base
  }

  const cardStyle = getCardStyle()

  if (loading) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
        <div className="max-w-[1200px] mx-auto">
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <p className={cardStyle.text}>{error}</p>
          </Card>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // Format sentiment data for chart
  const sentimentChartData = data.sentiment.historical.map(item => ({
    week: new Date(item.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: item.mood,
    responses: item.responses
  }))

  // Format snaps data for chart
  const snapsChartData = data.snaps.overTime.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count
  }))

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>Analytics Dashboard</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Comprehensive metrics and insights</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-4 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center gap-4">
              <Calendar className={`w-4 h-4 ${getTextClass()}`} />
              <span className={`text-sm font-medium ${getTextClass()}`}>Time Range:</span>
              <div className="flex gap-2">
                {[7, 30, 90, 365].map(days => (
                  <button
                    key={days}
                    onClick={() => setTimeRange(days)}
                    className={`px-3 py-1 ${getRoundedClass('rounded-lg')} text-xs font-medium transition-colors ${
                      timeRange === days
                        ? mode === 'chaos' 
                          ? 'bg-[#C4F500] text-black' 
                          : mode === 'chill'
                          ? 'bg-[#FFC043] text-[#4A1818]'
                          : 'bg-[#FFFFFF] text-black'
                        : `${getTextClass()}/30 hover:${getTextClass()}/50`
                    }`}
                  >
                    {days === 365 ? 'All Time' : `${days} Days`}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${cardStyle.text}/70 mb-1`}>Total Users</p>
                <p className={`text-3xl font-bold ${cardStyle.text}`}>{data.logins.totalUsers}</p>
                <p className={`text-xs ${cardStyle.text}/50 mt-1`}>{data.logins.newSignups} new in period</p>
              </div>
              <Users className="w-8 h-8" style={{ color: cardStyle.accent }} />
            </div>
          </Card>

          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${cardStyle.text}/70 mb-1`}>Total Logins</p>
                <p className={`text-3xl font-bold ${cardStyle.text}`}>{data.logins.totalLogins}</p>
                <p className={`text-xs ${cardStyle.text}/50 mt-1`}>{data.logins.activeUsers} active users</p>
              </div>
              <Activity className="w-8 h-8" style={{ color: cardStyle.accent }} />
            </div>
          </Card>

          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${cardStyle.text}/70 mb-1`}>Team Sentiment</p>
                <p className={`text-3xl font-bold ${cardStyle.text}`}>{data.sentiment.current}</p>
                <p className={`text-xs ${cardStyle.text}/50 mt-1`}>{data.sentiment.responseRate}% response rate</p>
              </div>
              <Heart className="w-8 h-8" style={{ color: cardStyle.accent }} />
            </div>
          </Card>

          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${cardStyle.text}/70 mb-1`}>Total Snaps</p>
                <p className={`text-3xl font-bold ${cardStyle.text}`}>{data.snaps.total}</p>
                <p className={`text-xs ${cardStyle.text}/50 mt-1`}>{data.snaps.inPeriod} in period</p>
              </div>
              <MessageSquare className="w-8 h-8" style={{ color: cardStyle.accent }} />
            </div>
          </Card>

          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${cardStyle.text}/70 mb-1`}>Engagement</p>
                <p className={`text-3xl font-bold ${cardStyle.text}`}>{data.engagement.toolViews.inPeriod}</p>
                <p className={`text-xs ${cardStyle.text}/50 mt-1`}>Tool views in period</p>
              </div>
              <Activity className="w-8 h-8" style={{ color: cardStyle.accent }} />
            </div>
          </Card>
        </div>

        {/* Login Statistics Section */}
        {data.logins.totalLogins > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Logins Over Time Chart */}
            <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
              <h2 className={`text-lg font-black uppercase tracking-wider ${cardStyle.text} mb-4`}>Logins Over Time</h2>
              {data.logins.loginsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.logins.loginsOverTime.map(item => ({
                    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    count: item.count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={mode === 'code' ? '#FFFFFF' : mode === 'chill' ? '#4A1818' : '#333333'} opacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      stroke={cardStyle.text}
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke={cardStyle.text}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#FFFFFF' : '#1a1a1a',
                        border: `1px solid ${cardStyle.accent}`,
                        borderRadius: '8px',
                        color: cardStyle.text
                      }}
                    />
                    <Bar dataKey="count" fill={cardStyle.accent} name="Logins" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={`h-[300px] flex items-center justify-center ${cardStyle.text}/50`}>
                  <p>No login data available</p>
                </div>
              )}
            </Card>

            {/* Top Users by Login Count */}
            <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
              <h2 className={`text-lg font-black uppercase tracking-wider ${cardStyle.text} mb-4`}>Most Active Users</h2>
              {data.logins.loginsPerUser.length > 0 ? (
                <div className="space-y-3">
                  {data.logins.loginsPerUser.map((user, index) => (
                    <div key={user.userId} className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${getRoundedClass('rounded-full')} flex items-center justify-center text-sm font-bold ${cardStyle.text}`} style={{ backgroundColor: cardStyle.accent + '20' }}>
                        {index + 1}
                      </div>
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || user.email || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-10 h-10 ${getRoundedClass('rounded-full')} flex items-center justify-center`} style={{ backgroundColor: cardStyle.accent + '20' }}>
                          <Users className="w-5 h-5" style={{ color: cardStyle.accent }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${cardStyle.text} truncate`}>
                          {user.full_name || user.email || 'Unknown User'}
                        </p>
                        <p className={`text-xs ${cardStyle.text}/50`}>
                          {user.count} {user.count === 1 ? 'login' : 'logins'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`h-[300px] flex items-center justify-center ${cardStyle.text}/50`}>
                  <p>No user login data available</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Rolling Sentiment Chart */}
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <h2 className={`text-lg font-black uppercase tracking-wider ${cardStyle.text} mb-4`}>Rolling Sentiment</h2>
            {sentimentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sentimentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={mode === 'code' ? '#FFFFFF' : mode === 'chill' ? '#4A1818' : '#333333'} opacity={0.2} />
                  <XAxis 
                    dataKey="week" 
                    stroke={cardStyle.text}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke={cardStyle.text}
                    style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#FFFFFF' : '#1a1a1a',
                      border: `1px solid ${cardStyle.accent}`,
                      borderRadius: '8px',
                      color: cardStyle.text
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke={cardStyle.accent} 
                    strokeWidth={2}
                    name="Team Mood"
                    dot={{ fill: cardStyle.accent, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="responses" 
                    stroke={mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#8B4444' : '#888888'} 
                    strokeWidth={2}
                    name="Responses"
                    dot={{ fill: mode === 'chaos' ? '#00C896' : mode === 'chill' ? '#8B4444' : '#888888', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-[300px] flex items-center justify-center ${cardStyle.text}/50`}>
                <p>No sentiment data available</p>
              </div>
            )}
          </Card>

          {/* Snaps Over Time Chart */}
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <h2 className={`text-lg font-black uppercase tracking-wider ${cardStyle.text} mb-4`}>Snaps Over Time</h2>
            {snapsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={snapsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={mode === 'code' ? '#FFFFFF' : mode === 'chill' ? '#4A1818' : '#333333'} opacity={0.2} />
                  <XAxis 
                    dataKey="date" 
                    stroke={cardStyle.text}
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke={cardStyle.text}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: mode === 'chaos' ? '#000000' : mode === 'chill' ? '#FFFFFF' : '#1a1a1a',
                      border: `1px solid ${cardStyle.accent}`,
                      borderRadius: '8px',
                      color: cardStyle.text
                    }}
                  />
                  <Bar dataKey="count" fill={cardStyle.accent} name="Snaps" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={`h-[300px] flex items-center justify-center ${cardStyle.text}/50`}>
                <p>No snaps data available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Content Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between mb-4">
              <Briefcase className="w-6 h-6" style={{ color: cardStyle.accent }} />
              <h3 className={`text-sm font-black uppercase ${cardStyle.text}`}>Work Samples</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${cardStyle.text}/70`}>Total</span>
                <span className={`text-lg font-bold ${cardStyle.text}`}>{data.content.workSamples.total}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${cardStyle.text}/70`}>In Period</span>
                <span className={`text-lg font-bold ${cardStyle.text}`}>{data.content.workSamples.inPeriod}</span>
              </div>
            </div>
          </Card>

          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-6 h-6" style={{ color: cardStyle.accent }} />
              <h3 className={`text-sm font-black uppercase ${cardStyle.text}`}>Must Reads</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${cardStyle.text}/70`}>Total</span>
                <span className={`text-lg font-bold ${cardStyle.text}`}>{data.content.mustReads.total}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${cardStyle.text}/70`}>In Period</span>
                <span className={`text-lg font-bold ${cardStyle.text}`}>{data.content.mustReads.inPeriod}</span>
              </div>
            </div>
          </Card>

          <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
            <div className="flex items-center justify-between mb-4">
              <FolderOpen className="w-6 h-6" style={{ color: cardStyle.accent }} />
              <h3 className={`text-sm font-black uppercase ${cardStyle.text}`}>Resources</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${cardStyle.text}/70`}>Total</span>
                <span className={`text-lg font-bold ${cardStyle.text}`}>{data.content.resources.total}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${cardStyle.text}/70`}>In Period</span>
                <span className={`text-lg font-bold ${cardStyle.text}`}>{data.content.resources.inPeriod}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

