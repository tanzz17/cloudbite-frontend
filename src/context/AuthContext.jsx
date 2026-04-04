import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(localStorage.getItem('cloudbite_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('cloudbite_user')
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser))
        fetchMe()
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [])

  const fetchMe = async () => {
    try {
      const { data } = await authAPI.me()
      setUser(data)
      localStorage.setItem('cloudbite_user', JSON.stringify(data))
    } catch {
      logout()
    }
  }

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('cloudbite_token', data.token)
    localStorage.setItem('cloudbite_user', JSON.stringify(data))
    setToken(data.token)
    setUser(data)
    toast.success(`Welcome back, ${data.name}! 🍽️`)
    return data
  }

  const register = async (formData) => {
    const { data } = await authAPI.register(formData)
    localStorage.setItem('cloudbite_token', data.token)
    localStorage.setItem('cloudbite_user', JSON.stringify(data))
    setToken(data.token)
    setUser(data)
    toast.success(`Welcome to CloudBite, ${data.name}! 🎉`)
    return data
  }

  const logout = () => {
    localStorage.removeItem('cloudbite_token')
    localStorage.removeItem('cloudbite_user')
    setToken(null)
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('cloudbite_user', JSON.stringify(updatedUser))
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
