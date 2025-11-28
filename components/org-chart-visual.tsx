'use client'

import { buildOrgChartTree, type OrgChartNode, getHierarchyLevelFromTitle } from '@/lib/org-chart'
import { Users, ChevronDown, ChevronRight } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

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
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgContainerRef = useRef<HTMLDivElement>(null)

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

  // Handle zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta))
    setZoom(newZoom)
  }, [zoom])

  // Handle pan with mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Reset zoom and pan
  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Calculate node positions for a tree layout
  // Positions nodes by hierarchy_level (not tree depth) so all people at the same level are on the same row
  const calculatePositions = (nodes: OrgChartNode[], startX: number = 0, startY: number = 0): NodePosition[] => {
    const positions: NodePosition[] = []
    const nodeMap = new Map<string, OrgChartNode>()
    
    // First, collect all nodes and build a map
    function collectNodes(nodeList: OrgChartNode[]) {
      nodeList.forEach(node => {
        nodeMap.set(node.id, node)
        if (node.children.length > 0) {
          collectNodes(node.children)
        }
      })
    }
    collectNodes(nodes)
    
    // Group nodes by hierarchy level (use role-based hierarchy, not database hierarchy_level)
    const nodesByLevel = new Map<number, OrgChartNode[]>()
    nodeMap.forEach(node => {
      // Use role-based hierarchy level for positioning, not database hierarchy_level
      const hierarchyLevel = getHierarchyLevelFromTitle(node.profile.role) || 0
      if (!nodesByLevel.has(hierarchyLevel)) {
        nodesByLevel.set(hierarchyLevel, [])
      }
      nodesByLevel.get(hierarchyLevel)!.push(node)
    })
    
    // Get sorted hierarchy levels (highest first, so most senior at top)
    const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => b - a)
    
    // Calculate Y positions based on hierarchy level
    const levelYPositions = new Map<number, number>()
    sortedLevels.forEach((level, index) => {
      levelYPositions.set(level, startY + index * VERTICAL_SPACING)
    })
    
    // Calculate X positions using tree-based layout
    // We'll use the tree structure for X positioning, but Y will be based on hierarchy level
    const nodeXPositions = new Map<string, number>()
    
    // Helper to calculate horizontal space needed for a subtree
    const getSubtreeWidth = (node: OrgChartNode): number => {
      const isExpanded = expandedNodes.has(node.id) || expandedNodes.size === 0
      if (!isExpanded || node.children.length === 0) {
        return NODE_WIDTH
      }
      
      // Sum up the width of all children's subtrees
      let totalWidth = 0
      node.children.forEach(child => {
        totalWidth += getSubtreeWidth(child) + HORIZONTAL_SPACING
      })
      return Math.max(NODE_WIDTH, totalWidth - HORIZONTAL_SPACING) // Remove last spacing
    }
    
    // Calculate X positions using tree-based layout
    function positionSubtree(node: OrgChartNode, x: number): number {
      const isExpanded = expandedNodes.has(node.id) || expandedNodes.size === 0
      const hasChildren = node.children.length > 0 && isExpanded
      
      if (!hasChildren) {
        // Leaf node - just position it
        nodeXPositions.set(node.id, x)
        return NODE_WIDTH
      }
      
      // Position children first to calculate subtree width
      let childX = x
      const childWidths: number[] = []
      
      node.children.forEach(child => {
        const childWidth = positionSubtree(child, childX)
        childWidths.push(childWidth)
        childX += childWidth + HORIZONTAL_SPACING
      })
      
      // Total width of children
      const childrenWidth = childWidths.reduce((sum, w) => sum + w, 0) + (childWidths.length - 1) * HORIZONTAL_SPACING
      
      // Center the parent node above its children
      const subtreeWidth = Math.max(NODE_WIDTH, childrenWidth)
      const nodeX = x + (subtreeWidth - NODE_WIDTH) / 2
      nodeXPositions.set(node.id, nodeX)
      
      return subtreeWidth
    }
    
    // Position all root nodes
    let currentX = startX
    nodes.forEach(node => {
      const subtreeWidth = positionSubtree(node, currentX)
      currentX += subtreeWidth + HORIZONTAL_SPACING
    })
    
    // Create positions array with Y based on role-based hierarchy level and X from tree structure
    nodeMap.forEach(node => {
      // Use role-based hierarchy level for positioning, not database hierarchy_level
      const hierarchyLevel = getHierarchyLevelFromTitle(node.profile.role) || 0
      const yPos = levelYPositions.get(hierarchyLevel) || startY
      const xPos = nodeXPositions.get(node.id) || startX
      
      positions.push({
        node,
        x: xPos,
        y: yPos,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      })
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
    const maxX = positions.length > 0 ? Math.max(...positions.map(p => p.x + p.width), 0) : 0
    const maxY = positions.length > 0 ? Math.max(...positions.map(p => p.y + p.height), 0) : 0
    const canvasWidth = Math.max(maxX + 100, 800)
    const canvasHeight = Math.max(maxY + 100, 600)

    // Build parent-child relationships for connectors
    const connectors: Array<{ parent: NodePosition; child: NodePosition }> = []
    if (positions.length > 0) {
      positions.forEach(parentPos => {
        const isExpanded = expandedNodes.has(parentPos.node.id) || expandedNodes.size === 0
        if (isExpanded && parentPos.node.children.length > 0) {
          parentPos.node.children.forEach(child => {
            const childPos = positions.find(p => p.node.id === child.id)
            if (childPos) {
              connectors.push({ parent: parentPos, child: childPos })
            }
          })
        }
      })
    }

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

        <div 
          ref={svgContainerRef}
          className={`${getRoundedClass('rounded-xl')} p-4 overflow-hidden relative`}
          style={{
            backgroundColor: mode === 'chaos' ? '#1a1a1a' : mode === 'chill' ? '#F5E6D3' : '#000000',
            width: '100%',
            height: '600px',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {positions.length > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg 
                width="100%"
                height="100%"
                viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ 
                  overflow: 'visible',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
              >
                <g
                  transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                  style={{ transformOrigin: 'center center' }}
                >
                  {/* Render connectors first (behind nodes) */}
                  <g>{connectors.map(({ parent, child }) => renderConnector(parent, child))}</g>
                  {/* Render nodes on top */}
                  {positions.map(position => renderNode(position))}
                </g>
              </svg>
            </div>
          ) : (
            <p 
              className="text-sm text-center py-8"
              style={{ 
                color: mode === 'chill' ? '#4A1818' : '#FFFFFF',
                opacity: 0.6 
              }}
            >
              No org chart data available. Set manager relationships in profiles to build the org chart.
            </p>
          )}
          {/* Zoom controls */}
          {positions.length > 0 && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              <button
                onClick={handleReset}
                className={`${getRoundedClass('rounded-lg')} px-3 py-2 text-xs font-semibold transition-colors`}
                style={{
                  backgroundColor: mode === 'chaos' ? greenColors.primary : mode === 'chill' ? greenColors.complementary : '#FFFFFF',
                  color: mode === 'chill' ? '#4A1818' : '#000000'
                }}
              >
                Reset View
              </button>
              <div 
                className={`${getRoundedClass('rounded-lg')} px-3 py-2 text-xs`}
                style={{
                  backgroundColor: mode === 'chaos' ? 'rgba(0,0,0,0.5)' : mode === 'chill' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.5)',
                  color: getTextColor()
                }}
              >
                Zoom: {Math.round(zoom * 100)}%
              </div>
            </div>
          )}
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

