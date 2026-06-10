import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // include HttpOnly cookie for refresh token
})

// Attach access token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401: try token refresh once, then redirect to login
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    // Only attempt refresh on 401 and only once per original request
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err)
    }

    if (isRefreshing) {
      // Queue this request — it will be retried once refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        // Directly set the Authorization header — don't rely on Zustand timing
        const retryConfig = { ...original, _retry: true }
        retryConfig.headers = { ...original.headers, Authorization: `Bearer ${token}` }
        return axiosInstance(retryConfig)
      }).catch((e) => Promise.reject(e))
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      const newToken = data.access_token

      // Update store and axios defaults
      useAuthStore.getState().setAccessToken(newToken)
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`

      // Resolve queued requests with the new token (they apply it directly)
      processQueue(null, newToken)

      // Retry the original request that triggered the refresh
      original.headers.Authorization = `Bearer ${newToken}`
      return axiosInstance(original)
    } catch (refreshErr) {
      processQueue(refreshErr, null)
      useAuthStore.getState().logout()
      window.location.href = '/login'
      return Promise.reject(refreshErr)
    } finally {
      isRefreshing = false
    }
  }
)

export default axiosInstance
