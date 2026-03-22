import type { Alarm, CompletionLog } from '../types'

interface Props {
  alarms: Alarm[]
  logs: CompletionLog[]
  onClear: () => void
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function CompletedSection({ alarms, logs, onClear }: Props) {
  return (
    <div className="completed-section">
      <div className="completed-header">
        <h3>完了済み ({alarms.length})</h3>
        <button className="btn-clear" onClick={onClear}>
          クリア
        </button>
      </div>
      <div className="completed-list">
        {alarms.map(alarm => (
          <div key={alarm.id} className="completed-item">
            <span className="completed-check">&#10003;</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="completed-label">{alarm.label}</span>
              {alarm.memo && <div className="completed-memo">{alarm.memo}</div>}
            </div>
            <span className="completed-time">
              {alarm.completedAt ? formatTime(alarm.completedAt) : ''}
            </span>
          </div>
        ))}
      </div>

      {logs.length > 0 && (
        <>
          <div className="completed-header" style={{ marginTop: 16 }}>
            <h3>対応ログ ({logs.length})</h3>
          </div>
          <div className="completed-list">
            {logs.slice().reverse().slice(0, 20).map(log => (
              <div key={log.id} className="completed-item">
                <span className="completed-check">&#10003;</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="completed-label">{log.alarmLabel}</span>
                  <span className="completed-cycle"> (#{log.cycleNumber})</span>
                  {log.memo && <div className="completed-memo">{log.memo}</div>}
                </div>
                <span className="completed-time">
                  {formatTime(log.completedAt)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
