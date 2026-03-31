import { describe, it, expect } from 'vitest'
import { formatRemaining } from '../utils'

describe('formatRemaining', () => {
  it('ゼロと負の値は 00:00 を返す', () => {
    expect(formatRemaining(0)).toBe('00:00')
    expect(formatRemaining(-1000)).toBe('00:00')
  })

  it('1分30秒 = 01:30', () => {
    expect(formatRemaining(90 * 1000)).toBe('01:30')
  })

  it('59分59秒 = 59:59', () => {
    expect(formatRemaining(3599 * 1000)).toBe('59:59')
  })

  it('1時間 = 1:00:00', () => {
    expect(formatRemaining(3600 * 1000)).toBe('1:00:00')
  })

  it('2時間30分15秒 = 2:30:15', () => {
    expect(formatRemaining((2 * 3600 + 30 * 60 + 15) * 1000)).toBe('2:30:15')
  })
})

// URL encode/decode round-trip テスト (Phase B 向けの準備)
// 日本語対応: encodeURIComponent で UTF-8 安全にしてから btoa
function encodeSet(items: object[]): string {
  return btoa(encodeURIComponent(JSON.stringify(items)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function decodeSet(encoded: string): object[] {
  return JSON.parse(decodeURIComponent(atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))))
}

describe('AlarmSet URL encode/decode', () => {
  it('round-trip でデータが保持される', () => {
    const items = [
      { label: '輸液チェック', type: 'recurring', intervalMinutes: 60 },
      { label: '筋弛緩薬 確認', type: 'recurring', intervalMinutes: 30 },
    ]
    const encoded = encodeSet(items)
    const decoded = decodeSet(encoded)
    expect(decoded).toEqual(items)
  })

  it('エンコード後の文字列はURL安全（+/=を含まない）', () => {
    const items = [{ label: 'テスト', type: 'once', intervalMinutes: 15 }]
    const encoded = encodeSet(items)
    expect(encoded).not.toMatch(/[+/=]/)
  })
})
