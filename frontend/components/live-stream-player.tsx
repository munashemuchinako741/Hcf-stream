"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Loader,
  Maximize,
  Settings,
  Radio,
  AlertCircle,
  SkipForward,
  MonitorDown,
} from "lucide-react";

import Hls from "hls.js";

console.log('LiveStreamPlayer mounted')

// Note: Ant Media WebPlayer is a non-React class. We import it dynamically inside
// startWebRTC() at runtime (client-only) and instantiate the class there.

// Ant Media Base URL
const ANT_BASE = process.env.NEXT_PUBLIC_ANT_BASE_URL!; // must end with "/"
const HLS_ROOT = "streams"; // Ant default

interface Props {
  streamKey?: string;
}

// NOTE: Do NOT provide a public default stream key here. The component will
// request a secure stream id from the backend when no `streamKey` prop is
// supplied. This prevents accidentally bundling sensitive stream ids into the
// client JS (avoid using NEXT_PUBLIC_STREAM_KEY for secrets).
export default function LiveStreamPlayer({ streamKey }: Props) {
  const [mode, setMode] = useState<"webrtc" | "hls">("webrtc");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number[]>([75]);

  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [quality, setQuality] = useState("auto");
  const [qualities, setQualities] = useState<
    { label: string; level: number; value: string }[]
  >([]);

  const [error, setError] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);

  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [liveEdge, setLiveEdge] = useState(true);
  const [seekValue, setSeekValue] = useState(100); // slider progress

  const hlsRef = useRef<Hls | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const webPlayerRef = useRef<any>(null);

  const safeSetCurrentTime = (video: HTMLVideoElement, time: number) => {
    if (typeof time === "number" && isFinite(time)) {
      video.currentTime = time;
    }
  };



  const DVR_WINDOW = 15; // seconds for DVR

  // ======================================================
  // INIT HYBRID PLAYER
  // ======================================================
  useEffect(() => {
    console.log('LiveStreamPlayer useEffect running');
    const cleanup = () => {
      if (webPlayerRef.current?.stop) {
        webPlayerRef.current.stop();
      }
      webPlayerRef.current = null;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    // Derive stream id: prefer prop; otherwise request from server-side endpoint
    const getStreamId = async (): Promise<string | null> => {
      console.log('getStreamId called, streamKey:', streamKey);
      if (streamKey) {
        console.log('getStreamId: using streamKey prop:', streamKey);
        return streamKey;
      }
      try {
        // Request stream id from a secure backend endpoint that requires auth.
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        console.log('getStreamId about to fetch, token:', storedToken);
        const res = await fetch("/api/live-stream/stream-id", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
        });
        console.log('[LiveStreamPlayer] Response status:', res.status);
        if (!res.ok) {
          console.error('[LiveStreamPlayer] Failed to fetch stream id. Status:', res.status, res.statusText);
          return null;
        }
        const data = await res.json();
        console.log('[LiveStreamPlayer] Stream id response:', data);
        return data?.streamId || null;
      } catch (e) {
        console.error('[LiveStreamPlayer] Error fetching stream id:', e);
        return null;
      }
    };

    let mounted = true;
    cleanup();

    (async () => {
      console.log('LiveStreamPlayer getStreamId IIFE running');
      const id = await getStreamId();
      if (!mounted) return;
      if (!id) {
        setError(
          "Stream ID not found. Configure a streamKey prop or provide a server-side stream id at /api/live-stream/stream-id."
        );
        setIsLoading(false);
        return;
      }

      // start the player with the resolved id
      startWebRTC(id);
    })();

    return () => {
      mounted = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamKey]);

  // ======================================================
  // 1) WEBRTC PRIMARY
  // ======================================================
  // startWebRTC now accepts a resolved stream id to avoid relying on global state
  const startWebRTC = async (resolvedStreamId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      // Dynamically import the Ant Media WebPlayer class at runtime (client-only)
      const mod = await import("@antmedia/web_player");
      // module typings may not expose `default`; fall back to the module itself
      const WebPlayerClass: any = (mod && (mod.WebPlayer || (mod as any).default || mod)) as any;
      if (!WebPlayerClass) {
        throw new Error("Ant Media WebPlayer module not found");
      }

      const player = new WebPlayerClass(
        {
          id: resolvedStreamId, // use resolved id from prop or URL
          httpBaseURL: process.env.NEXT_PUBLIC_ANT_BASE_URL!,
          autoplay: true,
          mute: false,
          playOrder: "webrtc,hls",
          ui: false,
          useUrlParams: false, // ⬅️ disables query param check
        },
        containerRef.current!,
        null
      );


      webPlayerRef.current = player;

      await player.initialize();
      
      // Handle play promise to avoid AbortError
      try {
        await player.play();
      } catch (playErr: any) {
        // Ignore AbortError - it means another load request interrupted
        if (playErr.name !== "AbortError") {
          throw playErr;
        }
      }

      // get internal video element WebPlayer injects
      const internal = containerRef.current?.querySelector("video");
      videoRef.current = internal as HTMLVideoElement;

      setMode("webrtc");
      setIsLive(true);
      setIsLoading(false);

      console.log("WebRTC Active");
    } catch (err) {
      console.warn("WebRTC Failed → HLS fallback", err);
      startHLS();
    }
  };

  // ======================================================
  // 2) HLS FALLBACK WITH 15s DVR
  // ======================================================
  const startHLS = () => {
    setMode("hls");
    setIsLoading(true);

    const video = videoRef.current!;
    const m3u8 = `${ANT_BASE}${HLS_ROOT}/${streamKey}.m3u8`;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = m3u8;
      video.play().catch((err) => {
        // Ignore abort errors from interrupted play requests
        if (err.name !== "AbortError") {
          console.error("Play error:", err);
        }
      });
      finishHlsSetup();
      return;
    }

    const hls = new Hls({
      lowLatencyMode: true,
      backBufferLength: DVR_WINDOW,
      maxBufferLength: DVR_WINDOW,
      liveSyncDurationCount: 2,
    });

    hls.loadSource(m3u8);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      finishHlsSetup();
      video.play().catch((err) => {
        // Ignore abort errors from interrupted play requests
        if (err.name !== "AbortError") {
          console.error("Play error:", err);
        }
      });
    });

    hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
      const levels = hls.levels;
      setQualities([
        { label: "Auto", value: "auto", level: -1 },
        ...levels.map((lvl, i) => ({
          label: `${lvl.height}p`,
          value: `${lvl.height}p`,
          level: i,
        })),
      ]);
    });

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        setError("HLS playback error");
      }
    });

    hlsRef.current = hls;
  };

  const finishHlsSetup = () => {
    setIsLive(true);
    setIsLoading(false);
    console.log("HLS Fallback Active");
  };

  // ======================================================
  // VIEWER COUNT POLLING
  // ======================================================
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch("/api/live-stream/viewer-count");
        if (r.ok) {
          const d = await r.json();
          setViewerCount(d.viewerCount ?? 0);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [isLive]);

  // ======================================================
  // CONTROLS
  // ======================================================
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const m = !isMuted;
    v.muted = m;
    setIsMuted(m);
  };

  const changeVolume = (val: number[]) => {
    const v = videoRef.current;
    if (!v) return;
    const level = val[0] / 100;
    v.volume = level;
    v.muted = level === 0;
    setIsMuted(level === 0);
    setVolume(val);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.requestFullscreen();
  };

  const toggleAudioOnly = () => {
    setIsAudioOnly((p) => !p);
  };

  const jumpToLive = () => {
    const v = videoRef.current;
    if (!v) return;
    
    // Validate duration is a finite number
    if (typeof v.duration === "number" && isFinite(v.duration) && v.duration > 0) {
      v.currentTime = v.duration; // jump to live edge
      setLiveEdge(true);
      setSeekValue(100);
    } else {
      console.warn("Cannot jump to live - duration not ready", v.duration);
    }
  };

  // ======================================================
  // DVR SEEKING
  // ======================================================
  useEffect(() => {
    if (mode !== "hls") return;
    const v = videoRef.current;

    if (!v) return;

    const checkPos = () => {
      const diff = v.duration - v.currentTime;
      setLiveEdge(diff < 1.5); // <1.5s behind = live edge
      setSeekValue((v.currentTime / v.duration) * 100 || 100);
    };

    v.addEventListener("timeupdate", checkPos);
    return () => v.removeEventListener("timeupdate", checkPos);
  }, [mode]);

  const onSeek = (val: number[]) => {
    if (mode !== "hls") return;
    const v = videoRef.current;
    if (!v) return;

    const pct = val[0] / 100;
    v.currentTime = pct * v.duration;

    setLiveEdge(false);
    setSeekValue(val[0]);
  };

  // ======================================================
  // ERROR UI
  // ======================================================
  if (error) {
    return (
      <Card className="overflow-hidden">
        <div className="aspect-video bg-black flex flex-col items-center justify-center text-white gap-4 p-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-lg font-semibold">Stream Unavailable</p>
          <p className="text-white/70 text-sm">{error}</p>
          <Button
            variant="ghost"
            className="text-white"
            onClick={() => location.reload()}
          >
            <RefreshCw className="h-5 w-5 mr-2" /> Retry
          </Button>
        </div>
      </Card>
    );
  }

  // ======================================================
  // MAIN PLAYER UI
  // ======================================================
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black group">

        {/* WebRTC container */}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ display: mode === "webrtc" ? "block" : "none" }}
        />

        {/* HLS video element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          style={{ display: mode === "hls" && !isAudioOnly ? "block" : "none" }}
          playsInline
          muted={isMuted}
          autoPlay
        />

        {/* AUDIO ONLY */}
        {isAudioOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <Radio className="h-10 w-10" />
            <p className="text-lg">Audio-only mode</p>
          </div>
        )}

        {/* LOADING */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white gap-2">
            <Loader className="h-6 w-6 animate-spin" />
            Connecting…
          </div>
        )}

        {/* LIVE badge */}
        <div className="absolute top-4 left-4 bg-red-600 px-3 py-1.5 rounded-full text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {isLive ? "LIVE" : "OFFLINE"}
        </div>

        {/* Viewers */}
        {isLive && (
          <div className="absolute top-4 right-4 bg-black/40 px-3 py-1.5 rounded-full text-white">
            {viewerCount} watching
          </div>
        )}

        {/* CONTROLS */}
        <div className="absolute bottom-0 left-0 right-0 pb-3 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity px-4">

          {/* DVR Progress (HLS only) */}
          {mode === "hls" && (
            <Slider
              value={[seekValue]}
              max={100}
              step={0.1}
              onValueChange={onSeek}
              className="mb-3"
            />
          )}

          <div className="flex items-center justify-between">

            {/* Left section */}
            <div className="flex items-center gap-3 text-white">

              {/* Play/Pause */}
              <Button
                size="icon"
                variant="ghost"
                className="text-white"
                onClick={togglePlay}
              >
                {isPlaying ? <Pause /> : <Play />}
              </Button>

              {/* Live edge button */}
              {!liveEdge && mode === "hls" && (
                <Button
                  size="sm"
                  className="bg-red-600 text-white"
                  onClick={jumpToLive}
                >
                  <SkipForward className="h-4 w-4 mr-1" /> Go Live
                </Button>
              )}

              {/* Mute */}
              <Button
                size="icon"
                variant="ghost"
                className="text-white"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX /> : <Volume2 />}
              </Button>

              {/* Volume slider */}
              <Slider
                value={volume}
                onValueChange={changeVolume}
                max={100}
                step={1}
                className="w-24"
              />
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-3 text-white">

              {/* Audio only */}
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleAudioOnly}
                className="text-white"
              >
                <Radio />
              </Button>

              {/* PiP */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => videoRef.current?.requestPictureInPicture()}
                className="text-white"
              >
                <MonitorDown />
              </Button>

              {/* Fullscreen */}
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white"
              >
                <Maximize />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
