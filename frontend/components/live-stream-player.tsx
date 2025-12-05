"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Loader,
  Maximize,
  AlertCircle,
  Zap,
  Globe,
  Radio,
  Settings,
  MonitorSpeaker,
  Headphones,
  Video,
  Smartphone,
  ChevronDown,
  Check,
} from "lucide-react";

// Import Hls if available (for non-Safari browsers)
let Hls: any = null;
if (typeof window !== "undefined") {
  import("hls.js").then(module => {
    Hls = module.default;
  }).catch(() => {
    console.log("HLS.js not available, using native HLS");
  });
}

// ------------------------------------------------------
// SRS CONFIG - USE YOUR WORKING ENDPOINT
// ------------------------------------------------------
const SRS_CONFIG = {
  WHEP_URL: "http://54.227.11.207:1985/rtc/v1/whep/",
  HLS_URL: "http://54.227.11.207:8080/live/",
  APP: "live",
  
  // STUN servers (essential for WebRTC)
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// Quality levels
type QualityLevel = {
  id: string;
  name: string;
  bitrate?: number;
  width?: number;
  height?: number;
};

const QUALITY_LEVELS: QualityLevel[] = [
  { id: "auto", name: "Auto" },
  { id: "1080p", name: "1080p" },
  { id: "720p", name: "720p" },
  { id: "480p", name: "480p" },
  { id: "360p", name: "360p" },
  { id: "240p", name: "240p" },
];

interface Props {
  streamKey: string;
  autoPlay?: boolean;
  muted?: boolean;
  startWithHLS?: boolean; // Option to start with HLS instead of WebRTC
}

// Define type for stream mode
type StreamMode = "webrtc" | "hls" | "loading" | "webrtc-error" | "hls-error";

export default function LiveStreamPlayer({ 
  streamKey, 
  autoPlay = true,
  muted = false,
  startWithHLS = false
}: Props) {
  // State with proper initialization
  const [mode, setMode] = useState<StreamMode>("loading");
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isMuted, setIsMuted] = useState<boolean>(muted);
  const [volume, setVolume] = useState<number[]>([75]);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    latency: 0,
    bitrate: 0,
    connection: "disconnected",
  });
  
  // New states for enhanced features
  const [showControls, setShowControls] = useState<boolean>(true);
  const [audioOnly, setAudioOnly] = useState<boolean>(false);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [availableQualities, setAvailableQualities] = useState<QualityLevel[]>(QUALITY_LEVELS);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const hlsInstanceRef = useRef<any>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ======================================================
  // MOBILE DETECTION AND CONTROLS HANDLING
  // ======================================================
  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    
    checkMobile();
    
    // For mobile, show controls on touch
    const handleTouchStart = () => {
      setShowControls(true);
      
      // Clear existing timeout
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      
      // Hide controls after 3 seconds
      const timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
          setShowQualityMenu(false);
          setShowSettingsMenu(false);
        }
      }, 3000);
      
      setControlsTimeout(timeout);
    };
    
    // For desktop, show on hover
    const handleMouseEnter = () => {
      if (!isMobile) {
        setShowControls(true);
      }
    };
    
    const handleMouseLeave = () => {
      if (!isMobile && isPlaying) {
        setShowControls(false);
        setShowQualityMenu(false);
        setShowSettingsMenu(false);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener("touchstart", handleTouchStart);
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);
    }
    
    return () => {
      if (container) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [isMobile, isPlaying, controlsTimeout]);

  // ======================================================
  // STATS COLLECTION
  // ======================================================
  const startStatsCollection = useCallback(() => {
    // Clear any existing interval
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    
    // Set up new interval
    statsIntervalRef.current = setInterval(async () => {
      if (mode === "webrtc" && peerConnectionRef.current) {
        try {
          const statsReport = await peerConnectionRef.current.getStats();
          let totalBitrate = 0;
          let rtt = 0;
          
          statsReport.forEach((report: any) => {
            if (report.type === "inbound-rtp" && report.kind === "video") {
              totalBitrate = report.bitrate || 0;
            }
            if (report.type === "candidate-pair" && report.currentRoundTripTime) {
              rtt = report.currentRoundTripTime * 1000;
            }
          });
          
          setStats(prev => ({
            ...prev,
            bitrate: Math.round(totalBitrate / 1000),
            latency: Math.round(rtt),
          }));
        } catch (e) {
          console.warn("Failed to get WebRTC stats:", e);
        }
      }
    }, 2000);
  }, [mode]);

  // ======================================================
  // INITIALIZE WEBRTC CONNECTION
  // ======================================================
  const startWebRTC = useCallback(async (audioOnlyMode = false) => {
    try {
      setMode("loading");
      setError(null);
      setIsLive(false);
      
      // Clean up HLS if active
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      const video = videoRef.current;
      
      // Clean up any existing WebRTC connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Clear video element
      video.srcObject = null;
      video.src = "";

      // 1. Create PeerConnection with proper configuration
      const pc = new RTCPeerConnection({
        iceServers: SRS_CONFIG.ICE_SERVERS,
        iceTransportPolicy: "all",
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });

      peerConnectionRef.current = pc;

      // 2. Set up track handler (when we receive the stream)
      pc.ontrack = (event) => {
        console.log("WebRTC: Received track:", event.track.kind);
        
        if (video && event.streams && event.streams[0]) {
          video.srcObject = event.streams[0];
          video.muted = isMuted;
          
          // Auto-play if requested
          if (autoPlay) {
            video.play().catch(e => {
              console.warn("Autoplay prevented:", e);
            });
          }
          
          setIsLive(true);
          setMode("webrtc");
          startStatsCollection();
        }
      };

      // 3. Handle connection state changes
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setStats(prev => ({ ...prev, connection: state }));
        
        if (state === "failed" || state === "disconnected") {
          setTimeout(() => {
            if (pc.iceConnectionState === "failed") {
              pc.restartIce();
            }
          }, 1000);
        }
      };

      // 4. Create and send offer to SRS WHEP endpoint
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: !audioOnlyMode, // Don't request video if audio-only
      });
      
      await pc.setLocalDescription(offer);

      console.log("Sending offer to SRS WHEP endpoint...");
      
      // 5. Send offer to SRS WHEP endpoint
      const response = await fetch(
        `${SRS_CONFIG.WHEP_URL}?app=${SRS_CONFIG.APP}&stream=${streamKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 6. Set the remote description (SRS answer)
      const answerSDP = await response.text();
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSDP,
      });

      console.log("WebRTC connection established with SRS");

    } catch (err) {
      console.error("WebRTC connection failed:", err);
      setError(err instanceof Error ? err.message : "WebRTC connection failed");
      setMode("webrtc-error");
      
      // Fallback to HLS after a short delay
      setTimeout(() => {
        // Call startHLS directly
        startHLSFunc(audioOnlyMode);
      }, 1000);
    }
  }, [streamKey, autoPlay, isMuted]);

  // ======================================================
  // HLS PLAYBACK (WITH HLS.JS FALLBACK) - Defined as regular function
  // ======================================================
  const startHLSFunc = useCallback(async (audioOnlyMode = false) => {
    try {
      setMode("loading");
      setError(null);
      setIsLive(false);
      
      // Clean up WebRTC if active
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      if (!videoRef.current) return;

      const video = videoRef.current;
      const hlsUrl = `${SRS_CONFIG.HLS_URL}${streamKey}.m3u8`;
      
      // Clear previous video source
      video.srcObject = null;
      video.src = "";
      video.muted = isMuted;

      console.log("Starting HLS playback:", hlsUrl);

      // Check for native HLS support (Safari/iOS)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        console.log("Using native HLS (Safari/iOS)");
        video.src = hlsUrl;
        
        video.addEventListener("loadedmetadata", () => {
          setIsLive(true);
          setMode("hls");
          if (autoPlay) {
            video.play().catch(e => console.warn("HLS autoplay failed:", e));
          }
        });
        
        video.addEventListener("error", (e) => {
          console.error("Native HLS error:", e);
          setError("HLS stream error. Stream might not be live.");
          setMode("hls-error");
        });
        
        return;
      }
      
      // For non-Safari browsers, use Hls.js
      if (Hls && Hls.isSupported()) {
        console.log("Using Hls.js for HLS playback");
        
        // Clean up previous HLS instance
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.destroy();
        }
        
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          maxMaxBufferLength: 600,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
        });
        
        hlsInstanceRef.current = hls;
        
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        
        // Set up quality level tracking
        hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
          console.log("HLS manifest parsed", data.levels);
          setIsLive(true);
          setMode("hls");
          
          // Extract available quality levels
          const levels = data.levels.map((level: any, index: number) => ({
            id: `level_${index}`,
            name: level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)}kbps`,
            bitrate: level.bitrate,
            width: level.width,
            height: level.height,
          }));
          
          // Add auto option
          setAvailableQualities([
            { id: "auto", name: "Auto" },
            ...levels,
          ]);
          
          if (autoPlay) {
            video.play().catch(e => console.warn("HLS autoplay failed:", e));
          }
        });
        
        // Handle quality changes
        hls.on(Hls.Events.LEVEL_SWITCHED, (event: any, data: any) => {
          console.log("Quality switched to:", data.level);
        });
        
        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error("HLS error:", data);
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError("HLS network error. Trying to reconnect...");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setError("HLS fatal error. Switching to WebRTC...");
                setTimeout(() => startWebRTC(audioOnlyMode), 2000);
                break;
            }
          }
        });
        
        return;
      }
      
      // If no HLS support at all
      throw new Error("Your browser doesn't support HLS playback");
      
    } catch (err) {
      console.error("HLS failed:", err);
      setError(err instanceof Error ? err.message : "HLS stream error");
      setMode("hls-error");
      
      // Fallback to WebRTC
      setTimeout(() => {
        startWebRTC(audioOnlyMode);
      }, 1000);
    }
  }, [streamKey, autoPlay, isMuted, startWebRTC]);

  // ======================================================
  // INITIALIZE ON MOUNT
  // ======================================================
  useEffect(() => {
    if (!streamKey) {
      setError("Stream key is required");
      setMode("webrtc-error");
      return;
    }
    
    // Start with preferred protocol
    if (startWithHLS) {
      startHLSFunc(audioOnly);
    } else {
      startWebRTC(audioOnly);
    }
    
    // Cleanup on unmount
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [streamKey, startWithHLS, audioOnly, controlsTimeout]);

  // ======================================================
  // PLAYER CONTROLS
  // ======================================================
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    
    // Show controls when toggling play
    setShowControls(true);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changeVolume = (val: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.volume = val[0] / 100;
    setVolume(val);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch(console.warn);
    } else {
      document.exitFullscreen();
    }
  };

  const retryConnection = () => {
    setError(null);
    setMode("loading");
    if (mode === "hls" || mode === "hls-error") {
      startHLSFunc(audioOnly);
    } else {
      startWebRTC(audioOnly);
    }
  };

  const switchProtocol = () => {
    if (mode === "webrtc" || mode === "webrtc-error") {
      startHLSFunc(audioOnly);
    } else if (mode === "hls" || mode === "hls-error") {
      startWebRTC(audioOnly);
    }
  };

  const toggleAudioOnly = () => {
    const newAudioOnly = !audioOnly;
    setAudioOnly(newAudioOnly);
    
    // Reconnect with new audio-only setting
    if (mode === "hls" || mode === "hls-error") {
      startHLSFunc(newAudioOnly);
    } else {
      startWebRTC(newAudioOnly);
    }
  };

  const changeQuality = (qualityId: string) => {
    setSelectedQuality(qualityId);
    setShowQualityMenu(false);
    
    if (mode === "hls" && hlsInstanceRef.current) {
      if (qualityId === "auto") {
        hlsInstanceRef.current.currentLevel = -1; // Auto
      } else {
        // Find the level index
        const levelIndex = availableQualities.findIndex(q => q.id === qualityId) - 1; // Subtract 1 for auto
        if (levelIndex >= 0) {
          hlsInstanceRef.current.currentLevel = levelIndex;
        }
      }
    }
  };

  // ======================================================
  // ERROR DISPLAY
  // ======================================================
  if (error && (mode === "webrtc-error" || mode === "hls-error")) {
    return (
      <Card className="overflow-hidden">
        <div className="aspect-video bg-black flex flex-col items-center justify-center text-white gap-4 p-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-lg font-semibold">Stream Unavailable</p>
          <p className="text-white/70 text-sm text-center max-w-md">{error}</p>
          <div className="flex gap-3 mt-2 flex-wrap justify-center">
            <Button onClick={retryConnection} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry Connection
            </Button>
            <Button onClick={switchProtocol} variant="default">
              <Globe className="h-4 w-4 mr-2" />
              Switch to {mode === "webrtc-error" ? "HLS" : "WebRTC"}
            </Button>
            <Button onClick={toggleAudioOnly} variant="outline" className="text-pink-600 border-white/30">
              <Headphones className="h-4 w-4 mr-2" />
              {audioOnly ? "Show Video" : "Audio Only"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // ======================================================
  // MAIN PLAYER UI
  // ======================================================
  return (
    <div className="overflow-hidden">
      <div 
        ref={containerRef}
        className="relative aspect-video bg-black group"
        onTouchStart={() => setShowControls(true)}
      >
        {/* Video Element */}
        <div className={`w-full h-full ${audioOnly ? 'hidden' : 'block'}`}>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            playsInline
            autoPlay={autoPlay}
            muted={isMuted}
            onClick={togglePlay}
          />
        </div>
        
        {/* Audio-only Placeholder */}
        {audioOnly && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-linear-to-br from-gray-900 to-black">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Headphones className="h-16 w-16 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Radio className="h-5 w-5 text-white" />
              </div>
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">Audio Stream</h3>
            <p className="text-white/70 text-sm text-center max-w-xs mb-6">
              Listening to live audio feed. Video is disabled to save bandwidth.
            </p>
            <div className="flex gap-3">
              <Button onClick={toggleAudioOnly} variant="secondary" size="sm">
                <MonitorSpeaker className="h-4 w-4 mr-2" />
                Show Video
              </Button>
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {mode === "loading" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-white" />
            <div className="text-white text-sm">
              {startWithHLS ? "Loading HLS stream..." : "Connecting to WebRTC..."}
              {audioOnly && " (Audio only)"}
            </div>
          </div>
        )}
        
        {/* Top Info Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isLive ? "destructive" : "secondary"}>
              <Radio className="h-3 w-3 mr-1" />
              {isLive ? "LIVE" : "OFFLINE"}
            </Badge>
            
            <Badge variant={mode === "webrtc" ? "default" : "secondary"}>
              {mode === "webrtc" ? (
                <Zap className="h-3 w-3 mr-1" />
              ) : (
                <Globe className="h-3 w-3 mr-1" />
              )}
              {mode === "webrtc" ? "WebRTC" : "HLS"}
            </Badge>
            
            {audioOnly && (
              <Badge variant="outline" className="border-white/30 text-white">
                <Headphones className="h-3 w-3 mr-1" />
                Audio Only
              </Badge>
            )}
          </div>
          
          {/* Stats Display */}
          {stats.connection === "connected" && mode === "webrtc" && (
            <div className="text-xs text-white/80 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {stats.latency > 0 && `${stats.latency}ms`}
              {stats.bitrate > 0 && ` • ${stats.bitrate}kbps`}
            </div>
          )}
        </div>
        
        {/* Device Indicator (Mobile only) 
        {isMobile && (
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              Mobile
            </Badge>
          </div>
        )}*/}
        
        {/* Controls Overlay */}
        {(showControls || !isPlaying) && (
          <div className={`absolute bottom-0 left-0 right-0 pb-4 bg-linear-to-t from-black/90 via-black/50 to-transparent transition-all duration-300 px-4 ${isMobile ? 'opacity-100' : 'group-hover:opacity-100 opacity-0'}`}>
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>
                
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                
                <div className="relative group/volume">
                  <Slider
                    value={volume}
                    onValueChange={changeVolume}
                    max={100}
                    step={1}
                    className="w-20"
                  />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/volume:opacity-100 transition-opacity whitespace-nowrap">
                    Volume: {volume[0]}%
                  </div>
                </div>
              </div>
              
              {/* Center Controls */}
              <div className="flex items-center gap-2">
                {/* Audio Only Toggle */}
                <Button
                  size="sm"
                  variant={audioOnly ? "default" : "ghost"}
                  onClick={toggleAudioOnly}
                  className="text-white hover:bg-white/20"
                >
                  <Headphones className="h-4 w-4 mr-2" />
                  {audioOnly ? "Video" : "Audio Only"}
                </Button>
              </div>
              
              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Quality Selector (HLS only) */}
                {mode === "hls" && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowQualityMenu(!showQualityMenu);
                        setShowSettingsMenu(false);
                      }}
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="h-4 w-4 mr-2" />

                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                    
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/10 min-w-[150px] z-50">
                        <div className="py-1">
                          {availableQualities.map((quality) => (
                            <button
                              key={quality.id}
                              onClick={() => changeQuality(quality.id)}
                              className="flex items-center justify-between w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                            >
                              <span>{quality.name}</span>
                              {selectedQuality === quality.id && (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Settings Menu */}
                <div className="relative">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setShowSettingsMenu(!showSettingsMenu);
                      setShowQualityMenu(false);
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>

                 
                  {showSettingsMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg shadow-lg border border-white/10 min-w-[180px] z-50">
                      <div className="py-1">
                        <button
                          onClick={switchProtocol}
                          className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Switch to {mode === "webrtc" ? "HLS" : "WebRTC"}
                        </button>
                        <button
                          onClick={retryConnection}
                          className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reconnect
                        </button>
                        <div className="border-t border-white/10 my-1"></div>
                        <button
                          onClick={toggleAudioOnly}
                          className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <Headphones className="h-4 w-4 mr-2" />
                          {audioOnly ? "Enable Video" : "Audio Only Mode"}
                        </button>
                      </div>
                    </div>
                  )}
                  
                </div>
                
                
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
            
            {/* Progress Bar (Optional) */}
            {mode === "hls" && !audioOnly && (
              <div className="mt-2">
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: '90%' }} // This would be dynamic in a real player
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Click to Play Overlay (when paused) */}
        {!isPlaying && mode !== "loading" && mode !== "webrtc-error" && mode !== "hls-error" && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            <div className="bg-black/60 p-8 rounded-full hover:bg-black/80 transition-colors">
              <Play className="h-12 w-12 text-white" />
            </div>
          </div>
        )}
        
        {/* Mobile Controls Hint */}
        {isMobile && isPlaying && !showControls && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full animate-pulse">
            Tap to show controls
          </div>
        )}
      </div>
    </div>
  );
}