'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMode } from '@/contexts/mode-context'
import { useAuth } from '@/contexts/auth-context'
import { BarChart3, Database, Type, Save, X, GripVertical, Loader2, Plus, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface StatConfig {
  id?: string
  position: number
  stat_type: 'database' | 'custom'
  database_stat_key?: string | null
  custom_title?: string | null
  custom_value?: string | null
  calculatedValue?: string | null // Current calculated value for display
}

const DATABASE_STATS = [
  { key: 'active_pitches', label: 'Active Pitches', description: 'Pipeline projects with status "In Progress"' },
  { key: 'new_business', label: 'New Business', description: 'Pipeline projects created in last 7 days' },
  { key: 'pitches_due', label: 'Pitches Due', description: 'Pipeline projects with due date in next 7 days' },
  { key: 'total_team_members', label: 'Total Team Members', description: 'Total active team members' },
  { key: 'total_birthdays', label: 'Total Birthdays', description: 'Team members with birthdays in next 7 days' },
  { key: 'total_anniversaries', label: 'Total Anniversaries', description: 'Team members with anniversaries in next 7 days' },
  { key: 'total_snaps', label: 'Total Snaps', description: 'Recognition snaps created in last 7 days' },
  { key: 'won_projects', label: 'Won Projects', description: 'Pipeline projects won in last 7 days' },
  { key: 'total_work_samples', label: 'Total Work Samples', description: 'Work samples added in last 7 days' },
  { key: 'total_resources', label: 'Total Resources', description: 'Resources added in last 7 days' },
]

export default function ThisWeekPage() {
  const { mode } = useMode()
  const { user } = useAuth()
  const [selectedStats, setSelectedStats] = useState<StatConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedStat, setDraggedStat] = useState<string | null>(null)
  const [draggedPosition, setDraggedPosition] = useState<number | null>(null)
  const [calculatingValues, setCalculatingValues] = useState(false)
  const [availableStatsValues, setAvailableStatsValues] = useState<Map<string, string>>(new Map())

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

  // Get available database stats (not already selected)
  const getAvailableStats = () => {
    const selectedKeys = selectedStats
      .filter(s => s.stat_type === 'database' && s.database_stat_key)
      .map(s => s.database_stat_key)
    return DATABASE_STATS.filter(stat => !selectedKeys.includes(stat.key))
  }

  // Calculate a single stat value
  const calculateStatValue = async (statKey: string): Promise<string> => {
    try {
      // Create a temporary stat config to calculate
      const tempResponse = await fetch('/api/this-week-stats/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ database_stat_key: statKey }),
      })
      if (tempResponse.ok) {
        const data = await tempResponse.json()
        return data.value || '0'
      }
    } catch (error) {
      console.error(`Error calculating stat ${statKey}:`, error)
    }
    return '0'
  }

  // Fetch calculated values for all available stats
  const fetchAllStatValues = async () => {
    try {
      setCalculatingValues(true)
      const availableKeys = getAvailableStats().map(s => s.key)
      const valueMap = new Map<string, string>()
      
      // Calculate values for all available stats in parallel
      await Promise.all(
        availableKeys.map(async (key) => {
          const value = await calculateStatValue(key)
          valueMap.set(key, value)
        })
      )
      
      setAvailableStatsValues(valueMap)
      
      // Also fetch selected stats values
      const response = await fetch('/api/this-week-stats')
      if (response.ok) {
        const data = await response.json()
        if (data.stats && data.stats.length > 0) {
          const selectedValueMap = new Map<string, string>()
          data.stats.forEach((stat: any) => {
            if (stat.stat_type === 'database' && stat.database_stat_key) {
              selectedValueMap.set(stat.database_stat_key, stat.value)
            }
          })
          
          // Update selected stats with calculated values
          setSelectedStats(prev => prev.map(stat => {
            if (stat.stat_type === 'database' && stat.database_stat_key) {
              return {
                ...stat,
                calculatedValue: selectedValueMap.get(stat.database_stat_key) || '0'
              }
            } else if (stat.stat_type === 'custom') {
              return {
                ...stat,
                calculatedValue: stat.custom_value || '0'
              }
            }
            return stat
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching calculated values:', error)
    } finally {
      setCalculatingValues(false)
    }
  }

  // Fetch calculated values for database stats (legacy - for selected stats only)
  const fetchCalculatedValues = async () => {
    await fetchAllStatValues()
  }

  // Fetch current stats configuration
  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        const response = await fetch('/api/this-week-stats')
        if (response.ok) {
          const data = await response.json()
          if (data.stats && data.stats.length > 0) {
            // Convert API response to config format with calculated values
            const configs: StatConfig[] = data.stats.map((stat: any) => ({
              id: stat.id,
              position: stat.position,
              stat_type: stat.stat_type,
              database_stat_key: stat.database_stat_key || null,
              custom_title: stat.stat_type === 'custom' ? stat.title : null,
              custom_value: stat.stat_type === 'custom' ? stat.value : null,
              calculatedValue: stat.value || '0', // Store the calculated value
            }))
            // Sort by position
            const sorted = configs.sort((a, b) => a.position - b.position)
            setSelectedStats(sorted)
          } else {
            // Initialize with empty slots
            setSelectedStats([])
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
        toast.error('Failed to load stats configuration')
      } finally {
        setLoading(false)
        // Fetch all stat values after loading
        setTimeout(() => {
          fetchAllStatValues()
        }, 100)
      }
    }

    fetchStats()
  }, [])

  // Refresh calculated values when database stats are added/changed
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        fetchAllStatValues()
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [selectedStats.map(s => `${s.position}-${s.database_stat_key}`).join(','), loading]) // Refresh when database stat keys change

  const handleDragStart = (e: React.DragEvent, statKey: string) => {
    setDraggedStat(statKey)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragStartPosition = (e: React.DragEvent, position: number) => {
    setDraggedPosition(position)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedStat(null)
    setDraggedPosition(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault()
    
    if (draggedStat) {
      // Dropping a database stat from the bank
      const stat = DATABASE_STATS.find(s => s.key === draggedStat)
      if (stat) {
        const newStats = [...selectedStats]
        
        // Remove stat from old position if it exists (to avoid duplicates)
        const existingIndex = newStats.findIndex(s => s.database_stat_key === stat.key)
        if (existingIndex >= 0) {
          newStats.splice(existingIndex, 1)
        }
        
        // Remove stat at target position if it exists (replace it)
        const targetIndex = newStats.findIndex(s => s.position === targetPosition)
        if (targetIndex >= 0) {
          newStats.splice(targetIndex, 1)
        }
        
        // Add new stat at target position
        const newStat: StatConfig = {
          position: targetPosition,
          stat_type: 'database',
          database_stat_key: stat.key,
          calculatedValue: '0', // Will be updated by fetchCalculatedValues
        }
        newStats.push(newStat)
        
        // Reassign positions 1-3
        newStats.sort((a, b) => a.position - b.position)
        newStats.forEach((s, idx) => {
          s.position = idx + 1
        })
        
        // Keep only first 3
        const updatedStats = newStats.slice(0, 3)
        setSelectedStats(updatedStats)
        setDraggedStat(null)
        
        // Fetch calculated values for the new stat
        setTimeout(() => fetchCalculatedValues(), 100)
      }
    } else if (draggedPosition !== null) {
      // Reordering existing stats
      const newStats = [...selectedStats]
      const draggedStatConfig = newStats.find(s => s.position === draggedPosition)
      const targetStatConfig = newStats.find(s => s.position === targetPosition)
      
      if (draggedStatConfig && targetStatConfig) {
        draggedStatConfig.position = targetPosition
        targetStatConfig.position = draggedPosition
        newStats.sort((a, b) => a.position - b.position)
        setSelectedStats(newStats)
      }
      setDraggedPosition(null)
    }
  }

  const handleRemoveStat = (position: number) => {
    setSelectedStats(prev => {
      const newStats = prev.filter(s => s.position !== position)
      // Reassign positions
      newStats.forEach((s, idx) => {
        s.position = idx + 1
      })
      return newStats
    })
  }

  const handleAddCustomStat = () => {
    if (selectedStats.length >= 3) {
      toast.error('You can only have 3 stats. Remove one first.')
      return
    }
    
    const newPosition = selectedStats.length + 1
    setSelectedStats(prev => [...prev, {
      position: newPosition,
      stat_type: 'custom',
      custom_title: '',
      custom_value: '',
    }])
  }

  const updateStat = (position: number, updates: Partial<StatConfig>) => {
    setSelectedStats(prev => prev.map(stat => 
      stat.position === position 
        ? { ...stat, ...updates }
        : stat
    ))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Validate we have exactly 3 stats
      if (selectedStats.length !== 3) {
        toast.error('Please select exactly 3 stats')
        setSaving(false)
        return
      }
      
      // Validate all stats
      for (const stat of selectedStats) {
        if (stat.stat_type === 'database' && !stat.database_stat_key) {
          toast.error(`Position ${stat.position}: Please select a database stat`)
          setSaving(false)
          return
        }
        if (stat.stat_type === 'custom') {
          if (!stat.custom_title || !stat.custom_title.trim()) {
            toast.error(`Position ${stat.position}: Please enter a title`)
            setSaving(false)
            return
          }
          if (!stat.custom_value || !stat.custom_value.trim()) {
            toast.error(`Position ${stat.position}: Please enter a value`)
            setSaving(false)
            return
          }
        }
      }

      const response = await fetch('/api/this-week-stats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: selectedStats }),
      })

      if (response.ok) {
        toast.success('Stats configuration saved successfully!')
        // Refresh calculated values after saving
        await fetchCalculatedValues()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save stats')
      }
    } catch (error) {
      console.error('Error saving stats:', error)
      toast.error('Failed to save stats configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  const availableStats = getAvailableStats()

  return (
    <div className={`${getBgClass()} ${getTextClass()} ${mode === 'code' ? 'font-mono' : 'font-[family-name:var(--font-raleway)]'} min-h-screen p-6`}>
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-black uppercase tracking-wider ${getTextClass()} mb-1`}>This Week Stats</h1>
          <p className={`${getTextClass()}/70 text-sm font-normal`}>Drag statistics from the bank below into the container to configure the 3 stats displayed in the "This Week" card on the dashboard.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Available Stats - Wider, on the left */}
          <div className="lg:col-span-3">
            <Card className={`${cardStyle.bg} ${cardStyle.border} border p-6 ${getRoundedClass('rounded-xl')}`}>
              <div className="flex items-center gap-3 mb-4">
                <Database className={`w-5 h-5 ${getTextClass()}`} />
                <h2 className={`text-lg font-black uppercase ${getTextClass()}`}>Available Stats</h2>
              </div>
              
              <div className="space-y-2 mb-4">
                {availableStats.map((stat) => {
                  const calculatedValue = availableStatsValues.get(stat.key) || (calculatingValues ? '...' : '—')
                  return (
                    <div
                      key={stat.key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, stat.key)}
                      onDragEnd={handleDragEnd}
                      className={`${cardStyle.border} border p-3 ${getRoundedClass('rounded-xl')} cursor-move hover:opacity-80 transition-all hover:scale-[1.02]`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${getTextClass()} truncate`}>{stat.label}</div>
                          <div className={`text-xs ${getTextClass()}/50 truncate`}>{stat.description}</div>
                        </div>
                        <div className={`text-3xl font-black ${getTextClass()} shrink-0`}>
                          {calculatedValue}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {availableStats.length === 0 && (
                  <p className={`text-xs ${getTextClass()}/60 text-center py-3`}>All stats are selected</p>
                )}
              </div>

              <Button
                onClick={handleAddCustomStat}
                disabled={selectedStats.length >= 3}
                className={`w-full ${getRoundedClass('rounded-lg')} ${
                  mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                  mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                  'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                } font-black uppercase tracking-wider ${mode === 'code' ? 'font-mono' : ''}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Stat
              </Button>
            </Card>
          </div>

          {/* Selected Stats Container - Smaller, on the right */}
          <div className="lg:col-span-2">
            <Card className={`${cardStyle.bg} ${cardStyle.border} border p-4 ${getRoundedClass('rounded-xl')}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className={`w-4 h-4 ${getTextClass()}`} />
                  <h2 className={`text-sm font-black uppercase ${getTextClass()}`}>Selected Stats (3 slots)</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={fetchCalculatedValues}
                    disabled={calculatingValues || selectedStats.length === 0}
                    variant="outline"
                    size="sm"
                    className={`${getRoundedClass('rounded-lg')} ${cardStyle.border} ${cardStyle.text} font-black uppercase tracking-wider text-xs h-7 px-2 ${mode === 'code' ? 'font-mono' : ''}`}
                  >
                    {calculatingValues ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className={`${getRoundedClass('rounded-lg')} h-7 px-2 ${
                      mode === 'chaos' ? 'bg-[#C4F500] text-black hover:bg-[#C4F500]/80' :
                      mode === 'chill' ? 'bg-[#FFC043] text-[#4A1818] hover:bg-[#FFC043]/80' :
                      'bg-[#FFFFFF] text-black hover:bg-[#FFFFFF]/80'
                    } font-black uppercase tracking-wider text-xs ${mode === 'code' ? 'font-mono' : ''}`}
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 min-h-[200px]">
                {[1, 2, 3].map((slotPosition) => {
                  const stat = selectedStats.find(s => s.position === slotPosition)
                  return (
                    <div
                      key={slotPosition}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, slotPosition)}
                      className={`${cardStyle.border} border-2 border-dashed ${getRoundedClass('rounded-lg')} p-2 min-h-[70px] transition-all ${
                        stat ? cardStyle.bg : 'bg-transparent'
                      }`}
                    >
                      {stat ? (
                        <div className="flex items-start gap-2">
                          <div
                            draggable
                            onDragStart={(e) => handleDragStartPosition(e, stat.position)}
                            onDragEnd={handleDragEnd}
                            className="cursor-move flex items-center justify-center p-1 hover:opacity-70 transition-opacity"
                          >
                            <GripVertical className={`w-3 h-3 ${getTextClass()}`} />
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            {stat.stat_type === 'database' ? (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Database className={`w-3 h-3 ${getTextClass()}`} />
                                    <span className={`font-medium text-[10px] ${getTextClass()} truncate`}>
                                      {DATABASE_STATS.find(s => s.key === stat.database_stat_key)?.label || 'Unknown'}
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveStat(stat.position)}
                                    className="h-5 w-5 p-0"
                                  >
                                    <X className={`w-3 h-3 ${getTextClass()}`} />
                                  </Button>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                  <div className={`text-lg font-black ${getTextClass()}`}>
                                    {calculatingValues && !stat.calculatedValue ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : stat.calculatedValue !== undefined ? (
                                      stat.calculatedValue
                                    ) : (
                                      <span className={`text-xs ${getTextClass()}/50`}>—</span>
                                    )}
                                  </div>
                                  <p className={`text-[9px] ${getTextClass()}/50 line-clamp-1`}>
                                    {DATABASE_STATS.find(s => s.key === stat.database_stat_key)?.description}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Type className={`w-3 h-3 ${getTextClass()}`} />
                                    <span className={`font-medium text-[10px] ${getTextClass()}`}>Custom Stat</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveStat(stat.position)}
                                    className="h-5 w-5 p-0"
                                  >
                                    <X className={`w-3 h-3 ${getTextClass()}`} />
                                  </Button>
                                </div>
                                <div className="space-y-1">
                                  <div>
                                    <Label className={`text-[9px] ${getTextClass()}`}>Title</Label>
                                    <Input
                                      value={stat.custom_title || ''}
                                      onChange={(e) => updateStat(stat.position, { custom_title: e.target.value })}
                                      placeholder="e.g., team members"
                                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} text-[10px] h-6`}
                                    />
                                  </div>
                                  <div>
                                    <Label className={`text-[9px] ${getTextClass()}`}>Value</Label>
                                    <Input
                                      value={stat.custom_value || ''}
                                      onChange={(e) => updateStat(stat.position, { custom_value: e.target.value })}
                                      placeholder="e.g., 25"
                                      className={`${cardStyle.bg} ${cardStyle.border} border ${cardStyle.text} text-[10px] h-6`}
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={`flex items-center justify-center h-full ${getTextClass()}/40 text-[10px]`}>
                          Drop a stat here
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
