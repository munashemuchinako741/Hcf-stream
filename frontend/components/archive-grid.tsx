"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Calendar, Eye, AlertCircle } from "lucide-react"
import Link from "next/link"

interface Sermon {
  id: number
  title: string
  speaker: string
  duration: number
  viewCount?: number
  thumbnailUrl: string
  category: string
  publishedAt: string
  createdAt: string
}

export function ArchiveGrid() {
  const [videos, setVideos] = useState<Sermon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const token = localStorage.getItem("token")
        
        const response = await fetch("/api/archive", {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) throw new Error("Failed to load videos")

        const data = await response.json()
        setVideos(data.videos || [])
        setIsLoading(false)

      } catch (err) {
        setError("Failed to load videos")
        setIsLoading(false)
      }
    }

    fetchVideos()
  }, [])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
      : `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="relative aspect-video bg-muted animate-pulse"></div>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
                <div className="h-3 bg-muted animate-pulse rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-lg font-semibold">Unable to load videos</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            <Play className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">No videos available</p>
          <p className="text-muted-foreground">Check back later for new sermons and messages</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <Link key={video.id} href={`/archive/${video.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="relative aspect-video bg-muted">
              <img
                src={video.thumbnailUrl || "/placeholder.svg"}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary-foreground ml-1" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-medium">
                {formatDuration(video.duration)}
              </div>
            </div>

            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="text-sm text-muted-foreground">{video.speaker}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(video.publishedAt || video.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{Number(video.viewCount || 0).toLocaleString()}</span>
                  </div>
                </div>

                <Badge variant="secondary" className="text-xs">
                  {video.category}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
