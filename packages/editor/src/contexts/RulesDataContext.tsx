import { createContext, useContext } from 'react'
import type { RulesData } from '../components/DecisionTable'

export interface RulesDataEntry {
  data?: RulesData
  validationErrors?: string[]
}

export type RulesDataMap = Record<string, RulesDataEntry>

const RulesDataContext = createContext<RulesDataMap>({})

export const RulesDataProvider = RulesDataContext.Provider

export function useRulesData(filePath: string | undefined): {
  rulesData: RulesData | undefined
  validationErrors: string[] | undefined
} {
  const map = useContext(RulesDataContext)
  if (!filePath) return { rulesData: undefined, validationErrors: undefined }
  const entry = map[filePath]
  return {
    rulesData: entry?.data,
    validationErrors: entry?.validationErrors,
  }
}
