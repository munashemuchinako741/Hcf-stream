"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"

// Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Token refresh configuration
const TOKEN_CONFIG = {
  accessTokenExpiry: 15 * 60 * 1000, // 15 minutes
  refreshThreshold: 2 * 60 * 1000, // Refresh when 2 minutes left
}

interface User {
  id: number
  name: string
  email: string
  role: string
  isApproved: boolean
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const tokenRefreshInterval = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  /**
   * Refresh access token using the refresh token (stored in HTTP-only cookie)
   */
  const refreshAccessToken = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies (refresh token)
      })

      const data = await response.json()

      if (response.ok && data.token) {
        // Update access token in state
        setToken(data.token)
        
        // Schedule next refresh (13 minutes, before 15-minute expiry)
        scheduleTokenRefresh()
        return true
      } else {
        // Refresh token invalid/expired - must login again
        await logout()
        return false
      }
    } catch (error) {
      console.error("Token refresh failed:", error)
      await logout()
      return false
    }
  }

  /**
   * Schedule automatic token refresh
   */
  const scheduleTokenRefresh = () => {
    // Clear existing interval
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current)
    }

    // Schedule refresh 2 minutes before expiry (13 minutes from now)
    const refreshDelay = TOKEN_CONFIG.accessTokenExpiry - TOKEN_CONFIG.refreshThreshold
    tokenRefreshInterval.current = setInterval(() => {
      refreshAccessToken()
    }, refreshDelay)
  }

  /**
   * Clear scheduled token refresh
   */
  const clearScheduledRefresh = () => {
    if (tokenRefreshInterval.current) {
      clearInterval(tokenRefreshInterval.current)
      tokenRefreshInterval.current = null
    }
  }
  useEffect(() => {
    const verifySession = async () => {
      let storedToken: string | null = null
      try {
        // Check for JWT token (custom auth)
        storedToken = localStorage.getItem("token")
        if (storedToken) {
          setToken(storedToken)
          
          // Check cache first
          const cacheKey = `auth_verify_${storedToken}`
          const cached = apiCache.get(cacheKey)
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            setUser(cached.data.user)
            setIsLoading(false)
            return
          }

          // Verify token with backend
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: storedToken }),
          })

          const data = await response.json()
          
          if (response.ok && data.user) {
            // Cache the response
            apiCache.set(cacheKey, { data, timestamp: Date.now() })
            setUser(data.user)
          } else {
            // Token is invalid, clear it
            localStorage.removeItem("token")
            setToken(null)
          }
        }
      } catch (error) {
        console.error("Session verification error:", error)
        localStorage.removeItem("token")
        setToken(null)
      } finally {
        setIsLoading(false)
        // Schedule token refresh if user is authenticated
        if (storedToken) {
          scheduleTokenRefresh()
        }
      }
    }

    verifySession()

    // Cleanup on unmount
    return () => {
      clearScheduledRefresh()
    }
  }, []) // Only run on mount

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Send/receive cookies (refresh token)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      localStorage.setItem("token", data.token)
      setToken(data.token)
      setUser(data.user)
      
      // Schedule automatic token refresh (13 minutes from now)
      scheduleTokenRefresh()
      
      router.push("/live")
    } catch (error) {
      console.error("Login failed:", error)
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Don't set token, since register doesn't return it
      router.push("/login")
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      // Call backend logout to revoke refresh token
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
        credentials: 'include', // Send cookies
      })
    } catch (error) {
      console.error("Backend logout failed:", error)
      // Continue with local cleanup even if backend call fails
    }

    // Clear scheduled token refresh
    clearScheduledRefresh()

    // Clear local auth state
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
    apiCache.clear()

    router.push("/login")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
