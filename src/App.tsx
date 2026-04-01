import { useState, useEffect, useCallback, useRef } from 'react'
import type { Alarm, AlarmStatus, AlarmSetItem, CompletionLog } from './types'
import { safeSetItem, encodeAlarmSet, decodeAlarmSet } from './utils'
import { AlarmCard } from './components/AlarmCard'
import { AddAlarmModal } from './components/AddAlarmModal'
import { CompletedSection } from './components/CompletedSection'
import { CurrentTime } from './components/CurrentTime'
import { SharePreviewModal } from './components/SharePreviewModal'

const STORAGE_KEY = 'anetimer-alarms'
const SURGERY_START_KEY = 'anetimer-surgery-start'
const LOGS_KEY = 'anetimer-logs'
const THEME_KEY = 'anetimer-theme'

function SurgeryElapsed({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime)
  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const hours = Math.floor(elapsed / 3600000)
  const minutes = Math.floor((elapsed % 3600000) / 60000)
  const seconds = Math.floor((elapsed % 60000) / 1000)
  const timeStr = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return <span className="surgery-timer-time">{timeStr}</span>
}

function App() {
  // ダークモード
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    safeSetItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  // LocalStorage永続化: alarms
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    try { return saved ? JSON.parse(saved) : [] } catch { return [] }
  })

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(alarms))
  }, [alarms])

  // 完了ログ管理
  const [completionLogs, setCompletionLogs] = useState<CompletionLog[]>(() => {
    const saved = localStorage.getItem(LOGS_KEY)
    try { return saved ? JSON.parse(saved) : [] } catch { return [] }
  })

  useEffect(() => {
    safeSetItem(LOGS_KEY, JSON.stringify(completionLogs))
  }, [completionLogs])

  // 手術経過時間タイマー
  const [surgeryStartTime, setSurgeryStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(SURGERY_START_KEY)
    try { return saved ? JSON.parse(saved) : null } catch { return null }
  })

  useEffect(() => {
    if (surgeryStartTime) {
      safeSetItem(SURGERY_START_KEY, JSON.stringify(surgeryStartTime))
    } else {
      localStorage.removeItem(SURGERY_START_KEY)
    }
  }, [surgeryStartTime])

  const resetSurgery = useCallback(() => {
    setSurgeryStartTime(null)
  }, [])

  const [showAddModal, setShowAddModal] = useState(false)

  // Phase B: URLプリセット共有
  const [sharePreview, setSharePreview] = useState<AlarmSetItem[] | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const set = params.get('set')
    if (!set) return null
    return decodeAlarmSet(set) as AlarmSetItem[] | null
  })

  // トースト通知
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

  // Web Audio API（iOS対応: AudioContextを保持・再利用）
  const audioCtxRef = useRef<AudioContext | null>(null)

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [])

  const startSurgery = useCallback(() => {
    initAudio()
    setSurgeryStartTime(Date.now())
  }, [initAudio])

  // 全画面フラッシュ
  const [isFlashing, setIsFlashing] = useState(false)
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
    }
  }, [])

  const dismissFlash = useCallback(() => {
    setIsFlashing(false)
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
  }, [])

  const playAlarmSound = useCallback(() => {
    try {
      initAudio()
      const ctx = audioCtxRef.current!
      const playBeep = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.3, startTime)
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }
      playBeep(880, ctx.currentTime, 0.15)
      playBeep(880, ctx.currentTime + 0.2, 0.15)
      playBeep(1100, ctx.currentTime + 0.4, 0.3)
    } catch {}
  }, [initAudio])

  // アラームチェック
  useEffect(() => {
    const interval = setInterval(() => {
      setAlarms(prev => {
        let shouldPlaySound = false
        const updated = prev.map(alarm => {
          if (alarm.status === 'running' && Date.now() >= alarm.targetTime) {
            shouldPlaySound = true
            return { ...alarm, status: 'triggered' as AlarmStatus }
          }
          return alarm
        })
        if (shouldPlaySound) {
          playAlarmSound()
          setIsFlashing(true)
          if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current)
          flashTimeoutRef.current = setTimeout(() => setIsFlashing(false), 3000)
        }
        return updated
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [playAlarmSound])

  const addAlarm = useCallback((alarm: Alarm) => {
    setAlarms(prev => [...prev, alarm])
    setShowAddModal(false)
  }, [])

  const completeAlarm = useCallback((id: string, memo?: string) => {
    setAlarms(prev => {
      const alarm = prev.find(a => a.id === id)
      if (!alarm) return prev

      const log: CompletionLog = {
        id: crypto.randomUUID(),
        alarmId: alarm.id,
        alarmLabel: alarm.label,
        completedAt: Date.now(),
        cycleNumber: alarm.cycleCount + 1,
        memo,
      }
      setCompletionLogs(logs => [...logs, log])

      return prev.map(a => {
        if (a.id !== id) return a
        if (a.type === 'recurring') {
          const nextTarget = Date.now() + a.intervalMinutes * 60 * 1000
          showToast(`次回: ${new Date(nextTarget).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`)
          return {
            ...a,
            status: 'running' as AlarmStatus,
            targetTime: nextTarget,
            cycleCount: a.cycleCount + 1,
            snoozeTargetTime: undefined,
            memo: undefined,
          }
        }
        return {
          ...a,
          status: 'completed' as AlarmStatus,
          completedAt: Date.now(),
          memo: memo || a.memo,
        }
      })
    })
  }, [showToast])

  const snoozeAlarm = useCallback((id: string, minutes: number) => {
    const snoozeTarget = Date.now() + minutes * 60 * 1000
    setAlarms(prev =>
      prev.map(alarm => {
        if (alarm.id !== id) return alarm
        return {
          ...alarm,
          status: 'running' as AlarmStatus,
          targetTime: snoozeTarget,
          snoozeTargetTime: Date.now(),
        }
      })
    )
    showToast(`${minutes}分後にスヌーズ`)
  }, [showToast])

  const deleteAlarm = useCallback((id: string) => {
    setConfirmDialog({
      message: 'このアラームを削除しますか？',
      confirmLabel: '削除',
      onConfirm: () => {
        setAlarms(prev => prev.filter(a => a.id !== id))
        setConfirmDialog(null)
      },
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setConfirmDialog({
      message: '完了済みをすべてクリアしますか？',
      confirmLabel: 'クリア',
      onConfirm: () => {
        setAlarms(prev => prev.filter(a => a.status !== 'completed'))
        setConfirmDialog(null)
      },
    })
  }, [])

  const activeAlarms = alarms
    .filter(a => a.status !== 'completed')
    .sort((a, b) => {
      if (a.status === 'triggered' && b.status !== 'triggered') return -1
      if (a.status !== 'triggered' && b.status === 'triggered') return 1
      return a.targetTime - b.targetTime
    })

  const completedAlarms = alarms
    .filter(a => a.status === 'completed')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  const triggeredCount = alarms.filter(a => a.status === 'triggered').length

  const shareAlarmSet = useCallback(() => {
    const items = activeAlarms.map(a => ({
      label: a.label,
      type: a.type,
      intervalMinutes: a.intervalMinutes,
    }))
    const encoded = encodeAlarmSet(items)
    const url = `${window.location.origin}${window.location.pathname}?set=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      showToast('URLをコピーしました')
    }).catch(() => {
      showToast('コピー失敗 — URLバーからコピーしてください')
    })
  }, [activeAlarms, showToast])

  const addFromShare = useCallback(() => {
    if (!sharePreview) return
    const now = Date.now()
    const newAlarms: Alarm[] = sharePreview.map(item => ({
      id: crypto.randomUUID(),
      label: item.label,
      type: item.type,
      intervalMinutes: item.intervalMinutes,
      targetTime: now + item.intervalMinutes * 60 * 1000,
      status: 'running' as AlarmStatus,
      createdAt: now,
      cycleCount: 0,
    }))
    setAlarms(prev => [...prev, ...newAlarms])
    setSharePreview(null)
    window.history.replaceState({}, '', window.location.pathname)
    showToast(`${newAlarms.length}件のアラームを追加しました`)
  }, [sharePreview, showToast])

  return (
    <div className="app">
      {/* 全画面フラッシュ */}
      {isFlashing && (
        <div className="flash-overlay" onClick={dismissFlash} />
      )}

      <header className="app-header">
        <div className="header-top">
          <h1 className="app-title">
            <span className="title-icon">&#9201;</span>
            AneTimer
          </h1>
          <div className="header-right">
            {activeAlarms.length > 0 && (
              <button
                className="btn-share"
                onClick={shareAlarmSet}
                aria-label="設定を共有"
                title="アラームセットを共有"
              >
                &#8679;
              </button>
            )}
            <button
              className="btn-theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <CurrentTime />
          </div>
        </div>
        {activeAlarms.length > 0 && (
          <div className="alarm-summary">
            <span>稼働中: {activeAlarms.length}件</span>
            {triggeredCount > 0 && (
              <span className="triggered-badge">
                {triggeredCount}件 対応待ち
              </span>
            )}
          </div>
        )}
        {surgeryStartTime && (
          <div className="surgery-timer">
            <span className="surgery-timer-label">経過:</span>
            <SurgeryElapsed startTime={surgeryStartTime} />
            <button className="btn-surgery-timer" onClick={resetSurgery}>
              リセット
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!surgeryStartTime && (
          <button className="btn-surgery-start" onClick={startSurgery}>
            手術開始
          </button>
        )}

        {activeAlarms.length === 0 && completedAlarms.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">&#128276;</div>
            <p>アラームがありません</p>
            <p className="empty-hint">下のボタンからアラームを追加してください</p>
          </div>
        )}

        <div className="alarm-list">
          {activeAlarms.map(alarm => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              onComplete={completeAlarm}
              onSnooze={snoozeAlarm}
              onDelete={deleteAlarm}
            />
          ))}
        </div>

        {completedAlarms.length > 0 && (
          <CompletedSection
            alarms={completedAlarms}
            logs={completionLogs}
            onClear={clearCompleted}
          />
        )}
      </main>

      <footer className="app-footer">
        <p className="disclaimer-text">
          このアプリはあくまで補助ツールです。最終判断は担当医師が行ってください。
        </p>
        <a
          className="feedback-link"
          href="https://forms.gle/2de4mpsCqeEJzLXG9"
          target="_blank"
          rel="noopener noreferrer"
        >
          情報に誤りがある場合はこちら
        </a>
      </footer>

      <button
        className="fab-add"
        onClick={() => { initAudio(); setShowAddModal(true) }}
        aria-label="アラーム追加"
      >
        &#43;
      </button>

      {showAddModal && (
        <AddAlarmModal
          onAdd={addAlarm}
          onClose={() => setShowAddModal(false)}
          onError={showToast}
        />
      )}

      {sharePreview && (
        <SharePreviewModal
          items={sharePreview}
          onAdd={addFromShare}
          onClose={() => {
            setSharePreview(null)
            window.history.replaceState({}, '', window.location.pathname)
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}

      {confirmDialog && (
        <div className="confirm-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <p>{confirmDialog.message}</p>
            <div className="confirm-actions">
              <button className="btn-confirm-cancel" onClick={() => setConfirmDialog(null)}>
                キャンセル
              </button>
              <button className="btn-confirm-ok" onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
