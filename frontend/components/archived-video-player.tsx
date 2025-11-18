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

  // Fetch video data
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`/api/archive/${videoId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to load video')
        }

        const data = await response.json()
        setVideoData(data.video)
        setIsLoading(false)
      } catch (err) {
        setError('Failed to load video')
        setIsLoading(false)
      }
    }

    fetchVideo()
  }, [videoId])

  // Get video URL based on quality
  const getVideoUrl = () => {
    if (!videoData) return null

    if (videoData.transcodedVersions) {
      const transcoded = JSON.parse(videoData.transcodedVersions)
      return transcoded[quality] || videoData.videoUrl
    }

    return videoData.videoUrl
  }

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
    } catch (err) {
      console.error('Error toggling play:', err)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    video.volume = value[0] / 100
    setVolume(value)
    if (value[0] === 0) {
      setIsMuted(true)
    } else if (isMuted) {
      setIsMuted(false)
    }
  }

  const handleProgressChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newTime = (value[0] / 100) * video.duration
    video.currentTime = newTime
    setProgress(value)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
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
          <div className="text-center space-y-4 p-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20 backdrop-blur-sm">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="text-white text-lg font-semibold">Unable to load video</p>
              <p className="text-white/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const videoUrl = getVideoUrl()

  return (
    <Card className="overflow-hidden">
      <div ref={containerRef} className="relative aspect-video bg-black group">
        {videoUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={videoUrl}
            poster={videoData?.thumbnailUrl}
            onTimeUpdate={(e) => {
              const video = e.target as HTMLVideoElement
              setProgress([(video.currentTime / video.duration) * 100])
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={(e) => {
              const video = e.target as HTMLVideoElement
              setVolume([video.volume * 100])
              setIsMuted(video.muted)
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement
              setVolume([video.volume * 100])
              setIsMuted(video.muted)
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <div className="text-center space-y-4">
              <div className="text-white text-lg font-semibold">{videoData?.title || 'Archived Sermon'}</div>
              <p className="text-white/80 text-sm">{videoData?.description || 'Video not available'}</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="space-y-3">
            <Slider
              value={progress}
              onValueChange={handleProgressChange}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />

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

                <span className="text-white text-sm">
                  {videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'} / {videoData?.duration ? formatTime(videoData.duration) : '0:00'}
                </span>
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
