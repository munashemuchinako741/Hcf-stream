"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ArchivedVideoPlayer({ videoId }: { videoId: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([75])
  const [progress, setProgress] = useState([0])
  const [quality, setQuality] = useState("1080p")
  const videoRef = useRef<HTMLDivElement>(null)

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value)
    if (value[0] === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div ref={videoRef} className="relative aspect-video bg-black group">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
          <div className="text-center space-y-4">
            <div className="text-white text-lg font-semibold">Archived Sermon</div>
            <p className="text-white/80 text-sm">The Power of Faith in Difficult Times</p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="space-y-3">
            <Slider value={progress} onValueChange={setProgress} max={100} step={0.1} className="cursor-pointer" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={toggleMute} className="text-white hover:bg-white/20">
                    {isMuted || volume[0] === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-24 cursor-pointer"
                  />
                </div>

                <span className="text-white text-sm">0:00 / 1:23:45</span>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setQuality("1080p")}>
                      1080p {quality === "1080p" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQuality("720p")}>
                      720p {quality === "720p" && "✓"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQuality("480p")}>
                      480p {quality === "480p" && "✓"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
