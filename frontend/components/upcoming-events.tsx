import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock } from "lucide-react"

interface Event {
  id: string
  title: string
  date: string
  time: string
  type: "service" | "special" | "prayer"
}

const events: Event[] = [
  {
    id: "1",
    title: "Sunday Morning Service",
    date: "Every Sunday",
    time: "10:00 AM",
    type: "service",
  },
  {
    id: "2",
    title: "Wednesday Prayer Meeting",
    date: "Every Wednesday",
    time: "7:00 PM",
    type: "prayer",
  },
  {
    id: "3",
    title: "Youth Service",
    date: "Every Friday",
    time: "6:30 PM",
    type: "special",
  },
]

export function UpcomingEvents() {
  const getTypeBadge = (type: Event["type"]) => {
    switch (type) {
      case "service":
        return <Badge variant="default">Service</Badge>
      case "special":
        return <Badge variant="secondary">Special Event</Badge>
      case "prayer":
        return <Badge variant="outline">Prayer</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm leading-relaxed">{event.title}</h4>
                  {getTypeBadge(event.type)}
                </div>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>{event.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
