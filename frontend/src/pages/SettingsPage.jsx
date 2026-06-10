import { useState } from 'react'
import { authApi } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.current_password) e.current_password = '現在のパスワードを入力してください'
    if (!form.new_password || form.new_password.length < 8) e.new_password = '8文字以上'
    if (!/\d/.test(form.new_password)) e.new_password = '数字を含めてください'
    if (form.new_password !== form.confirm) e.confirm = 'パスワードが一致しません'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate() || submitting) return
    setSubmitting(true)
    try {
      await authApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })
      toast.success('パスワードを変更しました')
      setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'パスワード変更に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper title="アカウント設定" subtitle="パスワード変更などの設定">
      {/* User Info */}
      <div className="card p-6 mb-6 max-w-lg">
        <h2 className="font-semibold text-text-primary font-jp mb-4">アカウント情報</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted font-jp">メールアドレス</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted font-jp">氏名</span>
            <span className="font-medium font-jp">{user?.full_name || '—'}</span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6 max-w-lg">
        <h2 className="font-semibold text-text-primary font-jp mb-4">パスワード変更</h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="current-password"
            label="現在のパスワード"
            type="password"
            value={form.current_password}
            onChange={(e) => set('current_password', e.target.value)}
            error={errors.current_password}
          />
          <Input
            id="new-password"
            label="新しいパスワード (8文字以上、数字を含む)"
            type="password"
            value={form.new_password}
            onChange={(e) => set('new_password', e.target.value)}
            error={errors.new_password}
          />
          <Input
            id="confirm-new-password"
            label="新しいパスワード確認"
            type="password"
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            error={errors.confirm}
          />
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            id="change-password-btn"
          >
            <span className="font-jp">パスワードを変更</span>
          </Button>
        </form>
      </div>
    </PageWrapper>
  )
}
