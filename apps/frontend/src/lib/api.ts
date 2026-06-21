import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
})

let accessToken: string | null = null
// Singleton promise — prevents race conditions when multiple requests expire simultaneously
let refreshPromise: Promise<string> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

function doRefresh(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return data.accessToken as string
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      original._retry = true
      try {
        const newToken = await doRefresh()
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        setAccessToken(null)
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
