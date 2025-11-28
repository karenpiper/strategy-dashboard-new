'use client'

import { buildOrgChartTree, type OrgChartNode } from '@/lib/org-chart'
import { Users, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface OrgChartVisualProps {
  profiles: any[]
  mode: 'chaos' | 'chill' | 'code'
  onProfileClick: (profileId: string) => void
  getRoundedClass: (defaultClass: string) => string
  getTextColor: () => string
  greenColors: {
    primary: string
    complementary: string
  }
}

interface NodePosition {
  node: OrgChartNode
  x: number
  y: number
  width: number
  height: number
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 120
const HORIZONTAL_SPACING = 250
const VERTICAL_SPACING = 180

export function OrgChartVisual({ 
  profiles, 
  mode, 
  onProfileClick, 
  getRoundedClass,
  getTextColor,
  greenColors 
}: OrgChartVisualProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null)

  const orgTree = buildOrgChartTree(profiles, 'hierarchy')
  
  // Group profiles by discipline
  const byDiscipline: Record<string, any[]> = {}
  profiles.forEach(profile => {
    const discipline = profile.discipline || 'Other'
    if (!byDiscipline[discipline]) {
      byDiscipline[discipline] = []
    }
    byDiscipline[discipline].push(profile)
  })

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // Calculate node positions for a tree layout
  const calculatePositions = (nodes: OrgChartNode[], startX: number = 0, startY: number = 0): NodePosition[] => {
    const positions: NodePosition[] = []
    let currentX = startX
    let currentY = startY

    function traverse(node: OrgChartNode, x: number, y: number, parentWidth: number = 0) {
      const isExpanded = expandedNodes.has(node.id) || expandedNodes.size === 0
      const hasChildren = node.children.length > 0 && isExpanded

      // Calculate how many descendants this node has (for centering)
      const getDescendantCount = (n: OrgChartNode): number => {
        if (!expandedNodes.has(n.id) && expandedNodes.size > 0) return 1
        if (n.children.length === 0) return 1
        return n.children.reduce((sum, child) => sum + getDescendantCount(child), 1)
      }

      const descendantCount = hasChildren ? getDescendantCount(node) : 1
      const totalWidth = descendantCount * HORIZONTAL_SPACING
      const nodeX = x + (parentWidth - totalWidth) / 2 + totalWidth / 2 - NODE_WIDTH / 2

      positions.push({
        node,
        x: nodeX,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      })

      if (hasChildren) {
        let childX = nodeX - (totalWidth - NODE_WIDTH) / 2
        node.children.forEach((child, index) => {
          const childDescendantCount = getDescendantCount(child)
          const childTotalWidth = childDescendantCount * HORIZONTAL_SPACING
          traverse(child, childX + childTotalWidth / 2, y + VERTICAL_SPACING, childTotalWidth)
          childX += childTotalWidth
        })
      }
    }

    // Calculate total width needed
    const totalWidth = nodes.reduce((sum, node) => {
      const getDescendantCount = (n: OrgChartNode): number => {
        if (!expandedNodes.has(n.id) && expandedNodes.size > 0) return 1
        if (n.children.length === 0) return 1
        return n.children.reduce((sum, child) => sum + getDescendantCount(child), 1)
      }
      return sum + getDescendantCount(node) * HORIZONTAL_SPACING
    }, 0)

    const startXCentered = startX + (totalWidth - NODE_WIDTH) / 2

    nodes.forEach((node, index) => {
      const nodeDescendantCount = (() => {
        const getDescendantCount = (n: OrgChartNode): number => {
          if (!expandedNodes.has(n.id) && expandedNodes.size > 0) return 1
          if (n.children.length === 0) return 1
          return n.children.reduce((sum, child) => sum + getDescendantCount(child), 1)
        }
        return getDescendantCount(node)
      })()
      
      const nodeTotalWidth = nodeDescendantCount * HORIZONTAL_SPACING
      const nodeX = startX + index * HORIZONTAL_SPACING + (nodeTotalWidth - NODE_WIDTH) / 2
      traverse(node, nodeX, startY, nodeTotalWidth)
    })

    return positions
  }

  // Render connecting lines
  const renderConnector = (parent: NodePosition, child: NodePosition) => {
    const parentX = parent.x + parent.width / 2
    const parentY = parent.y + parent.height
    const childX = child.x + child.width / 2
    const childY = child.y

    return (
      <g key={`${parent.node.id}-${child.node.id}`}>
        {/* Vertical line from parent */}
        <line
          x1={parentX}
          y1={parentY}
          x2={parentX}
          y2={parentY + (childY - parentY) / 2}
          stroke={mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF'}
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Horizontal line */}
        <line
          x1={parentX}
          y1={parentY + (childY - parentY) / 2}
          x2={childX}
          y2={parentY + (childY - parentY) / 2}
          stroke={mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF'}
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Vertical line to child */}
        <line
          x1={childX}
          y1={parentY + (childY - parentY) / 2}
          x2={childX}
          y2={childY}
          stroke={mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF'}
          strokeWidth="2"
          opacity="0.6"
        />
      </g>
    )
  }

  // Render a node
  const renderNode = (position: NodePosition) => {
    const { node, x, y } = position
    const isExpanded = expandedNodes.has(node.id) || expandedNodes.size === 0
    const hasChildren = node.children.length > 0

    return (
      <g key={node.id}>
        {/* Node box */}
        <foreignObject x={x} y={y} width={NODE_WIDTH} height={NODE_HEIGHT}>
          <div
            className={`${getRoundedClass('rounded-xl')} border-2 p-3 cursor-pointer hover:scale-105 transition-transform shadow-lg`}
            style={{
              backgroundColor: mode === 'chaos' 
                ? '#1a1a1a' 
                : mode === 'chill' 
                ? '#FFFFFF' 
                : '#000000',
              borderColor: mode === 'chaos' 
                ? greenColors.primary 
                : mode === 'chill' 
                ? greenColors.complementary 
                : '#FFFFFF',
              width: `${NODE_WIDTH}px`,
              height: `${NODE_HEIGHT}px`
            }}
            onClick={() => onProfileClick(node.id)}
          >
            <div className="flex flex-col items-center h-full justify-between">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {node.profile.avatar_url ? (
                  <img
                    src={node.profile.avatar_url}
                    alt={node.profile.full_name || 'User'}
                    className="w-12 h-12 rounded-full object-cover mb-2 border-2"
                    style={{
                      borderColor: mode === 'chaos' 
                        ? greenColors.primary 
                        : mode === 'chill' 
                        ? greenColors.complementary 
                        : '#FFFFFF'
                    }}
                  />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2"
                    style={{ 
                      backgroundColor: (mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF') + '33',
                      borderColor: mode === 'chaos' 
                        ? greenColors.primary 
                        : mode === 'chill' 
                        ? greenColors.complementary 
                        : '#FFFFFF'
                    }}
                  >
                    <Users className="w-6 h-6" style={{ color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF' }} />
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 flex flex-col items-center justify-center text-center min-w-0 w-full">
                <p 
                  className={`font-black text-sm mb-1 truncate w-full ${mode === 'code' ? 'font-mono' : ''}`}
                  style={{ color: getTextColor() }}
                >
                  {node.profile.full_name || node.profile.email || 'Unknown'}
                </p>
                {node.profile.role && (
                  <p 
                    className="text-xs truncate w-full"
                    style={{ 
                      color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                      opacity: 0.8 
                    }}
                  >
                    {node.profile.role}
                  </p>
                )}
              </div>

              {/* Expand/Collapse button */}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleNode(node.id)
                  }}
                  className="mt-2 p-1 hover:opacity-70 transition-opacity"
                  style={{ color: getTextColor() }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        </foreignObject>
      </g>
    )
  }

  // If discipline selected, show detailed view
  if (selectedDiscipline) {
    const disciplineProfiles = byDiscipline[selectedDiscipline] || []
    const disciplineTree = buildOrgChartTree(disciplineProfiles, 'hierarchy')
    const positions = calculatePositions(disciplineTree)

    // Calculate canvas size
    const maxX = Math.max(...positions.map(p => p.x + p.width), 0)
    const maxY = Math.max(...positions.map(p => p.y + p.height), 0)
    const canvasWidth = Math.max(maxX + 100, 800)
    const canvasHeight = Math.max(maxY + 100, 600)

    // Build parent-child relationships for connectors
    const connectors: Array<{ parent: NodePosition; child: NodePosition }> = []
    positions.forEach(parentPos => {
      if (expandedNodes.has(parentPos.node.id) || expandedNodes.size === 0) {
        parentPos.node.children.forEach(child => {
          const childPos = positions.find(p => p.node.id === child.id)
          if (childPos) {
            connectors.push({ parent: parentPos, child: childPos })
          }
        })
      }
    })

    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedDiscipline(null)}
          className="flex items-center gap-2 mb-4 text-sm hover:opacity-70 transition-opacity"
          style={{ color: getTextColor() }}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>Back to All Disciplines</span>
        </button>

        <div className={`${getRoundedClass('rounded-xl')} p-4 overflow-auto`} style={{
          backgroundColor: mode === 'chaos' ? '#1a1a1a' : mode === 'chill' ? '#F5E6D3' : '#000000'
        }}>
          <svg width={canvasWidth} height={canvasHeight} className="block">
            {/* Render connectors first (behind nodes) */}
            <g>{connectors.map(({ parent, child }) => renderConnector(parent, child))}</g>
            {/* Render nodes on top */}
            {positions.map(position => renderNode(position))}
          </svg>
        </div>
      </div>
    )
  }

  // Macro view: Show discipline cards
  return (
    <div className="space-y-6">
      <p 
        className="text-sm mb-4"
        style={{ 
          color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
          opacity: 0.7 
        }}
      >
        Click on a discipline to view its visual org chart
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(byDiscipline).map(([discipline, disciplineProfiles]) => {
          const disciplineTree = buildOrgChartTree(disciplineProfiles, 'hierarchy')
          const topLevelCount = disciplineTree.length

          return (
            <button
              key={discipline}
              onClick={() => setSelectedDiscipline(discipline)}
              className={`p-4 ${getRoundedClass('rounded-xl')} border hover:opacity-80 transition-all text-left`}
              style={{
                backgroundColor: mode === 'chaos' 
                  ? '#00C89610' 
                  : mode === 'chill' 
                  ? '#C8D96120' 
                  : 'rgba(255,255,255,0.05)',
                borderColor: mode === 'chaos' 
                  ? greenColors.primary + '30' 
                  : mode === 'chill' 
                  ? greenColors.complementary + '30' 
                  : 'rgba(255,255,255,0.2)',
                borderWidth: '1px'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 
                  className={`font-black text-base ${mode === 'code' ? 'font-mono' : ''}`}
                  style={{ color: getTextColor() }}
                >
                  {discipline}
                </h3>
                <ChevronRight 
                  className="w-5 h-5 flex-shrink-0" 
                  style={{ 
                    color: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF',
                    opacity: 0.7 
                  }} 
                />
              </div>
              
              <div className="space-y-1">
                <p 
                  className="text-sm"
                  style={{ 
                    color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                    opacity: 0.8 
                  }}
                >
                  {disciplineProfiles.length} {disciplineProfiles.length === 1 ? 'person' : 'people'}
                </p>
                <p 
                  className="text-xs"
                  style={{ 
                    color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                    opacity: 0.6 
                  }}
                >
                  {topLevelCount} top-level {topLevelCount === 1 ? 'position' : 'positions'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

