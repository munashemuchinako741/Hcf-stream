"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Radio, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Hls from 'hls.js'

interface LiveStreamPlayerProps {
  streamKey?: string
}

export function LiveStreamPlayer({ streamKey = "church" }: LiveStreamPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState([75])
  const [quality, setQuality] = useState("auto")
  const [isLive, setIsLive] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  // HLS stream URL
  const defaultUrl = `${window.location.protocol}//${window.location.hostname}/hls/live/${streamKey}.m3u8`
  const hlsUrl = process.env.NEXT_PUBLIC_LIVE_STREAM_URL || defaultUrl

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const initHls = async () => {
      try {
        // Check if HLS is supported natively
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl
        } else if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: false,
            lowLatencyMode: true,
            backBufferLength: 90
          })

          hls.loadSource(hlsUrl)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsLoading(false)
            setIsLive(true)
            setError(null)
          })

          hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
            console.error('HLS error:', data)
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setError('Network error - unable to load stream')
                  break
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError('Media error - stream format issue')
                  break
                default:
                  setError('Stream error - please try again later')
                  break
              }
              setIsLive(false)
              setIsLoading(false)
            }
          })

          hlsRef.current = hls
        } else {
          setError('HLS is not supported in this browser')
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Error initializing HLS:', err)
        setError('Failed to initialize video player')
        setIsLoading(false)
      }
    }

    initHls()

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [hlsUrl])

  // Simulate viewer count changes
  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 10 - 4))
    }, 5000)
    return () => clearInterval(interval)
  }, [isLive])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      video.requestFullscreen()
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

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 backdrop-blur-sm">
              <Radio className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <p className="text-white text-lg">Loading live stream...</p>
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
              <p className="text-white text-lg font-semibold">Unable to load live stream</p>
              <p className="text-white/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black group">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted={isMuted}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onVolumeChange={(e) => {
            const video = e.target as HTMLVideoElement
            setVolume([video.volume * 100])
            setIsMuted(video.muted)
          }}
        />

        {/* Live Indicator */}
        {isLive && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-sm font-semibold">LIVE</span>
          </div>
        )}

        {/* Viewer Count */}
        {isLive && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-white text-sm font-medium">{viewerCount} watching</span>
          </div>
        )}

        {/* Stream Title */}
        {isLive && (
          <div className="absolute bottom-20 left-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded">
            <p className="text-white text-sm font-medium">Church Live Stream</p>
            <p className="text-white/80 text-xs">Broadcasting live from our sanctuary</p>
          </div>
        )}

        {/* Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="space-y-3">
            {/* Progress Bar (hidden for live streams) */}
            {!isLive && <Slider value={[0]} max={100} step={1} className="cursor-pointer" />}

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:bg-white/20">
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                {/* Volume */}
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

                {/* Time Display */}
                {isLive ? (
                  <span className="text-white text-sm font-medium ml-2">LIVE</span>
                ) : (
                  <span className="text-white text-sm">0:00 / 1:23:45</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Quality Settings */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20">
                      <Settings className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setQuality("auto")}>
                      Auto {quality === "auto" && "✓"}
                    </DropdownMenuItem>
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

                {/* Fullscreen */}
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
