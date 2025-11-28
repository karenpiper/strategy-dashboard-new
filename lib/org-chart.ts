/**
 * Org chart utilities for building hierarchical structures from manager relationships
 */

export interface OrgChartNode {
  id: string
  profile: any
  children: OrgChartNode[]
  level: number
  hierarchyLevel?: number // Calculated from job title
}

/**
 * Parse job title to determine hierarchy level
 * Returns a number where higher = more senior
 * 
 * Level mapping (custom hierarchy):
 * 10: Head of Department
 * 9: Group Director
 * 8: Senior Director
 * 7: Director
 * 6: Associate Director
 * 5: Senior
 * 4: Mid-Level
 * 3: Junior
 * 2-1: Entry level / Other
 * 0: Unknown
 */
export function getHierarchyLevelFromTitle(role: string | null | undefined): number {
  if (!role) return 0
  
  const roleLower = role.toLowerCase()
  
  // Check most specific titles first to avoid false matches
  
  // Head of Department (highest)
  if (roleLower.includes('head of department') || roleLower.includes('head of dept')) return 10
  if (roleLower.includes('department head') || roleLower.includes('dept head')) return 10
  
  // Group Director
  if (roleLower.includes('group director')) return 9
  
  // Senior Director (check before Director)
  if (roleLower.includes('senior director') || roleLower.includes('sr director')) return 8
  
  // Director (but not Associate Director or Senior Director)
  if (roleLower.includes('director') && 
      !roleLower.includes('associate') && 
      !roleLower.includes('senior') && 
      !roleLower.includes('group') &&
      !roleLower.includes('head')) return 7
  
  // Associate Director
  if (roleLower.includes('associate director')) return 6
  
  // Senior (individual contributor level, but not Senior Director/Manager)
  if (roleLower.includes('senior') && 
      !roleLower.includes('director') && 
      !roleLower.includes('manager') &&
      !roleLower.includes('vp') &&
      !roleLower.includes('vice president')) return 5
  
  // Mid-Level
  if (roleLower.includes('mid-level') || roleLower.includes('mid level') || roleLower.includes('midlevel')) return 4
  if (roleLower.includes('mid-') && roleLower.includes('level')) return 4
  
  // Junior
  if (roleLower.includes('junior')) return 3
  
  // Legacy support for other titles (for backwards compatibility)
  
  // C-level executives
  if (roleLower.includes('ceo') || roleLower.includes('chief executive')) return 10
  if (roleLower.includes('president')) return 9
  if (roleLower.includes('chief') || roleLower.includes('cfo') || roleLower.includes('cto') || roleLower.includes('coo')) return 9
  
  // VP level
  if (roleLower.includes('executive vice president') || roleLower.includes('evp')) return 8
  if (roleLower.includes('senior vice president') || roleLower.includes('svp')) return 8
  if (roleLower.includes('vice president') || roleLower.includes('vp ') || roleLower.match(/\bvp\b/)) return 7
  
  // Managers
  if (roleLower.includes('senior manager') || roleLower.includes('sr manager')) return 5
  if (roleLower.includes('manager') && !roleLower.includes('associate') && !roleLower.includes('assistant')) return 4
  if (roleLower.includes('assistant manager') || roleLower.includes('associate manager')) return 3
  
  // Lead / Principal
  if (roleLower.includes('lead') || roleLower.includes('principal')) return 5
  
  // Individual contributors
  if (roleLower.includes('engineer') || roleLower.includes('designer') || roleLower.includes('developer') || roleLower.includes('analyst') || roleLower.includes('specialist')) {
    // Check if senior
    if (roleLower.includes('senior')) return 5
    // Otherwise mid-level
    return 4
  }
  
  // Entry level
  if (roleLower.includes('associate') || roleLower.includes('coordinator') || roleLower.includes('assistant') || roleLower.includes('intern')) return 2
  
  // Default
  return 0
}

/**
 * Get hierarchy level from multiple sources (title, database field, manager relationships)
 */
export function getHierarchyLevel(profile: any, calculatedLevel?: number): number {
  // Priority: 1. Database field, 2. Calculated from manager tree, 3. Parsed from title
  if (profile.hierarchy_level !== null && profile.hierarchy_level !== undefined) {
    return profile.hierarchy_level
  }
  
  if (calculatedLevel !== undefined) {
    return calculatedLevel
  }
  
  return getHierarchyLevelFromTitle(profile.role)
}

/**
 * Build a tree structure from flat profile list with manager relationships
 * @param profiles - Array of profiles with manager_id field
 * @param sortBy - How to sort: 'name' (default), 'hierarchy' (by title level), or 'both' (hierarchy then name)
 * @returns Root nodes of the org chart tree
 */
export function buildOrgChartTree(profiles: any[], sortBy: 'name' | 'hierarchy' | 'both' = 'both'): OrgChartNode[] {
  // Create a map of all profiles by ID
  const profileMap = new Map<string, any>()
  profiles.forEach(profile => {
    profileMap.set(profile.id, profile)
  })

  // Create nodes for all profiles
  const nodeMap = new Map<string, OrgChartNode>()
  profiles.forEach(profile => {
    const hierarchyLevel = getHierarchyLevel(profile)
    nodeMap.set(profile.id, {
      id: profile.id,
      profile,
      children: [],
      level: 0,
      hierarchyLevel
    })
  })

  // Build the tree structure
  const rootNodes: OrgChartNode[] = []
  
  profiles.forEach(profile => {
    const node = nodeMap.get(profile.id)!
    
    if (profile.manager_id && nodeMap.has(profile.manager_id)) {
      // This person has a manager, add to manager's children
      const managerNode = nodeMap.get(profile.manager_id)!
      managerNode.children.push(node)
      node.level = managerNode.level + 1
    } else {
      // No manager or manager not found - this is a root node
      rootNodes.push(node)
    }
  })

  // Sort children based on preference
  function sortChildren(node: OrgChartNode) {
    if (sortBy === 'hierarchy' || sortBy === 'both') {
      // Sort by hierarchy level (higher first), then by name
      node.children.sort((a, b) => {
        const levelA = a.hierarchyLevel ?? getHierarchyLevel(a.profile)
        const levelB = b.hierarchyLevel ?? getHierarchyLevel(b.profile)
        
        if (sortBy === 'hierarchy') {
          // Just hierarchy, higher first
          return levelB - levelA
        } else {
          // Both: hierarchy first, then name
          if (levelA !== levelB) {
            return levelB - levelA
          }
        }
        
        // Same level or sortBy === 'name', sort by name
        const nameA = a.profile.full_name || a.profile.email || ''
        const nameB = b.profile.full_name || b.profile.email || ''
        return nameA.localeCompare(nameB)
      })
    } else {
      // Sort by name only
      node.children.sort((a, b) => {
        const nameA = a.profile.full_name || a.profile.email || ''
        const nameB = b.profile.full_name || b.profile.email || ''
        return nameA.localeCompare(nameB)
      })
    }
    
    node.children.forEach(sortChildren)
  }
  
  rootNodes.forEach(sortChildren)

  return rootNodes
}

/**
 * Flatten the org chart tree for easier rendering
 * @param nodes - Root nodes of the org chart
 * @returns Flat array of nodes in order (depth-first)
 */
export function flattenOrgChart(nodes: OrgChartNode[]): OrgChartNode[] {
  const result: OrgChartNode[] = []
  
  function traverse(node: OrgChartNode) {
    result.push(node)
    node.children.forEach(traverse)
  }
  
  nodes.forEach(traverse)
  return result
}

/**
 * Find a node by profile ID in the tree
 */
export function findNodeInTree(nodes: OrgChartNode[], profileId: string): OrgChartNode | null {
  for (const node of nodes) {
    if (node.id === profileId) {
      return node
    }
    const found = findNodeInTree(node.children, profileId)
    if (found) return found
  }
  return null
}

/**
 * Get all direct reports for a manager
 */
export function getDirectReports(nodes: OrgChartNode[], managerId: string): OrgChartNode[] {
  const managerNode = findNodeInTree(nodes, managerId)
  return managerNode ? managerNode.children : []
}

/**
 * Get the path from root to a specific profile (breadcrumb)
 */
export function getPathToProfile(nodes: OrgChartNode[], profileId: string): OrgChartNode[] {
  const path: OrgChartNode[] = []
  
  function findPath(currentNodes: OrgChartNode[], targetId: string, currentPath: OrgChartNode[]): boolean {
    for (const node of currentNodes) {
      const newPath = [...currentPath, node]
      if (node.id === targetId) {
        path.push(...newPath)
        return true
      }
      if (findPath(node.children, targetId, newPath)) {
        return true
      }
    }
    return false
  }
  
  findPath(nodes, profileId, [])
  return path
}

