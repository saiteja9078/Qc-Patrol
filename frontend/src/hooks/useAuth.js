import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/authApi'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function useAuth() {
  const { user, accessToken, setAuth, logout: storeLogout } = useAuthStore()
  const navigate = useNavigate()

  const logout = async () => {
    try { await authApi.logout() } catch {}
    storeLogout()
    navigate('/login')
    toast.success('ログアウトしました')
  }

  return {
    user,
    accessToken,
    isAuthenticated: !!accessToken,
    setAuth,
    logout,
  }
}
