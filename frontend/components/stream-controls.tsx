"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Radio, Square, Settings } from "lucide-react"

export function StreamControls() {
  const [isLive, setIsLive] = useState(false)
  const [streamTitle, setStreamTitle] = useState("Sunday Morning Service")
  const [streamDescription, setStreamDescription] = useState("Join us for worship and teaching")

  const handleStartStream = () => {
    setIsLive(true)
  }

  const handleStopStream = () => {
    setIsLive(false)
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
          />
        </div>

        <div className="flex gap-2 pt-2">
          {!isLive ? (
            <Button onClick={handleStartStream} className="flex-1 gap-2">
              <Radio className="h-4 w-4" />
              Start Stream
            </Button>
          ) : (
            <Button onClick={handleStopStream} variant="destructive" className="flex-1 gap-2">
              <Square className="h-4 w-4" />
              End Stream
            </Button>
          )}
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {isLive && (
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Stream Duration</span>
              <span className="font-medium">1:23:45</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Viewers</span>
              <span className="font-medium">247</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peak Viewers</span>
              <span className="font-medium">312</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
