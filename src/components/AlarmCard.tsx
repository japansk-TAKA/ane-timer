import { useState, useEffect } from 'react'
import type { Alarm } from '../types'

interface Props {
  alarm: Alarm
  onComplete: (id: string) => void
  onSnooze: (id: string, minutes: number) => void
  onDelete: (id: string) => void
}

function formatRemaining(ms: number): string {
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function AlarmCard({ alarm, onComplete, onSnooze, onDelete }: Props) {
  const [remaining, setRemaining] = useState(alarm.targetTime - Date.now())
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(alarm.targetTime - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [alarm.targetTime])

  const isTriggered = alarm.status === 'triggered'
  const progress = Math.max(0, Math.min(1, 1 - remaining / (alarm.intervalMinutes * 60 * 1000)))

  return (
    <div className={`alarm-card ${isTriggered ? 'alarm-triggered' : ''}`}>
      <div className="alarm-card-content">
        <div className="alarm-info">
          <div className="alarm-label-row">
            <span className="alarm-label">{alarm.label}</span>
            <span className={`alarm-type-badge ${alarm.type}`}>
              {alarm.type === 'recurring' ? '繰返' : '1回'}
            </span>
          </div>

          {isTriggered ? (
            <div className="alarm-triggered-text">対応してください</div>
          ) : (
            <>
              <div className="alarm-countdown">{formatRemaining(remaining)}</div>
              <div className="alarm-meta">
                {alarm.intervalMinutes}分{alarm.type === 'recurring' ? '間隔' : '後'} ・
                発動: {formatTime(alarm.targetTime)}
                {alarm.cycleCount > 0 && ` ・ ${alarm.cycleCount}回目`}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            </>
          )}
        </div>

        {!isTriggered && (
          <button
            className="btn-delete"
            onClick={() => onDelete(alarm.id)}
            aria-label="削除"
          >
            &#10005;
          </button>
        )}
      </div>

      {isTriggered && (
        <div className="alarm-actions">
          <button
            className="btn-action btn-complete"
            onClick={() => onComplete(alarm.id)}
          >
            &#10003; 完了
          </button>
          <button
            className="btn-action btn-snooze"
            onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
          >
            &#8634; スヌーズ
          </button>
        </div>
      )}

      {isTriggered && showSnoozeOptions && (
        <div className="snooze-options">
          {[5, 10, 15, 30].map(min => (
            <button
              key={min}
              className="btn-snooze-option"
              onClick={() => {
                onSnooze(alarm.id, min)
                setShowSnoozeOptions(false)
              }}
            >
              {min}分後
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
