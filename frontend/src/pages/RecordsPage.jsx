import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { usePatrolRecords } from '../hooks/usePatrolRecords'
import { useQueryClient } from '@tanstack/react-query'
import { patrolApi } from '../api/patrolApi'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

function RecordCard({ record, onExportPdf }) {
  const improvCount = record.rows?.filter(
    (r) =>
      r.check1_ok === false ||
      r.check2_ok === false ||
      r.check3_ok === false ||
      r.check4_ok === false ||
      r.check5_needs_improvement
  ).length || 0

  return (
    <div className="card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <Link to={`/records/${record.id}`} className="group">
          <p className="font-semibold text-text-primary font-jp group-hover:text-primary transition-colors">
            {record.patrol_date}
          </p>
          <p className="text-sm text-text-muted font-jp">
            {record.time_start?.slice(0, 5)} ～ {record.time_end?.slice(0, 5)}
          </p>
        </Link>
        <div className="flex flex-col gap-1 items-end">
          {improvCount > 0 ? (
            <Badge variant="warning">{improvCount} 改善</Badge>
          ) : (
            <Badge variant="success">問題無し</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-text-muted font-jp mb-3">
        {record.weather && <span>☁ {record.weather}</span>}
        {record.temperature_c != null && <span>🌡 {record.temperature_c}℃</span>}
        {record.humidity_pct != null && <span>💧 {record.humidity_pct}%</span>}
        <span>📋 {record.rows?.length || 0} 品目</span>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/records/${record.id}`}
          className="btn-secondary text-xs py-1.5 px-3 flex-1 justify-center"
        >
          詳細を見る
        </Link>
        <button
          onClick={() => onExportPdf(record.id, record.patrol_date)}
          className="btn-secondary text-xs py-1.5 px-3"
          title="PDFを出力"
        >
          📄 PDF
        </button>
      </div>
    </div>
  )
}

export default function RecordsPage() {
  const qc = useQueryClient()
  const today = new Date()
  const [selectedDate, setSelectedDate] = useState(today)
  const [showAll, setShowAll] = useState(false)
  const [page, setPage] = useState(1)
  const sseRef = useRef(null)

  const dateStr = showAll ? undefined : selectedDate?.toISOString().split('T')[0]
  const { data, isLoading, isError } = usePatrolRecords({ date: dateStr, page, page_size: 20 })

  // SSE realtime updates
  useEffect(() => {
    if (showAll || !dateStr) return
    const token = localStorage.getItem('qc-patrol-auth')
    const parsed = token ? JSON.parse(token) : null
    const accessToken = parsed?.state?.accessToken

    const url = `${BASE_URL}/records/stream?date=${dateStr}`
    const es = new EventSource(url, { withCredentials: true })
    sseRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'new_record') {
          qc.invalidateQueries({ queryKey: ['patrol-records', dateStr] })
          toast('新しい記録が追加されました', { icon: '🔔' })
        }
      } catch {}
    }

    return () => {
      es.close()
      sseRef.current = null
    }
  }, [dateStr, showAll])

  const handleExportPdf = async (id, date) => {
    try {
      const res = await patrolApi.exportPdf(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `TQD-002_${date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF生成に失敗しました')
    }
  }

  const handleBulkExport = async () => {
    if (!dateStr) return
    try {
      const res = await patrolApi.exportBulkPdf(dateStr)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `TQD-002_bulk_${dateStr}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('一括PDF生成に失敗しました')
    }
  }

  return (
    <PageWrapper
      title="パトロール記録一覧"
      subtitle="日付でフィルタリング、記録の閲覧とPDF出力"
    >
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 card">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-text-muted font-jp">日付：</label>
          <DatePicker
            selected={showAll ? null : selectedDate}
            onChange={(d) => { setSelectedDate(d); setShowAll(false); setPage(1) }}
            dateFormat="yyyy年MM月dd日"
            placeholderText="日付を選択"
            className="input-field w-44"
            disabled={showAll}
            id="records-date-picker"
          />
        </div>
        <button
          onClick={() => { setShowAll(true); setPage(1) }}
          className={`btn-secondary text-sm py-2 px-3 font-jp ${showAll ? 'bg-primary text-white border-primary' : ''}`}
          id="show-all-btn"
        >
          全件表示
        </button>
        {!showAll && dateStr && (
          <button
            onClick={handleBulkExport}
            className="btn-secondary text-sm py-2 px-3 font-jp ml-auto"
            id="bulk-pdf-btn"
          >
            📄 この日のPDFを一括出力
          </button>
        )}
        <Link to="/records/new" className="btn-primary text-sm py-2 px-3 font-jp ml-auto" id="records-new-btn">
          ＋ 新規記録
        </Link>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : isError ? (
        <div className="card p-8 text-center text-danger font-jp">データの取得に失敗しました</div>
      ) : data?.items?.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted font-jp text-sm">
            {dateStr ? `${dateStr} の記録はありません` : '記録がありません'}
          </p>
          <Link to="/records/new" className="btn-primary mt-4 inline-flex font-jp text-sm">
            最初の記録を作成
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {data.items.map((rec) => (
              <RecordCard key={rec.id} record={rec} onExportPdf={handleExportPdf} />
            ))}
          </div>

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← 前へ
              </Button>
              <span className="text-sm text-text-muted font-jp">
                {page} / {data.total_pages} ページ
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === data.total_pages}
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
              >
                次へ →
              </Button>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  )
}
