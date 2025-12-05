"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

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
  const [showControls, setShowControls] = useState(true)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>(null)
  const videoUrl = useRef<string | null>(null)

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
  // 🔥 2. Get video URL based on quality
  // ============================
  useEffect(() => {
    if (!videoData) return

    let url = videoData.videoUrl
    if (videoData.transcodedVersions && typeof videoData.transcodedVersions === "object") {
      url = videoData.transcodedVersions[quality] || videoData.videoUrl
    }
    videoUrl.current = url
  }, [videoData, quality])

  // ============================
  // 🔥 3. Mobile-specific setup
  // ============================
  useEffect(() => {
    // iOS requires playsInline and no autoplay for inline playback
    const video = videoRef.current
    if (!video) return

    // Reset video source when URL changes
    if (videoUrl.current && video.src !== videoUrl.current) {
      video.src = videoUrl.current
      video.load()
    }

    // Handle fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [videoUrl.current])

  // ============================
  // 🔥 4. Touch-friendly controls
  // ============================
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }, [isPlaying])

  const handleContainerClick = () => {
    setHasUserInteracted(true)
    showControlsTemporarily()
    togglePlay()
  }

  const handleContainerTouchStart = () => {
    setHasUserInteracted(true)
    showControlsTemporarily()
  }

  // ============================
  // 🔥 5. Video controls
  // ============================
  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (isPlaying) {
        video.pause()
        setIsPlaying(false)
      } else {
        // On mobile, we need to play with muted audio first due to autoplay restrictions
        if (!hasUserInteracted) {
          video.muted = true
          setIsMuted(true)
        }
        
        const playPromise = video.play()
        if (playPromise !== undefined) {
          await playPromise
          setIsPlaying(true)
          // Hide controls after play starts
          setTimeout(() => setShowControls(false), 2000)
        }
      }
    } catch (err: any) {
      console.error("Playback error:", err)
      // Fallback: try muted playback
      if (!hasUserInteracted) {
        video.muted = true
        const playPromise = video.play()
        if (playPromise !== undefined) {
          await playPromise
          setIsPlaying(true)
          setIsMuted(true)
        }
      }
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const newMutedState = !isMuted
    videoRef.current.muted = newMutedState
    setIsMuted(newMutedState)
    // If unmuting and volume is 0, set to 50%
    if (!newMutedState && volume[0] === 0) {
      setVolume([50])
      if (videoRef.current) videoRef.current.volume = 0.5
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      // Fallback for browsers that don't support fullscreen API
      if (containerRef.current.requestFullscreen) {
        if (!document.fullscreenElement) {
          containerRef.current.requestFullscreen()
        } else {
          document.exitFullscreen()
        }
      }
    }
  }

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return
    const newVolume = value[0] / 100
    videoRef.current.volume = newVolume
    setVolume(value)
    // Update mute state based on volume
    if (newVolume === 0) {
      setIsMuted(true)
    } else if (isMuted && newVolume > 0) {
      setIsMuted(false)
    }
  }

  const handleProgressChange = (value: number[]) => {
    if (!videoRef.current) return
    const newTime = (value[0] / 100) * videoRef.current.duration
    videoRef.current.currentTime = newTime
    setProgress(value)
    showControlsTemporarily()
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  // ============================
  // 🔥 6. Loading & Error states
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

  // ============================
  // 🔥 7. Render player
  // ============================
  return (
    <Card className="overflow-hidden">
      <div
        ref={containerRef}
        className="relative aspect-video bg-black touch-manipulation select-none"
        onTouchStart={handleContainerTouchStart}
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => {
          if (isPlaying) setShowControls(false)
        }}
      >
        {/* Video element with mobile attributes */}
        <video
          ref={videoRef}
          src={videoUrl.current!}
          poster={videoData?.thumbnailUrl}
          className="w-full h-full object-contain touch-none"
          playsInline
          preload="metadata"
          onTimeUpdate={(e) => {
            const v = e.target as HTMLVideoElement
            if (!isNaN(v.duration) && v.duration > 0) {
              setProgress([(v.currentTime / v.duration) * 100])
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false)
            setShowControls(true)
          }}
          onClick={handleContainerClick}
        />

        {/* Touch overlay for play/pause */}
        {!showControls && isPlaying && (
          <div 
            className="absolute inset-0 z-10"
            onClick={handleContainerClick}
            onTouchStart={(e) => {
              e.stopPropagation()
              handleContainerClick()
            }}
          />
        )}

        {/* Controls overlay */}
        <div className={cn(
          "absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent transition-all duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {/* Top bar for quality selector */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="secondary" className="bg-black/70 text-white backdrop-blur-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  {quality}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {["1080p", "720p", "480p", "360p"].map((q) => (
                  <DropdownMenuItem 
                    key={q} 
                    onClick={() => setQuality(q)}
                    className="flex justify-between"
                  >
                    {q}
                    {quality === q && "✓"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Center play button (visible when paused or loading) */}
          {(!isPlaying || !hasUserInteracted) && (
            <div 
              className="absolute inset-0 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation()
                togglePlay()
              }}
            >
              <button className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
                {isPlaying ? (
                  <Pause className="h-10 w-10 md:h-12 md:w-12 text-white" />
                ) : (
                  <Play className="h-10 w-10 md:h-12 md:w-12 text-white ml-1" />
                )}
              </button>
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
            {/* Progress bar */}
            <div className="w-full">
              <Slider
                value={progress}
                onValueChange={handleProgressChange}
                max={100}
                step={0.1}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/80 mt-1">
                <span>
                  {videoRef.current ? formatTime(videoRef.current.currentTime) : "0:00"}
                </span>
                <span>
                  {videoData?.duration ? formatTime(videoData.duration) : "0:00"}
                </span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white h-10 w-10 rounded-full bg-white/10 hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePlay()
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>

                {/* Volume */}
                <div className="flex items-center space-x-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white h-9 w-9"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMute()
                    }}
                  >
                    {isMuted || volume[0] === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  <Slider
                    value={volume}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-24 cursor-pointer"
                  />
                </div>
              </div>

              {/* Fullscreen */}
              <Button
                size="icon"
                variant="ghost"
                className="text-white h-10 w-10"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFullscreen()
                }}
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Play overlay for first interaction 
        {!hasUserInteracted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center space-y-4 p-8">
              <button
                onClick={togglePlay}
                className="w-24 h-24 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center transition-transform hover:scale-105"
              >
                <Play className="h-12 w-12 text-white ml-2" />
              </button>
              <p className="text-white font-medium">Tap to play</p>
              <p className="text-white/70 text-sm">Video may play muted first due to mobile restrictions</p>
            </div>
          </div>
        )}*/}
      </div>
    </Card>
  )
}