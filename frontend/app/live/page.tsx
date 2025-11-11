"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { LiveStreamPlayer } from "@/components/live-stream-player"
import { StreamChat } from "@/components/stream-chat"
import { StreamInfo } from "@/components/stream-info"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LivePage() {
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
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Video Player - Takes 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            <LiveStreamPlayer streamKey={process.env.NEXT_PUBLIC_STREAM_KEY || "church"} />
            <StreamInfo />
          </div>

          {/* Chat Sidebar - Takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <StreamChat />
          </div>
        </div>
      </main>
    </div>
  )
}
