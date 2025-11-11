"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { ArchiveGrid } from "@/components/archive-grid"
import { ArchiveFilters } from "@/components/archive-filters"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ArchivePage() {
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Sermon Archive</h1>
            <p className="text-muted-foreground leading-relaxed">Browse our collection of past sermons and messages</p>
          </div>

          <ArchiveFilters />
          <ArchiveGrid />
        </div>
      </main>
    </div>
  )
}
