"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Heart, Calendar } from "lucide-react"
import { useState } from "react"

export function StreamInfo() {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(342)

  const handleLike = () => {
    if (isLiked) {
      setLikeCount((prev) => prev - 1)
    } else {
      setLikeCount((prev) => prev + 1)
    }
    setIsLiked(!isLiked)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Sunday Service - HCF Live",
        text: "Watch the live service with me!",
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-2xl text-balance">Sunday Service - Morning Worship</CardTitle>
            <p className="text-sm text-muted-foreground">Pastor John Smith • Live now</p>
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
          Join us for our Sunday morning worship service. Today's message focuses on faith, hope, and community. We'll
          be exploring the power of prayer and how it transforms our daily lives.
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Sunday, 10:00 AM EST</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold mb-2">About this service</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Opening worship and praise</li>
            <li>• Community announcements</li>
            <li>• Main sermon message</li>
            <li>• Closing prayer and benediction</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
