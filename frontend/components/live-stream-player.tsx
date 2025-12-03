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
  Radio,
  AlertCircle,
  SkipForward,
  MonitorDown,
} from "lucide-react";

import Hls from "hls.js";

// ------------------------------------------------------
// SRS STREAM CONFIG
// ------------------------------------------------------
const SRS_WEBRTC_WHEP = "http://54.227.11.207:1985/rtc/v1/whep/";
const SRS_HLS_ROOT = "http://54.227.11.207:8080/live/";

interface Props {
  streamKey: string; // required for SRS (church_ssl)
}

export default function LiveStreamPlayer({ streamKey }: Props) {
  const [mode, setMode] = useState<"webrtc" | "hls">("webrtc");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState<number[]>([75]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const webrtcRef = useRef<RTCPeerConnection | null>(null);

  // ======================================================
  // INITIALIZE PLAYER (WebRTC → HLS Fallback)
  // ======================================================
  useEffect(() => {
    startWebRTC();

    return () => {
      if (webrtcRef.current) webrtcRef.current.close();
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [streamKey]);

  // ======================================================
  // START SRS WEBRTC (WHEP)
  // ======================================================
  const startWebRTC = async () => {
    try {
      setMode("webrtc");
      setIsLoading(true);
      setError(null);

      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = false;
      video.playsInline = true;
      videoRef.current = video;

      // CLEAN CONTAINER
      containerRef.current!.innerHTML = "";
      containerRef.current!.appendChild(video);

      // Init PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      });

      pc.ontrack = (event) => {
        video.srcObject = event.streams[0];
        setIsLive(true);
        setIsLoading(false);
      };

      webrtcRef.current = pc;

      // OFFER
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const res = await fetch(
        `${SRS_WEBRTC_WHEP}?app=live&stream=${streamKey}`,
        {
          method: "POST",
          body: offer.sdp,
        }
      );

      if (!res.ok) throw new Error("WHEP WebRTC failed");

      const answerSDP = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSDP });

      console.log("WebRTC Active with SRS");
    } catch (err) {
      console.warn("WebRTC failed → HLS fallback", err);
      startHLS();
    }
  };

  // ======================================================
  // START HLS FALLBACK
  // ======================================================
  const startHLS = () => {
    try {
      setMode("hls");
      setIsLoading(true);

      const video = videoRef.current!;
      const m3u8 = `${SRS_HLS_ROOT}${streamKey}.m3u8`;

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = m3u8;
      } else {
        const hls = new Hls();
        hls.loadSource(m3u8);
        hls.attachMedia(video);
        hlsRef.current = hls;
      }

      video.play();
      setIsLive(true);
      setIsLoading(false);
      console.log("HLS Active");
    } catch (err) {
      setError("Stream unavailable");
      setIsLoading(false);
    }
  };

  // ======================================================
  // CONTROLS
  // ======================================================
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.pause();
    else v.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changeVolume = (val: number[]) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val[0] / 100;
    setVolume(val);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else v.requestFullscreen();
  };

  // ======================================================
  // MAIN PLAYER UI
  // ======================================================
  if (error) {
    return (
      <Card className="overflow-hidden">
        <div className="aspect-video bg-black flex flex-col items-center justify-center text-white gap-4 p-6">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-lg font-semibold">Stream Unavailable</p>
          <p className="text-white/70 text-sm">{error}</p>
          <Button onClick={() => location.reload()}>
            <RefreshCw className="h-5 w-5 mr-2" /> Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-black group">

        {/* WebRTC Container */}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ display: mode === "webrtc" ? "block" : "none" }}
        />

        {/* HLS Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          style={{ display: mode === "hls" ? "block" : "none" }}
          playsInline
          autoPlay
          muted={isMuted}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white gap-2">
            <Loader className="h-6 w-6 animate-spin" />
            Connecting…
          </div>
        )}

        {/* LIVE Badge */}
        <div className="absolute top-4 left-4 bg-red-600 px-3 py-1.5 rounded-full text-white flex items-center gap-2">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {isLive ? "LIVE" : "OFFLINE"}
        </div>

        {/* CONTROLS */}
        <div className="absolute bottom-0 left-0 right-0 pb-3 bg-linear-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity px-4">

          <div className="flex items-center justify-between text-white">

            <div className="flex items-center gap-3">

              <Button size="icon" variant="ghost" onClick={togglePlay}>
                {isPlaying ? <Pause /> : <Play />}
              </Button>

              <Button size="icon" variant="ghost" onClick={toggleMute}>
                {isMuted ? <VolumeX /> : <Volume2 />}
              </Button>

              <Slider
                value={volume}
                onValueChange={changeVolume}
                max={100}
                step={1}
                className="w-24"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button size="icon" variant="ghost" onClick={toggleFullscreen}>
                <Maximize />
              </Button>
            </div>

          </div>
        </div>
      </div>
    </Card>
  );
}
