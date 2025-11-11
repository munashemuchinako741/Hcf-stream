"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Share2, Heart, Download } from "lucide-react"
import { useState } from "react"

export function VideoDescription({ videoId }: { videoId: string }) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(542)

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
        title: "The Power of Faith in Difficult Times",
        text: "Watch this powerful sermon!",
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
            <CardTitle className="text-2xl text-balance">The Power of Faith in Difficult Times</CardTitle>
            <p className="text-sm text-muted-foreground">Pastor John Smith • Jan 28, 2025 • 1,247 views</p>
          </div>
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
        <p className="text-sm leading-relaxed text-muted-foreground">
          In this powerful message, Pastor John explores how faith sustains us through life's most challenging moments.
          Drawing from biblical examples and real-life testimonies, discover how to strengthen your faith and find hope
          even in the darkest times.
        </p>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold mb-3">Key Points</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Understanding the nature of trials and tribulations</li>
            <li>• Building unshakeable faith through God's word</li>
            <li>• Finding peace in the midst of storms</li>
            <li>• Testimonies of faith overcoming adversity</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold mb-2">Scripture References</h4>
          <p className="text-sm text-muted-foreground">James 1:2-4, Romans 5:3-5, 2 Corinthians 4:16-18</p>
        </div>
      </CardContent>
    </Card>
  )
}
