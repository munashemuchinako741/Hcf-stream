"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Heart, Download } from "lucide-react"
import { useState, useEffect } from "react"

interface VideoData {
  id: number
  title: string
  description: string
  speaker: string
  duration: number
  viewCount: number
  thumbnailUrl: string
  category: string
  publishedAt: string
  createdAt: string
}

export function VideoDescription({ videoId }: { videoId: string }) {
  const [video, setVideo] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  // Fetch video details
  useEffect(() => {
    const loadVideo = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await fetch(`/api/archive/${videoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) throw new Error("Failed to load video details")

        const data = await response.json()
        setVideo(data.video)
        setLikeCount(Math.floor(Math.random() * 800 + 200)) // temporary until you add backend likes
      } catch (err) {
        setError("Unable to load video details")
      } finally {
        setLoading(false)
      }
    }

    loadVideo()
  }, [videoId])

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount((prev) => prev + (isLiked ? -1 : 1))
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video?.title,
        text: "Watch this sermon!",
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (error || !video) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-red-500">{error}</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-2xl">{video.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {video.speaker || "Unknown Speaker"} • {formatDate(video.publishedAt || video.createdAt)} •{" "}
              {(video.viewCount || 0).toLocaleString()} views
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant={isLiked ? "default" : "outline"} onClick={handleLike} className="gap-2">
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              {likeCount}
            </Button>

            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>

            <Button size="sm" variant="outline">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* DESCRIPTION */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          {video.description || "No description available."}
        </p>
      </CardContent>
    </Card>
  )
}
