"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play } from "lucide-react";
import Link from "next/link";

interface RelatedVideo {
  id: number;
  title: string;
  speaker: string;
  duration: number;
  thumbnailUrl: string;
  category: string;
  createdAt: string;
}

export function RelatedVideos({ currentVideoId }: { currentVideoId: string }) {
  const [videos, setVideos] = useState<RelatedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/archive/related/${currentVideoId}`);
        const data = await res.json();
        setVideos(data.related || []);
      } catch {
        setVideos([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentVideoId]);

  if (loading) return <Card className="p-4">Loading...</Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Related Sermons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {videos.map((video) => (
          <Link key={video.id} href={`/archive/${video.id}`}>
            <div className="flex gap-3 group cursor-pointer">
              <div className="relative w-40 aspect-video bg-muted rounded overflow-hidden flex-shrink-0">
                <img
                  src={video.thumbnailUrl || "/placeholder.svg"}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-semibold text-sm leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
                  {video.title}
                </h4>
                <p className="text-xs text-muted-foreground">{video.speaker}</p>
              </div>
            </div>
          </Link>
        ))}

        {videos.length === 0 && (
          <p className="text-sm text-muted-foreground">No related videos found</p>
        )}
      </CardContent>
    </Card>
  );
}
