import type { AlarmSetItem } from '../types'

interface Props {
  items: AlarmSetItem[]
  onAdd: () => void
  onClose: () => void
}

function formatInterval(min: number): string {
  if (min < 60) return `${min}分`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}時間${m}分` : `${h}時間`
}

export function SharePreviewModal({ items, onAdd, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>アラームセットを受け取りました</h2>
          <button className="btn-modal-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="modal-body">
          <p className="share-preview-desc">{items.length}件のアラームが含まれています</p>
          <ul className="share-preview-list">
            {items.map((item, i) => (
              <li key={i} className="share-preview-item">
                <span className="share-preview-label">{item.label}</span>
                <span className="share-preview-detail">
                  {formatInterval(item.intervalMinutes)} ・ {item.type === 'recurring' ? '繰り返し' : '1回'}
                </span>
              </li>
            ))}
          </ul>
          <div className="share-preview-actions">
            <button className="btn-confirm-cancel" onClick={onClose}>
              キャンセル
            </button>
            <button className="btn-submit" onClick={onAdd}>
              追加する
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
