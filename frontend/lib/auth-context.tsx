"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

// Cache for API responses
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { data: session, status } = useSession()

  // Check for existing session on mount
  useEffect(() => {
    if (status === "loading") return

    if (session?.user) {
      // Convert NextAuth session to our User type
      setUser({
        id: parseInt((session.user as any).id || "0"),
        name: session.user.name || "",
        email: session.user.email || "",
        role: "user", // Default role
        isApproved: true, // Social logins are pre-approved
      })
    } else {
      // Check for JWT token (custom auth)
      const token = localStorage.getItem("token")
      if (token) {
        // Check cache first
        const cacheKey = `auth_verify_${token}`
        const cached = apiCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setUser(cached.data.user)
          setIsLoading(false)
          return
        }

        fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })
          .then(res => res.json())
          .then(data => {
            if (data.user) {
              // Cache the response
              apiCache.set(cacheKey, { data, timestamp: Date.now() })
              setUser(data.user)
            } else {
              localStorage.removeItem("token")
            }
          })
          .catch(() => {
            localStorage.removeItem("token")
          })
      }
    }

    setIsLoading(false)
  }, [session, status])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      localStorage.setItem("token", data.token)
      setUser(data.user)
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

      localStorage.setItem("token", data.token)
      setUser(data.user)
      router.push("/login")
    } catch (error) {
      console.error("Registration failed:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut({ callbackUrl: "/" })
    } catch (error) {
      console.error("Sign out error:", error)
    }

    // Also clear custom auth
    localStorage.removeItem("token")
    setUser(null)
    // Clear cache on logout
    apiCache.clear()
    router.push("/")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
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
