import { useState, useEffect, useCallback } from 'react'
import type { Alarm, AlarmStatus } from './types'
import { AlarmCard } from './components/AlarmCard'
import { AddAlarmModal } from './components/AddAlarmModal'
import { CompletedSection } from './components/CompletedSection'
import { CurrentTime } from './components/CurrentTime'

function App() {
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  // Check alarms every second
  useEffect(() => {
    const interval = setInterval(() => {
      setAlarms(prev =>
        prev.map(alarm => {
          if (alarm.status === 'running' && Date.now() >= alarm.targetTime) {
            return { ...alarm, status: 'triggered' as AlarmStatus }
          }
          return alarm
        })
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const addAlarm = useCallback((alarm: Alarm) => {
    setAlarms(prev => [...prev, alarm])
    setShowAddModal(false)
  }, [])

  const completeAlarm = useCallback((id: string) => {
    setAlarms(prev =>
      prev.map(alarm => {
        if (alarm.id !== id) return alarm
        if (alarm.type === 'recurring') {
          // Restart the cycle
          return {
            ...alarm,
            status: 'running' as AlarmStatus,
            targetTime: Date.now() + alarm.intervalMinutes * 60 * 1000,
            cycleCount: alarm.cycleCount + 1,
          }
        }
        // Once alarm -> mark completed
        return {
          ...alarm,
          status: 'completed' as AlarmStatus,
          completedAt: Date.now(),
        }
      })
    )
  }, [])

  const snoozeAlarm = useCallback((id: string, minutes: number) => {
    setAlarms(prev =>
      prev.map(alarm => {
        if (alarm.id !== id) return alarm
        return {
          ...alarm,
          status: 'running' as AlarmStatus,
          targetTime: Date.now() + minutes * 60 * 1000,
        }
      })
    )
  }, [])

  const deleteAlarm = useCallback((id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setAlarms(prev => prev.filter(a => a.status !== 'completed'))
  }, [])

  const activeAlarms = alarms
    .filter(a => a.status !== 'completed')
    .sort((a, b) => a.targetTime - b.targetTime)

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
    </div>
  )
}

export default App
