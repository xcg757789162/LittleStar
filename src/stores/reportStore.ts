import { create } from 'zustand'
import type { ReportData } from '@/types/models'

/** 报告过滤条件 */
export interface ReportFilter {
  type: 'weekly' | 'monthly'
  subject?: string
  gradeLevel?: string
}

/** reportStore 状态接口 */
export interface ReportState {
  /** 报告列表 */
  reports: ReportData[]
  /** 当前查看的报告 */
  currentReport: ReportData | null
  /** 过滤条件 */
  filter: ReportFilter
  /** 是否加载中 */
  isLoading: boolean
}

/** reportStore 操作接口 */
export interface ReportActions {
  /** 添加报告 */
  addReport: (report: ReportData) => void
  /** 设置当前报告 */
  setCurrentReport: (report: ReportData | null) => void
  /** 设置过滤条件 */
  setFilter: (filter: Partial<ReportFilter>) => void
  /** 获取按过滤条件筛选的报告 */
  getFilteredReports: () => ReportData[]
  /** 设置加载状态 */
  setLoading: (loading: boolean) => void
  /** 重置 */
  reset: () => void
}

const defaultFilter: ReportFilter = { type: 'weekly' }

const initialState: ReportState = {
  reports: [],
  currentReport: null,
  filter: { ...defaultFilter },
  isLoading: false,
}

/**
 * 学习报告 Store
 */
export const useReportStore = create<ReportState & ReportActions>()((set, get) => ({
  ...initialState,

  addReport: (report) =>
    set((state) => ({ reports: [...state.reports, report] })),

  setCurrentReport: (report) => set({ currentReport: report }),

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  getFilteredReports: () => {
    const { reports, filter } = get()
    return reports.filter((r) => {
      if (r.type !== filter.type) return false
      if (filter.subject && r.subject !== filter.subject) return false
      if (filter.gradeLevel && r.gradeLevel !== filter.gradeLevel) return false
      return true
    })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  reset: () => set({ ...initialState, filter: { ...defaultFilter } }),
}))
