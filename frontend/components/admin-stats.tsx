import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Eye, Video, TrendingUp } from "lucide-react"

const stats = [
  {
    title: "Total Views",
    value: "12,847",
    change: "+12.5%",
    icon: Eye,
    trend: "up",
  },
  {
    title: "Active Viewers",
    value: "247",
    change: "+8.2%",
    icon: Users,
    trend: "up",
  },
  {
    title: "Total Streams",
    value: "156",
    change: "+4 this month",
    icon: Video,
    trend: "up",
  },
  {
    title: "Engagement Rate",
    value: "68.4%",
    change: "+5.1%",
    icon: TrendingUp,
    trend: "up",
  },
]

export function AdminStats() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>{stat.change}</span> from last
              month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
