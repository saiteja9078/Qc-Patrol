import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: form, 2: OTP
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirm_password: '' })
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const validateStep1 = () => {
    const e = {}
    if (!form.email) e.email = 'メールアドレスを入力してください'
    if (!form.password || form.password.length < 8) e.password = '8文字以上のパスワードを入力してください'
    if (!/\d/.test(form.password)) e.password = '数字を1つ以上含めてください'
    if (form.password !== form.confirm_password) e.confirm_password = 'パスワードが一致しません'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!validateStep1() || submitting) return
    setSubmitting(true)
    setApiError('')
    try {
      await authApi.register({
        email: form.email,
        password: form.password,
        full_name: form.full_name || undefined,
      })
      toast.success('確認コードをメールで送信しました')
      setStep(2)
    } catch (err) {
      setApiError(err.response?.data?.detail || '登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6 || submitting) return
    setSubmitting(true)
    setApiError('')
    try {
      await authApi.verifyEmail({ email: form.email, otp })
      toast.success('メールアドレスを確認しました！ログインしてください。')
      navigate('/login')
    } catch (err) {
      setApiError(err.response?.data?.detail || '確認コードが正しくありません')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-jp">新規アカウント登録</h1>
          <p className="text-text-muted text-sm mt-1 font-jp">
            {step === 1 ? 'アカウント情報を入力してください' : 'メールに届いた確認コードを入力'}
          </p>
        </div>

        <div className="card p-8 shadow-lg">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
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
            <form onSubmit={handleRegister} noValidate className="space-y-4">
              <Input
                id="reg-email"
                label="メールアドレス *"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                error={errors.email}
                placeholder="example@email.com"
              />
              <Input
                id="reg-fullname"
                label="氏名"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                placeholder="山田 太郎"
              />
              <Input
                id="reg-password"
                label="パスワード * (8文字以上、数字を含む)"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                error={errors.password}
                placeholder="パスワード"
              />
              <Input
                id="reg-confirm"
                label="パスワード確認 *"
                type="password"
                value={form.confirm_password}
                onChange={(e) => set('confirm_password', e.target.value)}
                error={errors.confirm_password}
                placeholder="パスワードを再入力"
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={submitting}
                id="register-submit-btn"
              >
                登録してメール確認へ
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerify} noValidate className="space-y-4">
              <p className="text-sm text-text-muted font-jp text-center">
                <span className="font-medium text-text-primary">{form.email}</span><br />
                に6桁の確認コードを送信しました。
              </p>
              <Input
                id="otp-input"
                label="確認コード (6桁)"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="text-center text-2xl tracking-widest"
                maxLength={6}
                inputMode="numeric"
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={submitting}
                disabled={otp.length !== 6}
                id="otp-submit-btn"
              >
                メールアドレスを確認
              </Button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-text-muted hover:text-primary transition-colors font-jp"
              >
                ← 戻る
              </button>
            </form>
          )}

          <p className="text-center text-sm text-text-muted mt-6 font-jp">
            すでにアカウントをお持ちの方は{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
