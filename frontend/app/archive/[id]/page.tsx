"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { ArchivedVideoPlayer } from "@/components/archived-video-player"
import { RelatedVideos } from "@/components/related-videos"
import { VideoDescription } from "@/components/video-description"
import { ProtectedRoute } from "@/components/protected-route"
import { useParams } from "next/navigation"

function ArchivedVideoPageContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ArchivedVideoPlayer videoId={id} />
            <VideoDescription videoId={id} />
          </div>

          <div className="lg:col-span-1">
            <RelatedVideos currentVideoId={id} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ArchivedVideoPage() {
  return (
    <ProtectedRoute>
      <ArchivedVideoPageContent />
    </ProtectedRoute>
  )
}
