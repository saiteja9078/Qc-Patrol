import { useNavigate } from 'react-router-dom'
import { PatrolForm } from '../components/patrol/PatrolForm'
import { PageWrapper } from '../components/layout/PageWrapper'
import { useCreateRecord } from '../hooks/usePatrolRecords'
import toast from 'react-hot-toast'

export default function NewRecordPage() {
  const navigate = useNavigate()
  const createRecord = useCreateRecord()

  const handleSubmit = async (payload) => {
    try {
      const record = await createRecord.mutateAsync(payload)
      toast.success('記録を保存しました')
      navigate(`/records/${record.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || '保存に失敗しました')
      throw err // re-throw so PatrolForm stays in submitting=false
    }
  }

  return (
    <PageWrapper
      title="新規パトロール記録"
      subtitle="ＱＣパトロール記録（組立工程） TQD-002付表"
    >
      <PatrolForm onSubmit={handleSubmit} submitting={createRecord.isPending} />
    </PageWrapper>
  )
}
