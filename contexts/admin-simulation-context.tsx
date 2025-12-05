'use client'

import React, { createContext, useContext, useState } from 'react'
import { BaseRole } from '@/lib/permissions'

interface AdminSimulationContextType {
  simulatedRole: BaseRole | 'visitor' | null
  setSimulatedRole: (role: BaseRole | 'visitor' | null) => void
}

const AdminSimulationContext = createContext<AdminSimulationContextType | undefined>(undefined)

export function AdminSimulationProvider({ children }: { children: React.ReactNode }) {
  const [simulatedRole, setSimulatedRole] = useState<BaseRole | 'visitor' | null>(null)

  return (
    <AdminSimulationContext.Provider value={{ simulatedRole, setSimulatedRole }}>
      {children}
    </AdminSimulationContext.Provider>
  )
}

export function useAdminSimulation() {
  const context = useContext(AdminSimulationContext)
  if (context === undefined) {
    throw new Error('useAdminSimulation must be used within an AdminSimulationProvider')
  }
  return context
}


