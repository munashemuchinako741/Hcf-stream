"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Heart, Calendar, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/apiClient"

interface StreamInfo {
  isLive: boolean
  title: string
  description: string
  speaker: string
  startTime: string | null
  viewerCount: number
}

export function StreamInfo() {
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(342)

  useEffect(() => {
    const fetchStreamInfo = async () => {
      try {
        setLoading(true)
        const data = await apiFetch('/api/live-stream/current-stream')
        setStreamInfo(data)
      } catch (err) {
        console.error('Failed to fetch stream info:', err)
        setError('Failed to load stream information')
      } finally {
        setLoading(false)
      }
    }

    fetchStreamInfo()

    // Refresh stream info every 30 seconds
    const interval = setInterval(fetchStreamInfo, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLike = () => {
    if (isLiked) {
      setLikeCount((prev) => prev - 1)
    } else {
      setLikeCount((prev) => prev + 1)
    }
    setIsLiked(!isLiked)
  }

  const handleShare = () => {
    const title = streamInfo?.title || "HCF Live Stream"
    const text = streamInfo?.isLive
      ? "Watch the live service with me!"
      : "Check out HCF Live Stream!"

    if (navigator.share) {
      navigator.share({
        title,
        text,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading stream information...</span>
        </CardContent>
      </Card>
    )
  }

  if (error || !streamInfo) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">{error || 'Unable to load stream information'}</p>
        </CardContent>
      </Card>
    )
  }

  const formatStartTime = (startTime: string | null) => {
    if (!startTime) return 'Not started'
    const date = new Date(startTime)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-2xl text-balance">{streamInfo.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {streamInfo.speaker && `${streamInfo.speaker} • `}
              {streamInfo.isLive ? 'Live now' : 'Offline'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={isLiked ? "default" : "outline"} onClick={handleLike} className="gap-2">
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              {likeCount}
            </Button>
            <Button size="sm" variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {streamInfo.description}
        </p>

        {streamInfo.isLive && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Started {formatStartTime(streamInfo.startTime)}</span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold mb-2">About this service</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Opening worship and praise</li>
            <li>• Community announcements</li>
            <li>• Main sermon message</li>
            <li>• Closing prayer</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
