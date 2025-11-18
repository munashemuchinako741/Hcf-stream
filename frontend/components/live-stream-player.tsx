"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  Volume2,
  RefreshCw,
  VolumeX,
  Loader,
  Maximize,
  Settings,
  Radio,
  AlertCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Hls from "hls.js"

interface LiveStreamPlayerProps {
  streamKey?: string
}

const MAX_RETRIES = 5

export function LiveStreamPlayer({ streamKey = "church" }: LiveStreamPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState<number[]>([75])
  const [quality, setQuality] = useState("auto")
  const [availableQualities, setAvailableQualities] = useState<
    { label: string; value: string; level: number }[]
  >([])
  const [isLive, setIsLive] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAudioOnly, setIsAudioOnly] = useState(false)
  const [hlsUrl, setHlsUrl] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const retryCountRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Resolve HLS URL safely (no window on server)
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_LIVE_STREAM_URL
    if (envUrl) {
      // Optional: allow template replacement like .../{streamKey}.m3u8
      const url = envUrl.replace("{streamKey}", streamKey)
      setHlsUrl(url)
      return
    }

    if (typeof window !== "undefined") {
      const defaultUrl = `${window.location.protocol}//${window.location.hostname}/hls/live/${streamKey}.m3u8`
      setHlsUrl(defaultUrl)
    }
  }, [streamKey])

  // Initialize / reinitialize HLS player
  useEffect(() => {
    if (!hlsUrl) return

    const video = videoRef.current
    if (!video) return

    let loadingTimeout: NodeJS.Timeout | null = null

    // Cleanup helper
    const cleanupHls = () => {
      if (loadingTimeout) clearTimeout(loadingTimeout)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }

    const tryReconnect = () => {
      if (retryCountRef.current >= MAX_RETRIES) {
        setError("Unable to reconnect. Please check your network or if the stream is live.")
        setIsLoading(false)
        setIsLive(false)
        return
      }

      retryCountRef.current += 1
      setError(`Reconnecting... (attempt ${retryCountRef.current}/${MAX_RETRIES})`)

      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)

      reconnectTimeoutRef.current = setTimeout(() => {
        // Trigger re-init via reloadToken
        setReloadToken((t) => t + 1)
      }, 5000)
    }

    const initHls = async () => {
      setIsLoading(true)
      setError(null)
      setIsLive(false)

      // Timeout if nothing loads
      loadingTimeout = setTimeout(() => {
        setError("Stream loading timed out. The live stream may not be active.")
        setIsLoading(false)
        setIsLive(false)
      }, 30000)

      // Native HLS support (Safari, some smart TVs)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl

        const onLoadedMetadata = () => {
          // For VOD you could seek to end; for live just play
          setIsLoading(false)
          setIsLive(true)
          setError(null)
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          if (loadingTimeout) clearTimeout(loadingTimeout!)
        }

        const onError = () => {
          setError("Failed to load live stream.")
          setIsLoading(false)
          setIsLive(false)
          video.removeEventListener("error", onError)
          if (loadingTimeout) clearTimeout(loadingTimeout!)
        }

        video.addEventListener("loadedmetadata", onLoadedMetadata)
        video.addEventListener("error", onError)
        return
      }

      // Hls.js path (most browsers)
      if (Hls.isSupported()) {
        cleanupHls()

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          liveSyncDurationCount: 2, // stay close to live edge
          liveMaxLatencyDurationCount: 4,
          maxBufferLength: 8, // small buffer = lower latency
          backBufferLength: 15,
          maxLiveSyncPlaybackRate: 1.2,
        })

        hls.attachMedia(video)
        hls.loadSource(hlsUrl)

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Jump to live edge
          hls.startLoad(-1)
          if (loadingTimeout) clearTimeout(loadingTimeout!)
          setIsLoading(false)
          setIsLive(true)
          setError(null)

          // Quality levels
          const levels = hls.levels
          const qualities = levels.map((level, index) => ({
            label: level.height ? `${level.height}p` : `Level ${index}`,
            value: level.height ? `${level.height}p` : `level-${index}`,
            level: index,
          }))
          qualities.unshift({ label: "Auto", value: "auto", level: -1 })
          setAvailableQualities(qualities)
        })

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (loadingTimeout) clearTimeout(loadingTimeout!)
          console.error("HLS error:", data)

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                tryReconnect()
                break
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError()
                setError("Media error, attempting recovery...")
                break
              default:
                tryReconnect()
                break
            }
          }
        })

        hlsRef.current = hls
      } else {
        if (loadingTimeout) clearTimeout(loadingTimeout!)
        setError("HLS is not supported in this browser.")
        setIsLoading(false)
        setIsLive(false)
      }
    }

    initHls()

    return () => {
      cleanupHls()
      retryCountRef.current = 0
    }
  }, [hlsUrl, reloadToken])

  // Fetch real viewer count periodically
  useEffect(() => {
    if (!isLive) {
      setViewerCount(0)
      return
    }

    const fetchViewerCount = async () => {
      try {
        const res = await fetch("/api/live-stream/viewer-count")
        if (res.ok) {
          const data = await res.json()
          setViewerCount(data.viewerCount ?? 0)
        }
      } catch (err) {
        console.error("Error fetching viewer count:", err)
      }
    }

    fetchViewerCount()
    const interval = setInterval(fetchViewerCount, 10000)
    return () => clearInterval(interval)
  }, [isLive])

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (isPlaying) {
        video.pause()
        setIsPlaying(false)
        try {
          await fetch("/live-stream/viewer-count", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "decrement" }),
          })
        } catch (error) {
          console.error("Error updating viewer count:", error)
        }
      } else {
        await video.play()
        setIsPlaying(true)
        try {
          await fetch("/live-stream/viewer-count", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "increment" }),
          })
        } catch (error) {
          console.error("Error updating viewer count:", error)
        }
      }
    } catch (err) {
      console.error("Error toggling play:", err)
      setError("Failed to play video.")
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    const newMuted = !isMuted
    video.muted = newMuted
    setIsMuted(newMuted)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
    } else {
      video.requestFullscreen().catch(() => undefined)
    }
  }

  const toggleAudioOnly = () => {
    const video = videoRef.current
    if (video) {
      video.style.display = isAudioOnly ? "block" : "none"
    }
    setIsAudioOnly((prev) => !prev)
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const v = value[0] / 100
    video.volume = v
    setVolume(value)

    if (v === 0) {
      video.muted = true
      setIsMuted(true)
    } else if (isMuted) {
      video.muted = false
      setIsMuted(false)
    }
  }

  // Error UI
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
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  retryCountRef.current = 0
                  setError(null)
                  setIsLoading(true)
                  setReloadToken((t) => t + 1)
                }}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
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
          style={{ display: isAudioOnly ? "none" : "block" }}
          playsInline
          muted={isMuted}
          autoPlay
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onVolumeChange={(e) => {
            const v = (e.target as HTMLVideoElement).volume
            setVolume([v * 100])
            setIsMuted((e.target as HTMLVideoElement).muted || v === 0)
          }}
          onError={() => {
            setError("Video playback error.")
            setIsLoading(false)
            setIsLive(false)
          }}
        />

        {isAudioOnly && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm">
                <Volume2 className="h-10 w-10 text-white" />
              </div>
              <p className="text-white text-lg font-semibold">Audio Only Mode</p>
              <p className="text-white/80 text-sm">Stream is playing in audio-only mode</p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader className="h-6 w-6 animate-spin" />
              <span className="text-sm">Connecting to live stream…</span>
            </div>
          </div>
        )}

        {/* Live Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-semibold">{isLive ? "LIVE" : "OFFLINE"}</span>
        </div>

        {/* Viewer Count */}
        {isLive && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-white text-sm font-medium">{viewerCount} watching</span>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="space-y-3">
            {/* Progress is hidden for pure live (no DVR) */}
            {!isLive && <Slider value={[0]} max={100} step={1} className="cursor-pointer" disabled />}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20"
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

                <span className="text-white text-sm font-medium ml-2">
                  {isLive ? "LIVE" : "00:00 / --:--"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Quality Settings */}
                {availableQualities.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:bg-white/20"
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {availableQualities.map((q) => (
                        <DropdownMenuItem
                          key={q.value}
                          onClick={() => {
                            setQuality(q.value)
                            if (hlsRef.current) {
                              hlsRef.current.currentLevel = q.level // -1 = auto
                            }
                          }}
                        >
                          {q.label} {quality === q.value && "✓"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Audio Only */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleAudioOnly}
                  className="text-white hover:bg:white/20"
                >
                  <Radio className="h-5 w-5" />
                </Button>

                {/* Fullscreen */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
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
