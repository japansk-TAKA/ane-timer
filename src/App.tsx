import { useState, useEffect, useCallback } from 'react'
import type { Alarm, AlarmStatus, CompletionLog } from './types'
import { AlarmCard } from './components/AlarmCard'
import { AddAlarmModal } from './components/AddAlarmModal'
import { CompletedSection } from './components/CompletedSection'
import { CurrentTime } from './components/CurrentTime'

const STORAGE_KEY = 'anetimer-alarms'
const SURGERY_START_KEY = 'anetimer-surgery-start'
const LOGS_KEY = 'anetimer-logs'

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
  // LocalStorage永続化: alarms
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms))
  }, [alarms])

  // 完了ログ管理
  const [completionLogs, setCompletionLogs] = useState<CompletionLog[]>(() => {
    const saved = localStorage.getItem(LOGS_KEY)
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem(LOGS_KEY, JSON.stringify(completionLogs))
  }, [completionLogs])

  // 手術経過時間タイマー
  const [surgeryStartTime, setSurgeryStartTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(SURGERY_START_KEY)
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (surgeryStartTime) {
      localStorage.setItem(SURGERY_START_KEY, JSON.stringify(surgeryStartTime))
    } else {
      localStorage.removeItem(SURGERY_START_KEY)
    }
  }, [surgeryStartTime])

  const toggleSurgeryTimer = useCallback(() => {
    setSurgeryStartTime(prev => prev ? null : Date.now())
  }, [])

  const [showAddModal, setShowAddModal] = useState(false)

  // トースト通知
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // 確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)

  // 音声通知（Web Audio API）
  const playAlarmSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
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
      // 3回ビープ
      playBeep(880, ctx.currentTime, 0.15)
      playBeep(880, ctx.currentTime + 0.2, 0.15)
      playBeep(1100, ctx.currentTime + 0.4, 0.3)
    } catch {}
  }, [])

  // アラームチェック（音声通知付き）
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
    setAlarms(prev =>
      prev.map(alarm => {
        if (alarm.id !== id) return alarm

        // 完了ログを追加
        const log: CompletionLog = {
          id: crypto.randomUUID(),
          alarmId: alarm.id,
          alarmLabel: alarm.label,
          completedAt: Date.now(),
          cycleNumber: alarm.cycleCount + 1,
          memo,
        }
        setCompletionLogs(logs => [...logs, log])

        if (alarm.type === 'recurring') {
          const nextTarget = Date.now() + alarm.intervalMinutes * 60 * 1000
          showToast(`次回: ${new Date(nextTarget).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })}`)
          return {
            ...alarm,
            status: 'running' as AlarmStatus,
            targetTime: nextTarget,
            cycleCount: alarm.cycleCount + 1,
            snoozeTargetTime: undefined,
            memo: undefined,
          }
        }
        return {
          ...alarm,
          status: 'completed' as AlarmStatus,
          completedAt: Date.now(),
          memo: memo || alarm.memo,
        }
      })
    )
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
      onConfirm: () => {
        setAlarms(prev => prev.filter(a => a.id !== id))
        setConfirmDialog(null)
      },
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setConfirmDialog({
      message: '完了済みをすべてクリアしますか？',
      onConfirm: () => {
        setAlarms(prev => prev.filter(a => a.status !== 'completed'))
        setConfirmDialog(null)
      },
    })
  }, [])

  // トリガー済みアラームを最上部に固定
  const activeAlarms = alarms
    .filter(a => a.status !== 'completed')
    .sort((a, b) => {
      // triggered を最上部に
      if (a.status === 'triggered' && b.status !== 'triggered') return -1
      if (a.status !== 'triggered' && b.status === 'triggered') return 1
      return a.targetTime - b.targetTime
    })

  const completedAlarms = alarms
    .filter(a => a.status === 'completed')
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))

  const triggeredCount = alarms.filter(a => a.status === 'triggered').length

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1 className="app-title">
            <span className="title-icon">&#9201;</span>
            AneTimer
          </h1>
          <CurrentTime />
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
        <div className="surgery-timer">
          {surgeryStartTime ? (
            <>
              <span className="surgery-timer-label">経過:</span>
              <SurgeryElapsed startTime={surgeryStartTime} />
              <button className="btn-surgery-timer" onClick={toggleSurgeryTimer}>
                リセット
              </button>
            </>
          ) : (
            <button className="btn-surgery-timer" onClick={toggleSurgeryTimer}>
              手術開始
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
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

      <button
        className="fab-add"
        onClick={() => setShowAddModal(true)}
        aria-label="アラーム追加"
      >
        &#43;
      </button>

      {showAddModal && (
        <AddAlarmModal
          onAdd={addAlarm}
          onClose={() => setShowAddModal(false)}
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
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
