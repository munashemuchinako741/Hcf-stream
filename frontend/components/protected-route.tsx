"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    // Don't redirect while loading - wait for session verification
    if (isLoading) {
      return
    }

    if (!isAuthenticated) {
      // Only redirect if we're sure the user is not authenticated
      router.push("/login")
      return
    }

    // Check role if required
    if (requiredRole && user?.role !== requiredRole) {
      router.push("/unauthorized")
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router])

  // Show loading state while verifying session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Show content only if authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
