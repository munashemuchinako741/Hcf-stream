import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play } from "lucide-react"
import Link from "next/link"

interface RelatedVideo {
  id: string
  title: string
  speaker: string
  duration: string
  thumbnail: string
}

const relatedVideos: RelatedVideo[] = [
  {
    id: "2",
    title: "Walking in God's Purpose",
    speaker: "Pastor John Smith",
    duration: "1:15:32",
    thumbnail: "/church-purpose.jpg",
  },
  {
    id: "5",
    title: "Building Strong Foundations",
    speaker: "Pastor John Smith",
    duration: "1:21:08",
    thumbnail: "/church-foundation.jpg",
  },
  {
    id: "6",
    title: "Love in Action",
    speaker: "Pastor John Smith",
    duration: "1:16:55",
    thumbnail: "/church-love.jpg",
  },
]

export function RelatedVideos({ currentVideoId }: { currentVideoId: string }) {
  const filteredVideos = relatedVideos.filter((v) => v.id !== currentVideoId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Related Sermons</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {filteredVideos.map((video) => (
          <Link key={video.id} href={`/archive/${video.id}`}>
            <div className="flex gap-3 group cursor-pointer">
              <div className="relative w-40 aspect-video bg-muted rounded overflow-hidden flex-shrink-0">
                <img
                  src={video.thumbnail || "/placeholder.svg"}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs text-white font-medium">
                  {video.duration}
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
      </CardContent>
    </Card>
  )
}
