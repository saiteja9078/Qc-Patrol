import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePatrolRecord, useDeleteRecord } from '../hooks/usePatrolRecords'
import { patrolApi } from '../api/patrolApi'
import { useAuth } from '../hooks/useAuth'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

function CheckCell({ value }) {
  if (value === true)
    return (
      <div className="text-center text-xs font-jp">
        <div className="text-success font-medium">☑ 問題無し</div>
        <div className="text-text-muted">□ 改善</div>
      </div>
    )
  if (value === false)
    return (
      <div className="text-center text-xs font-jp">
        <div className="text-text-muted">□ 問題無し</div>
        <div className="text-warning font-medium">☑ 改善</div>
      </div>
    )
  return (
    <div className="text-center text-xs text-text-muted font-jp">
      <div>□ 問題無し</div>
      <div>□ 改善</div>
    </div>
  )
}

export default function RecordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: record, isLoading, isError } = usePatrolRecord(id)
  const deleteRecord = useDeleteRecord()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleExportPdf = async () => {
    try {
      const res = await patrolApi.exportPdf(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `TQD-002_${record.patrol_date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF生成に失敗しました')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteRecord.mutateAsync(id)
      setShowDeleteModal(false)
      navigate('/records')
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const isOwner = user && record && user.id === record.user_id

  if (isLoading) return (
    <PageWrapper title="記録詳細">
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    </PageWrapper>
  )

  if (isError || !record) return (
    <PageWrapper title="記録詳細">
      <div className="card p-8 text-center text-danger font-jp">記録が見つかりません</div>
    </PageWrapper>
  )

  const improvCount = record.rows?.filter(
    (r) => r.check1_ok === false || r.check2_ok === false || r.check3_ok === false || r.check4_ok === false || r.check5_needs_improvement
  ).length || 0

  return (
    <PageWrapper
      title="パトロール記録詳細"
      subtitle={`TQD-002付表 — ${record.patrol_date}`}
    >
      {/* Header Card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary font-jp">{record.patrol_date}</h2>
            <p className="text-text-muted font-jp">
              {record.time_start?.slice(0, 5)} ～ {record.time_end?.slice(0, 5)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {improvCount > 0 ? (
              <Badge variant="warning">{improvCount} 項目に改善あり</Badge>
            ) : (
              <Badge variant="success">すべて問題無し</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-text-muted text-xs font-jp">天気</p>
            <p className="font-medium font-jp">{record.weather || '—'}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-jp">温度</p>
            <p className="font-medium">{record.temperature_c != null ? `${record.temperature_c}℃` : '—'}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-jp">湿度</p>
            <p className="font-medium">{record.humidity_pct != null ? `${record.humidity_pct}%` : '—'}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-jp">フォームID</p>
            <p className="font-medium font-jp text-xs">{record.form_id}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-jp">確認印</p>
            <p className="font-medium font-jp">{record.confirmed_by || '—'}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs font-jp">検査印</p>
            <p className="font-medium font-jp">{record.inspected_by || '—'}</p>
          </div>
        </div>

        {record.special_notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-text-muted font-jp">特記など</p>
            <p className="text-sm mt-1 font-jp">{record.special_notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button onClick={handleExportPdf} variant="secondary" id="export-pdf-btn">
          📄 <span className="font-jp">PDFを出力</span>
        </Button>
        {isOwner && (
          <>
            <Button
              onClick={() => navigate(`/records/${id}/edit`)}
              variant="secondary"
              id="edit-record-btn"
            >
              ✏️ <span className="font-jp">編集</span>
            </Button>
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="danger"
              id="delete-record-btn"
            >
              🗑 <span className="font-jp">削除</span>
            </Button>
          </>
        )}
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden mb-6">
        <div className="p-4 border-b border-border bg-gray-50">
          <h2 className="font-semibold text-text-primary font-jp">チェック項目一覧</h2>
          <p className="text-xs text-text-muted font-jp mt-1">
            ①製品異常　②服装及び汚れ　③周辺の５Ｓ　④作業手順　⑤その他
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted w-10">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted min-w-[140px] font-jp">品名</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-text-muted min-w-[80px] font-jp">①製品異常</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-text-muted min-w-[80px] font-jp">②服装</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-text-muted min-w-[80px] font-jp">③周辺５Ｓ</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-text-muted min-w-[80px] font-jp">④作業手順</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted min-w-[120px] font-jp">⑤その他</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {record.rows?.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 text-xs text-text-muted text-center">{row.row_order}</td>
                  <td className="px-3 py-2 text-xs font-jp font-medium">{row.product_name || <span className="text-text-muted">—</span>}</td>
                  <td className="px-3 py-2"><CheckCell value={row.check1_ok} /></td>
                  <td className="px-3 py-2"><CheckCell value={row.check2_ok} /></td>
                  <td className="px-3 py-2"><CheckCell value={row.check3_ok} /></td>
                  <td className="px-3 py-2"><CheckCell value={row.check4_ok} /></td>
                  <td className="px-3 py-2">
                    {row.check5_needs_improvement ? (
                      <div>
                        <span className="text-xs text-warning font-medium font-jp">☑ 改善</span>
                        {row.check5_note && (
                          <p className="text-[10px] text-text-muted mt-0.5 font-jp">{row.check5_note}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-muted font-jp">□ 改善</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="記録を削除しますか？"
      >
        <p className="text-sm text-text-muted font-jp mb-6">
          この記録は論理削除されます。物理的に消えることはありませんが、一覧から非表示になります。
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            キャンセル
          </Button>
          <Button
            variant="danger"
            loading={deleteRecord.isPending}
            onClick={handleDelete}
            id="confirm-delete-btn"
          >
            削除する
          </Button>
        </div>
      </Modal>
    </PageWrapper>
  )
}
