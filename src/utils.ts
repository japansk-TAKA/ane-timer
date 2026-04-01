export function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function encodeAlarmSet(items: { label: string; type: string; intervalMinutes: number }[]): string {
  return btoa(encodeURIComponent(JSON.stringify(items)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeAlarmSet(encoded: string): { label: string; type: string; intervalMinutes: number }[] | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const parsed = JSON.parse(decodeURIComponent(atob(padded)))
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // QuotaExceededError — ストレージ容量超過時は無視
  }
}
