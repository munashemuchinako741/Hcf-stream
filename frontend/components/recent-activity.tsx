import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"

interface ActivityItem {
  id: string
  type: "stream" | "user" | "comment"
  message: string
  timestamp: string
}

const activities: ActivityItem[] = [
  {
    id: "1",
    type: "stream",
    message: "Stream started: Sunday Morning Service",
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    type: "user",
    message: "New user registered: Sarah Johnson",
    timestamp: "3 hours ago",
  },
  {
    id: "3",
    type: "comment",
    message: "New comment on 'The Power of Faith'",
    timestamp: "5 hours ago",
  },
  {
    id: "4",
    type: "stream",
    message: "Stream ended: Wednesday Prayer Meeting",
    timestamp: "1 day ago",
  },
  {
    id: "5",
    type: "user",
    message: "New user registered: Michael Brown",
    timestamp: "1 day ago",
  },
]

export function RecentActivity() {
  const getTypeBadge = (type: ActivityItem["type"]) => {
    switch (type) {
      case "stream":
        return <Badge variant="default">Stream</Badge>
      case "user":
        return <Badge variant="secondary">User</Badge>
      case "comment":
        return <Badge variant="outline">Comment</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start justify-between gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getTypeBadge(activity.type)}
                  <span className="text-sm text-muted-foreground">{activity.timestamp}</span>
                </div>
                <p className="text-sm leading-relaxed">{activity.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
