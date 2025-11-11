"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { AdminStats } from "@/components/admin-stats"
import { StreamControls } from "@/components/stream-controls"
import { RecentActivity } from "@/components/recent-activity"
import { ScheduleManager } from "@/components/schedule-manager"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground leading-relaxed">Manage your live streams and content</p>
          </div>

          <AdminStats />

          <div className="grid lg:grid-cols-2 gap-6">
            <StreamControls />
            <ScheduleManager />
          </div>

          <RecentActivity />
        </div>
      </main>
    </div>
  )
}
