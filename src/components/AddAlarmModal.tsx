import { useState } from 'react'
import type { Alarm, AlarmType } from '../types'
import { INTERVAL_OPTIONS, PRESET_ALARMS } from '../types'

interface Props {
  onAdd: (alarm: Alarm) => void
  onClose: () => void
}

export function AddAlarmModal({ onAdd, onClose }: Props) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<AlarmType>('recurring')
  const [intervalMinutes, setIntervalMinutes] = useState(30)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isCustom, setIsCustom] = useState(false)

  const handleSubmit = () => {
    const finalLabel = label.trim() || 'アラーム'
    const finalInterval = isCustom ? parseInt(customMinutes) || 30 : intervalMinutes

    const alarm: Alarm = {
      id: crypto.randomUUID(),
      label: finalLabel,
      type,
      intervalMinutes: finalInterval,
      targetTime: Date.now() + finalInterval * 60 * 1000,
      status: 'running',
      createdAt: Date.now(),
      cycleCount: 0,
    }
    onAdd(alarm)
  }

  const handlePreset = (preset: typeof PRESET_ALARMS[number]) => {
    const alarm: Alarm = {
      id: crypto.randomUUID(),
      label: preset.label,
      type: preset.type,
      intervalMinutes: preset.intervalMinutes,
      targetTime: Date.now() + preset.intervalMinutes * 60 * 1000,
      status: 'running',
      createdAt: Date.now(),
      cycleCount: 0,
    }
    onAdd(alarm)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>アラーム追加</h2>
          <button className="btn-modal-close" onClick={onClose}>&#10005;</button>
        </div>

        <div className="modal-body">
          {/* Presets */}
          <div className="form-section">
            <label className="form-label">プリセット</label>
            <div className="preset-grid">
              {PRESET_ALARMS.map((preset, i) => (
                <button
                  key={i}
                  className="btn-preset"
                  onClick={() => handlePreset(preset)}
                >
                  <span className="preset-label">{preset.label}</span>
                  <span className="preset-detail">
                    {preset.intervalMinutes}分 ・ {preset.type === 'recurring' ? '繰返' : '1回'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="divider">
            <span>カスタム設定</span>
          </div>

          {/* Custom form */}
          <div className="form-section">
            <label className="form-label" htmlFor="alarm-label">ラベル</label>
            <input
              id="alarm-label"
              className="form-input"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="例: 筋弛緩薬 再投与"
              autoComplete="off"
            />
          </div>

          <div className="form-section">
            <label className="form-label">タイプ</label>
            <div className="type-toggle">
              <button
                className={`btn-type ${type === 'recurring' ? 'active' : ''}`}
                onClick={() => setType('recurring')}
              >
                繰り返し
              </button>
              <button
                className={`btn-type ${type === 'once' ? 'active' : ''}`}
                onClick={() => setType('once')}
              >
                1回のみ
              </button>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">間隔</label>
            <div className="interval-grid">
              {INTERVAL_OPTIONS.map(min => (
                <button
                  key={min}
                  className={`btn-interval ${!isCustom && intervalMinutes === min ? 'active' : ''}`}
                  onClick={() => {
                    setIntervalMinutes(min)
                    setIsCustom(false)
                  }}
                >
                  {min}分
                </button>
              ))}
              <button
                className={`btn-interval ${isCustom ? 'active' : ''}`}
                onClick={() => setIsCustom(true)}
              >
                カスタム
              </button>
            </div>
            {isCustom && (
              <div className="custom-input-row">
                <input
                  className="form-input custom-minutes"
                  type="number"
                  min="1"
                  max="999"
                  value={customMinutes}
                  onChange={e => setCustomMinutes(e.target.value)}
                  placeholder="分数を入力"
                  autoFocus
                />
                <span className="custom-unit">分</span>
              </div>
            )}
          </div>

          <button className="btn-submit" onClick={handleSubmit}>
            アラーム開始
          </button>
        </div>
      </div>
    </div>
  )
}
