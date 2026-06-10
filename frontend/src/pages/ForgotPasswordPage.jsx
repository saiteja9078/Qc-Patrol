import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ otp: '', new_password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email || submitting) return
    setSubmitting(true)
    setApiError('')
    try {
      await authApi.forgotPassword(email)
      toast.success('リセットコードを送信しました')
      setStep(2)
    } catch (err) {
      setApiError(err.response?.data?.detail || 'エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    const e2 = {}
    if (form.otp.length !== 6) e2.otp = '6桁のコードを入力してください'
    if (!form.new_password || form.new_password.length < 8) e2.new_password = '8文字以上'
    if (!/\d/.test(form.new_password)) e2.new_password = '数字を含めてください'
    if (form.new_password !== form.confirm) e2.confirm = 'パスワードが一致しません'
    setErrors(e2)
    if (Object.keys(e2).length || submitting) return

    setSubmitting(true)
    setApiError('')
    try {
      await authApi.resetPassword({ email, otp: form.otp, new_password: form.new_password })
      toast.success('パスワードをリセットしました')
      navigate('/login')
    } catch (err) {
      setApiError(err.response?.data?.detail || 'リセットに失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary font-jp">パスワードリセット</h1>
          <p className="text-text-muted text-sm mt-1 font-jp">
            {step === 1 ? '登録メールアドレスを入力してください' : 'メールのコードと新しいパスワードを入力'}
          </p>
        </div>

        <div className="card p-8 shadow-lg">
          <div className="flex gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`} />
            ))}
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-danger rounded-lg text-danger text-sm font-jp">
              {apiError}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} noValidate className="space-y-4">
              <Input
                id="forgot-email"
                label="メールアドレス"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
              />
              <Button type="submit" variant="primary" className="w-full" loading={submitting} id="forgot-submit-btn">
                リセットコードを送信
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleReset} noValidate className="space-y-4">
              <Input
                id="reset-otp"
                label="確認コード (6桁)"
                value={form.otp}
                onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                placeholder="123456"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
                inputMode="numeric"
                error={errors.otp}
              />
              <Input
                id="reset-password"
                label="新しいパスワード"
                type="password"
                value={form.new_password}
                onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
                error={errors.new_password}
                placeholder="8文字以上、数字を含む"
              />
              <Input
                id="reset-confirm"
                label="パスワード確認"
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                error={errors.confirm}
                placeholder="パスワードを再入力"
              />
              <Button type="submit" variant="primary" className="w-full" loading={submitting} id="reset-submit-btn">
                パスワードをリセット
              </Button>
            </form>
          )}

          <p className="text-center mt-4">
            <Link to="/login" className="text-sm text-primary hover:underline font-jp">
              ← ログインに戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
