"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ArchivedVideoPlayerProps {
  videoId: string
}

export function ArchivedVideoPlayer({ videoId }: ArchivedVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([75])
  const [progress, setProgress] = useState([0])
  const [quality, setQuality] = useState("1080p")
  const [videoData, setVideoData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ============================
  // 🔥 1. Fetch video data
  // ============================
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const token = localStorage.getItem("token")

        const response = await fetch(`/api/archive/${videoId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) throw new Error("Failed to load video")

        const data = await response.json()
        setVideoData(data.video)
        setIsLoading(false)
      } catch (err) {
        setError("Failed to load video")
        setIsLoading(false)
      }
    }

    fetchVideo()
  }, [videoId])

  // ============================
  // 🔥 2. Return video URL based on quality
  // ============================
  const getVideoUrl = () => {
    if (!videoData) return null

    if (videoData.transcodedVersions && typeof videoData.transcodedVersions === "object") {
      const url = videoData.transcodedVersions[quality]
      return url || videoData.videoUrl
    }

    return videoData.videoUrl
  }

  // ============================
  // 🔥 3. Controls
  // ============================
  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (isPlaying) {
        video.pause()
        setIsPlaying(false)
      } else {
        await video.play()
        setIsPlaying(true)
      }
    } catch {}
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current.requestFullscreen()
  }

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return
    videoRef.current.volume = value[0] / 100
    setVolume(value)
    setIsMuted(value[0] === 0)
  }

  const handleProgressChange = (value: number[]) => {
    if (!videoRef.current) return
    const newTime = (value[0] / 100) * videoRef.current.duration
    videoRef.current.currentTime = newTime
    setProgress(value)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // ============================
  // 🔥 4. Loading & Error
  // ============================
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20">
              <div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full"></div>
            </div>
            <p className="text-white text-lg">Loading video...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-white text-lg">Unable to load video</p>
            <p className="text-white/70 text-sm">{error}</p>
          </div>
        </div>
      </Card>
    )
  }

  const videoUrl = getVideoUrl()

  // ============================
  // 🔥 5. Final Player UI
  // ============================
  return (
    <Card className="overflow-hidden">
      <div ref={containerRef} className="relative aspect-video bg-black group">
        <video
          ref={videoRef}
          src={videoUrl!}
          poster={videoData?.thumbnailUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={(e) => {
            const v = e.target as HTMLVideoElement
            setProgress([(v.currentTime / v.duration) * 100])
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Controls */}
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">

          {/* Progress Bar */}
          <Slider value={progress} onValueChange={handleProgressChange} max={100} step={0.1} />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">

              {/* Play/Pause */}
              <Button size="icon" variant="ghost" className="text-white" onClick={togglePlay}>
                {isPlaying ? <Pause /> : <Play />}
              </Button>

              {/* Mute */}
              <Button size="icon" variant="ghost" className="text-white" onClick={toggleMute}>
                {isMuted ? <VolumeX /> : <Volume2 />}
              </Button>

              {/* Volume */}
              <Slider value={volume} onValueChange={handleVolumeChange} max={100} step={1} className="w-24" />

              {/* Time */}
              <span className="text-white text-sm">
                {videoRef.current ? formatTime(videoRef.current.currentTime) : "0:00"} /{" "}
                {videoData?.duration ? formatTime(videoData.duration) : "0:00"}
              </span>
            </div>

            {/* Quality + Fullscreen */}
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-white">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  {["1080p", "720p", "480p"].map((q) => (
                    <DropdownMenuItem key={q} onClick={() => setQuality(q)}>
                      {q} {quality === q ? "✓" : ""}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="icon" variant="ghost" className="text-white" onClick={toggleFullscreen}>
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
