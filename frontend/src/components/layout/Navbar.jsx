import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navLinks = [
    { to: '/dashboard', label: 'ダッシュボード' },
    { to: '/records', label: '記録一覧' },
    { to: '/records/new', label: '新規記録' },
    { to: '/settings', label: '設定' },
  ]

  const isActive = (to) => location.pathname === to

  return (
    <header className="bg-white border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Brand */}
          <Link to="/dashboard" className="flex items-center gap-2 font-jp font-bold text-primary text-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:block">ＱＣパトロール</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors font-jp ${
                  isActive(to)
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-xs text-text-muted font-jp">
                {user.full_name || user.email}
              </span>
            )}
            <button
              onClick={logout}
              className="text-xs text-text-muted hover:text-danger transition-colors px-2 py-1 rounded-md hover:bg-gray-100 font-jp"
              id="logout-btn"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
