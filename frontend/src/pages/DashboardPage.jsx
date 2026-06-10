import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { patrolApi } from '../api/patrolApi'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Spinner } from '../components/ui/Spinner'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'

function StatCard({ title, value, sub, icon, color = 'blue' }) {
  const colors = {
    blue: 'text-primary bg-blue-50',
    green: 'text-success bg-green-50',
    amber: 'text-warning bg-amber-50',
  }
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-text-muted text-sm font-jp">{title}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        {sub && <p className="text-xs text-text-muted font-jp">{sub}</p>}
      </div>
    </div>
  )
}

function RecordSummaryCard({ record }) {
  const improvCount = record.rows?.filter(
    (r) => r.check1_ok === false || r.check2_ok === false || r.check3_ok === false || r.check4_ok === false || r.check5_needs_improvement
  ).length || 0

  return (
    <Link
      to={`/records/${record.id}`}
      className="card p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200 block group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary font-jp group-hover:text-primary transition-colors">
            {record.patrol_date}
          </p>
          <p className="text-xs text-text-muted font-jp mt-0.5">
            {record.time_start?.slice(0, 5)} ～ {record.time_end?.slice(0, 5)}
          </p>
        </div>
        <div className="flex gap-1">
          {improvCount > 0 ? (
            <Badge variant="warning">{improvCount} 改善</Badge>
          ) : (
            <Badge variant="success">問題無し</Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-text-muted font-jp">
          {record.weather} {record.temperature_c != null ? `${record.temperature_c}℃` : ''}
        </span>
        <span className="text-xs text-text-muted font-jp">
          {record.rows?.length || 0} 品目
        </span>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)

  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['patrol-records', today],
    queryFn: () => patrolApi.listRecords({ date: today, page_size: 100 }).then((r) => r.data),
  })

  const { data: monthData, isLoading: loadingMonth } = useQuery({
    queryKey: ['patrol-records-month', thisMonth],
    queryFn: () => patrolApi.listRecords({ page_size: 100 }).then((r) => r.data),
  })

  const { data: recentData, isLoading: loadingRecent } = useQuery({
    queryKey: ['patrol-records-recent'],
    queryFn: () => patrolApi.listRecords({ page_size: 5 }).then((r) => r.data),
  })

  const todayCount = todayData?.total || 0
  const monthCount = monthData?.total || 0
  const improvToday = todayData?.items?.reduce((acc, rec) => {
    return acc + (rec.rows?.filter(
      (r) => r.check1_ok === false || r.check2_ok === false || r.check3_ok === false || r.check4_ok === false || r.check5_needs_improvement
    ).length || 0)
  }, 0) || 0

  return (
    <PageWrapper
      title={`おはようございます、${user?.full_name || user?.email?.split('@')[0] || 'ユーザー'}さん`}
      subtitle={`本日 ${today} のダッシュボード`}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="本日の記録数"
          value={loadingToday ? '—' : todayCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="今月の記録数"
          value={loadingMonth ? '—' : monthCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="本日の改善フラグ"
          value={loadingToday ? '—' : improvToday}
          sub={improvToday > 0 ? '要注意' : '問題ありません'}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          color="amber"
        />
      </div>

      {/* Quick Action */}
      <div className="mb-8">
        <Link
          to="/records/new"
          id="new-record-btn"
          className="btn-primary inline-flex gap-2 text-sm py-3 px-6 shadow-md hover:shadow-lg transition-shadow"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-jp">新規パトロール記録</span>
        </Link>
      </div>

      {/* Recent Records */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary font-jp">最近の記録</h2>
          <Link to="/records" className="text-sm text-primary hover:underline font-jp">
            すべて表示 →
          </Link>
        </div>
        {loadingRecent ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : recentData?.items?.length === 0 ? (
          <div className="card p-12 text-center text-text-muted font-jp">
            <p className="text-sm">まだ記録がありません。最初の記録を作成しましょう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentData?.items?.map((rec) => (
              <RecordSummaryCard key={rec.id} record={rec} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
