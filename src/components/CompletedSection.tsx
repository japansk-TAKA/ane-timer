import type { Alarm } from '../types'

interface Props {
  alarms: Alarm[]
  onClear: () => void
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function CompletedSection({ alarms, onClear }: Props) {
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
            <span className="completed-label">{alarm.label}</span>
            <span className="completed-time">
              {alarm.completedAt ? formatTime(alarm.completedAt) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
