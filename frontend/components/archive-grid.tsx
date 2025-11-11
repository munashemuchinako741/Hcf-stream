import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Calendar, Eye } from "lucide-react"
import Link from "next/link"

interface ArchivedStream {
  id: string
  title: string
  speaker: string
  date: string
  duration: string
  views: number
  thumbnail: string
  category: string
}

const archivedStreams: ArchivedStream[] = [
  {
    id: "1",
    title: "The Power of Faith in Difficult Times",
    speaker: "Pastor John Smith",
    date: "Jan 28, 2025",
    duration: "1:23:45",
    views: 1247,
    thumbnail: "/church-sermon-faith.png",
    category: "Sunday Service",
  },
  {
    id: "2",
    title: "Walking in God's Purpose",
    speaker: "Pastor John Smith",
    date: "Jan 21, 2025",
    duration: "1:15:32",
    views: 1089,
    thumbnail: "/church-worship-purpose.jpg",
    category: "Sunday Service",
  },
  {
    id: "3",
    title: "New Year, New Beginnings",
    speaker: "Pastor John Smith",
    date: "Jan 7, 2025",
    duration: "1:28:15",
    views: 2134,
    thumbnail: "/church-new-year-celebration.jpg",
    category: "Special Event",
  },
  {
    id: "4",
    title: "The Gift of Grace",
    speaker: "Pastor John Smith",
    date: "Dec 24, 2024",
    duration: "1:18:42",
    views: 3421,
    thumbnail: "/church-christmas-grace.jpg",
    category: "Special Event",
  },
  {
    id: "5",
    title: "Building Strong Foundations",
    speaker: "Pastor John Smith",
    date: "Dec 17, 2024",
    duration: "1:21:08",
    views: 987,
    thumbnail: "/church-foundation-building.jpg",
    category: "Sunday Service",
  },
  {
    id: "6",
    title: "Love in Action",
    speaker: "Pastor John Smith",
    date: "Dec 10, 2024",
    duration: "1:16:55",
    views: 1156,
    thumbnail: "/church-love-community.jpg",
    category: "Sunday Service",
  },
]

export function ArchiveGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {archivedStreams.map((stream) => (
        <Link key={stream.id} href={`/archive/${stream.id}`}>
          <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="relative aspect-video bg-muted">
              <img
                src={stream.thumbnail || "/placeholder.svg"}
                alt={stream.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                  <Play className="h-6 w-6 text-primary-foreground ml-1" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium">
                {stream.duration}
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <h3 className="font-semibold leading-relaxed text-balance line-clamp-2 group-hover:text-primary transition-colors">
                  {stream.title}
                </h3>
                <p className="text-sm text-muted-foreground">{stream.speaker}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{stream.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{stream.views.toLocaleString()}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {stream.category}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
