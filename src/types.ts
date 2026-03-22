export type AlarmType = 'once' | 'recurring'

export type AlarmStatus = 'running' | 'triggered' | 'completed'

export interface Alarm {
  id: string
  label: string
  type: AlarmType
  intervalMinutes: number
  targetTime: number // timestamp when alarm triggers
  status: AlarmStatus
  createdAt: number
  completedAt?: number
  cycleCount: number // how many times this recurring alarm has fired
}

export interface PresetOption {
  label: string
  intervalMinutes: number
  type: AlarmType
}

export const INTERVAL_OPTIONS = [15, 30, 45, 60, 90, 120] as const

export const PRESET_ALARMS: PresetOption[] = [
  { label: '筋弛緩薬 再投与', intervalMinutes: 30, type: 'recurring' },
  { label: '輸液チェック', intervalMinutes: 60, type: 'recurring' },
  { label: '抗生剤 再投与', intervalMinutes: 60, type: 'once' },
  { label: 'バイタル記録', intervalMinutes: 15, type: 'recurring' },
  { label: '体位変換チェック', intervalMinutes: 120, type: 'recurring' },
]
