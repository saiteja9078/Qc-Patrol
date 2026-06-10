import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi'
import { useAuth } from '../hooks/useAuth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'メールアドレスを入力してください'
    if (!form.password) e.password = 'パスワードを入力してください'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate() || submitting) return
    setSubmitting(true)
    setApiError('')
    try {
      const { data } = await authApi.login(form)
      // Fetch user profile
      const meRes = await authApi.getMe()
      setAuth(meRes.data, data.access_token)
      toast.success('ログインしました')
      navigate('/dashboard')
    } catch (err) {
      setApiError(err.response?.data?.detail || 'ログインに失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary font-jp">ＱＣパトロール記録</h1>
          <p className="text-text-muted text-sm mt-1 font-jp">アカウントにログイン</p>
        </div>

        <div className="card p-8 shadow-lg">
          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-danger rounded-lg text-danger text-sm font-jp">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              id="login-email"
              label="メールアドレス"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              error={errors.email}
              placeholder="example@email.com"
              autoComplete="email"
            />

            <div>
              <label htmlFor="login-password" className="label font-jp">パスワード</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  className={`input-field pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="パスワード"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password}</p>}
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-primary hover:underline font-jp">
                パスワードを忘れた方
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={submitting}
              id="login-submit-btn"
            >
              ログイン
            </Button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6 font-jp">
            アカウントをお持ちでない方は{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
