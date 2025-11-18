"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Radio, Square, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface StreamStatus {
  isLive: boolean
  stream?: {
    id: number
    title: string
    description: string
    startedAt: string
    viewerCount: number
    duration: string
  }
}

export function StreamControls() {
  const [isLive, setIsLive] = useState(false)
  const [streamTitle, setStreamTitle] = useState("Sunday Morning Service")
  const [streamDescription, setStreamDescription] = useState("Join us for worship and teaching")
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const auth = useAuth()
  const token = (auth as any).token

  // Fetch stream status on mount and periodically
  useEffect(() => {
    const fetchStreamStatus = async () => {
      try {
        const res = await fetch('/api/admin/streams/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          setStreamStatus(data)
          setIsLive(data.isLive)
          if (data.stream) {
            setStreamTitle(data.stream.title)
            setStreamDescription(data.stream.description)
          }
        }
      } catch (error) {
        console.error('Failed to fetch stream status:', error)
      }
    }

    fetchStreamStatus()
    const interval = setInterval(fetchStreamStatus, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [token])

  const handleStartStream = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/streams/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: streamTitle,
          description: streamDescription
        })
      })

      if (res.ok) {
        const data = await res.json()
        setIsLive(true)
        alert(`Stream started! RTMP URL: ${data.rtmpUrl}`)
      } else {
        const error = await res.json()
        alert(`Failed to start stream: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to start stream:', error)
      alert('Failed to start stream')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopStream = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/streams/stop', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        setIsLive(false)
        alert('Stream stopped successfully')
      } else {
        const error = await res.json()
        alert(`Failed to stop stream: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to stop stream:', error)
      alert('Failed to stop stream')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Stream Controls
          </CardTitle>
          {isLive && (
            <Badge variant="destructive" className="gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stream-title">Stream Title</Label>
          <Input
            id="stream-title"
            value={streamTitle}
            onChange={(e) => setStreamTitle(e.target.value)}
            placeholder="Enter stream title"
            disabled={isLive}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stream-description">Description</Label>
          <Textarea
            id="stream-description"
            value={streamDescription}
            onChange={(e) => setStreamDescription(e.target.value)}
            placeholder="Enter stream description"
            rows={3}
            disabled={isLive}
          />
        </div>

        <div className="flex gap-2 pt-2">
          {!isLive ? (
            <Button onClick={handleStartStream} className="flex-1 gap-2" disabled={isLoading}>
              <Radio className="h-4 w-4" />
              {isLoading ? 'Starting...' : 'Start Stream'}
            </Button>
          ) : (
            <Button onClick={handleStopStream} variant="destructive" className="flex-1 gap-2" disabled={isLoading}>
              <Square className="h-4 w-4" />
              {isLoading ? 'Stopping...' : 'End Stream'}
            </Button>
          )}
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {isLive && streamStatus?.stream && (
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stream Duration</span>
              <span className="font-medium">{streamStatus.stream.duration}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Viewers</span>
              <span className="font-medium">{streamStatus.stream.viewerCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">RTMP URL</span>
              <span className="font-medium text-xs">rtmp://nginx:1935/live/church</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
