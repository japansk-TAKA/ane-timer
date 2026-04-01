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
  memo?: string
  snoozeTargetTime?: number // スヌーズ中のターゲット時刻（プログレスバー計算用）
  priority?: 'high' | 'normal'
}

export interface CompletionLog {
  id: string
  alarmId: string
  alarmLabel: string
  completedAt: number
  cycleNumber: number
  memo?: string
}

export interface PresetOption {
  label: string
  intervalMinutes: number
  type: AlarmType
  description?: string
}

export interface AlarmSetItem {
  label: string
  type: AlarmType
  intervalMinutes: number
}

export const INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240] as const

// プリセット値の根拠:
// - 筋弛緩薬: TOFモニタリングの推奨に基づき個別判断。JSA麻酔ガイドライン参照
// - 輸液チェック: 術中輸液管理の標準的間隔
// - バイタル記録: JSA麻酔記録基準（少なくとも15分ごとの記録）
// - 体位変換チェック: 日本褥瘡学会ガイドライン（2時間ルール）
// - 抗菌薬再投与: 日本化学療法学会「外科感染症に対する抗菌薬の使用原則」
//   CEZ(セファゾリン): 半減期1.8h、3-4時間ごと追加（推奨: 3h超の手術で追加投与）
//   ABPC/SBT: 半減期約1h、2時間ごと追加
//   CMZ(セフメタゾール): 半減期1.2h、2時間ごと追加
export const PRESET_ALARMS: PresetOption[] = [
  { label: '筋弛緩薬 確認', intervalMinutes: 30, type: 'recurring', description: 'TOF比に基づき追加投与を判断 (JSA麻酔ガイドライン)' },
  { label: '輸液チェック', intervalMinutes: 60, type: 'recurring', description: '輸液速度・尿量・IN-OUTバランス確認' },
  { label: 'バイタル記録', intervalMinutes: 15, type: 'recurring', description: '麻酔記録への定期記載 (JSA基準: 少なくとも15分ごと)' },
  { label: '体位変換チェック', intervalMinutes: 120, type: 'recurring', description: '褥瘡予防・神経障害予防 (日本褥瘡学会ガイドライン: 2時間)' },
  { label: '血液ガス測定', intervalMinutes: 60, type: 'recurring', description: '動脈血ガス・電解質' },
  { label: 'ACT測定', intervalMinutes: 30, type: 'recurring', description: 'ヘパリン管理（心臓外科・カテ）' },
  { label: 'CEZ 再投与', intervalMinutes: 180, type: 'once', description: 'セファゾリン 3時間ごと (日本化学療法学会外科感染症ガイドライン)' },
  { label: 'ABPC/SBT 再投与', intervalMinutes: 120, type: 'once', description: 'アンピシリン/スルバクタム 2時間ごと (日本化学療法学会外科感染症ガイドライン)' },
  { label: 'CMZ 再投与', intervalMinutes: 120, type: 'once', description: 'セフメタゾール 2時間ごと (日本化学療法学会外科感染症ガイドライン)' },
]
