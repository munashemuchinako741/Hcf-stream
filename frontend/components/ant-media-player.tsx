"use client";

import { useEffect, useRef } from "react";

export default function AntMediaPlayer({
  streamId,
  httpBaseURL,
  token = "",
  autoplay = true,
  mute = true,
  playOrder = "webrtc,hls",
  playType = "mp4,webm",
  targetLatency = 3,
  is360 = false,
}: {
  streamId: string;
  httpBaseURL: string;
  token?: string;
  autoplay?: boolean;
  mute?: boolean;
  playOrder?: string;
  playType?: string;
  targetLatency?: number;
  is360?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let player: any;

    async function loadPlayer() {
      // Import INSIDE useEffect → client only
      const { WebPlayer } = await import("@antmedia/web_player");

      if (!containerRef.current) return;

      const normalizedURL = httpBaseURL.endsWith("/")
        ? httpBaseURL
        : httpBaseURL + "/";

      player = new WebPlayer(
        {
          streamId,
          httpBaseURL: normalizedURL,
          token,
          autoplay: true,
          mute: true,
          playOrder: "hls,webrtc",
          playType: "mp4,webm",
        },
        containerRef.current,
        null
      );

      await player.initialize();
      player.play();
    }

    loadPlayer();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [streamId, httpBaseURL, token]);

  return (
    <div
      id="video_container"
      ref={containerRef}
      className="w-full h-full bg-black"
    />
  );
}
