import { useState, useEffect, useCallback, useRef } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { PatrolRowInput } from './PatrolRowInput'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import toast from 'react-hot-toast'

const DRAFT_KEY = 'qc-patrol-draft'
const DEBOUNCE_MS = 500 // save draft 500 ms after last keystroke

const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪']

const emptyRow = (order) => ({
  row_order: order,
  product_name: '',
  check1_ok: null,
  check2_ok: null,
  check3_ok: null,
  check4_ok: null,
  check5_needs_improvement: false,
  check5_note: '',
})

const defaultForm = () => ({
  patrol_date: new Date().toISOString().split('T')[0],
  time_start: '09:00',
  time_end: '10:00',
  weather: '晴れ',
  temperature_c: '',
  humidity_pct: '',
  confirmed_by: '',
  inspected_by: '',
  special_notes: '',
  rows: [1, 2, 3, 4, 5].map(emptyRow),
})

function parseDateStr(str) {
  if (!str) return new Date()
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ─── Draft helpers ───────────────────────────────────────────────────────────
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveDraft(form) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PatrolForm({ onSubmit, submitting = false, initialData = null }) {
  const isEditMode = !!initialData

  // On new-record forms, silently restore the draft if one exists
  const [form, setForm] = useState(() => {
    if (isEditMode) return initialData
    return loadDraft() ?? defaultForm()
  })

  const [errors, setErrors] = useState({})
  const [draftBannerVisible, setDraftBannerVisible] = useState(
    !isEditMode && !!loadDraft()
  )

  const debounceTimer = useRef(null)

  // ── Debounced draft save on every form change ────────────────────────────
  useEffect(() => {
    if (isEditMode) return // don't cache edit forms
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      saveDraft(form)
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceTimer.current)
  }, [form, isEditMode])

  // ── Flush draft immediately when tab is closed / hidden ─────────────────
  useEffect(() => {
    if (isEditMode) return
    const flush = () => saveDraft(form)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [form, isEditMode])

  // ── Form field helpers ───────────────────────────────────────────────────
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleRowChange = (index, updated) => {
    setForm((f) => {
      const rows = [...f.rows]
      rows[index] = updated
      return { ...f, rows }
    })
  }

  const addRow = () => {
    if (form.rows.length >= 19) {
      toast.error('最大19行まで追加できます')
      return
    }
    setForm((f) => ({
      ...f,
      rows: [...f.rows, emptyRow(f.rows.length + 1)],
    }))
  }

  const deleteRow = (index) => {
    setForm((f) => {
      const rows = f.rows
        .filter((_, i) => i !== index)
        .map((r, i) => ({ ...r, row_order: i + 1 }))
      return { ...f, rows }
    })
  }

  const discardDraft = () => {
    clearDraft()
    setForm(defaultForm())
    setDraftBannerVisible(false)
    toast('下書きを破棄しました', { icon: '🗑️', duration: 2000 })
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {}
    if (!form.patrol_date) e.patrol_date = '実施日を選択してください'
    if (!form.time_start) e.time_start = '開始時間を入力してください'
    if (!form.time_end) e.time_end = '終了時間を入力してください'
    if (
      form.temperature_c !== '' &&
      (isNaN(form.temperature_c) ||
        Number(form.temperature_c) < -50 ||
        Number(form.temperature_c) > 100)
    ) {
      e.temperature_c = '-50〜100℃の値を入力してください'
    }
    if (
      form.humidity_pct !== '' &&
      (isNaN(form.humidity_pct) ||
        Number(form.humidity_pct) < 0 ||
        Number(form.humidity_pct) > 100)
    ) {
      e.humidity_pct = '0〜100%の値を入力してください'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      patrol_date: form.patrol_date,
      time_start: form.time_start,
      time_end: form.time_end,
      weather: form.weather || null,
      temperature_c: form.temperature_c !== '' ? parseFloat(form.temperature_c) : null,
      humidity_pct: form.humidity_pct !== '' ? parseFloat(form.humidity_pct) : null,
      confirmed_by: form.confirmed_by || null,
      inspected_by: form.inspected_by || null,
      special_notes: form.special_notes || null,
      rows: form.rows.map((r) => ({
        row_order: r.row_order,
        product_name: r.product_name || null,
        check1_ok: r.check1_ok,
        check2_ok: r.check2_ok,
        check3_ok: r.check3_ok,
        check4_ok: r.check4_ok,
        check5_needs_improvement: r.check5_needs_improvement,
        check5_note: r.check5_note || null,
      })),
    }

    await onSubmit(payload)
    clearDraft()
    setDraftBannerVisible(false)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} id="patrol-form" noValidate>

      {/* ── Draft restored banner ── */}
      {draftBannerVisible && (
        <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-jp">
          <span>💾 前回の入力途中のデータを自動復元しました</span>
          <button
            type="button"
            onClick={discardDraft}
            className="text-xs underline text-amber-700 hover:text-amber-900 whitespace-nowrap"
            id="discard-draft-btn"
          >
            破棄する
          </button>
        </div>
      )}

      {/* ===== HEADER SECTION ===== */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4 font-jp">
          パトロール基本情報
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date */}
          <div>
            <label className="label font-jp">実施日 <span className="text-danger">*</span></label>
            <DatePicker
              selected={parseDateStr(form.patrol_date)}
              onChange={(d) => setField('patrol_date', d ? d.toISOString().split('T')[0] : '')}
              dateFormat="yyyy年MM月dd日"
              className={`input-field ${errors.patrol_date ? 'input-error' : ''}`}
              id="patrol-date-picker"
            />
            {errors.patrol_date && <p className="error-text">{errors.patrol_date}</p>}
          </div>

          {/* Time Start */}
          <Input
            id="time-start"
            label="開始時間 *"
            type="time"
            value={form.time_start}
            onChange={(e) => setField('time_start', e.target.value)}
            error={errors.time_start}
          />

          {/* Time End */}
          <Input
            id="time-end"
            label="終了時間 *"
            type="time"
            value={form.time_end}
            onChange={(e) => setField('time_end', e.target.value)}
            error={errors.time_end}
          />

          {/* Weather */}
          <div>
            <label htmlFor="weather-select" className="label font-jp">天気</label>
            <select
              id="weather-select"
              value={form.weather}
              onChange={(e) => setField('weather', e.target.value)}
              className="input-field"
            >
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <Input
            id="temperature"
            label="温度 (℃)"
            type="number"
            step="0.1"
            min="-50"
            max="100"
            value={form.temperature_c}
            onChange={(e) => setField('temperature_c', e.target.value)}
            placeholder="例: 24.5"
            error={errors.temperature_c}
          />

          {/* Humidity */}
          <Input
            id="humidity"
            label="湿度 (%)"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={form.humidity_pct}
            onChange={(e) => setField('humidity_pct', e.target.value)}
            placeholder="例: 60.0"
            error={errors.humidity_pct}
          />

          {/* Confirmed By */}
          <Input
            id="confirmed-by"
            label="確認印"
            value={form.confirmed_by}
            onChange={(e) => setField('confirmed_by', e.target.value)}
            placeholder="確認者名"
          />

          {/* Inspected By */}
          <Input
            id="inspected-by"
            label="検査印"
            value={form.inspected_by}
            onChange={(e) => setField('inspected_by', e.target.value)}
            placeholder="検査者名"
          />
        </div>
      </div>

      {/* ===== ROW TABLE ===== */}
      <div className="card mb-6 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide font-jp">
            チェック項目 ({form.rows.length} / 19行)
          </h2>
          <button
            type="button"
            onClick={addRow}
            disabled={form.rows.length >= 19 || submitting}
            className="btn-secondary text-sm gap-1 py-1.5 px-3"
            id="add-row-btn"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ＋行を追加
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 bg-gray-50 border-b border-border text-[10px] text-text-muted font-jp leading-relaxed">
          ①製品異常　②服装及び汚れ　③周辺の５Ｓ　④作業手順　⑤その他
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-2 py-2 text-left text-xs font-medium text-text-muted w-8">#</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-text-muted min-w-[140px]">品名</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-text-muted min-w-[80px]">①</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-text-muted min-w-[80px]">②</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-text-muted min-w-[80px]">③</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-text-muted min-w-[80px]">④</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-text-muted min-w-[120px]">⑤その他</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {form.rows.map((row, i) => (
                <PatrolRowInput
                  key={i}
                  row={row}
                  index={i}
                  onChange={handleRowChange}
                  onDelete={deleteRow}
                  disabled={submitting}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== SPECIAL NOTES ===== */}
      <div className="card p-6 mb-6">
        <label htmlFor="special-notes" className="label font-jp">特記など</label>
        <textarea
          id="special-notes"
          rows={3}
          value={form.special_notes}
          onChange={(e) => setField('special_notes', e.target.value)}
          placeholder="特記事項があれば入力してください"
          className="input-field resize-none"
          disabled={submitting}
        />
      </div>

      {/* ===== SUBMIT ===== */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={submitting}
          id="patrol-submit-btn"
        >
          {submitting ? '保存中...' : '保存する'}
        </Button>
      </div>
    </form>
  )
}
