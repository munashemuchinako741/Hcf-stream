import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Eye, Video, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"

interface AdminStats {
  totalViews: string
  activeViewers: string
  totalStreams: string
  engagementRate: string
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalViews: "0",
    activeViewers: "0",
    totalStreams: "0",
    engagementRate: "0%"
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statItems = [
    {
      title: "Total Views",
      value: stats.totalViews,
      change: "+12.5%",
      icon: Eye,
      trend: "up",
    },
    {
      title: "Active Viewers",
      value: stats.activeViewers,
      change: "+8.2%",
      icon: Users,
      trend: "up",
    },
    {
      title: "Total Streams",
      value: stats.totalStreams,
      change: "+4 this month",
      icon: Video,
      trend: "up",
    },
    {
      title: "Engagement Rate",
      value: stats.engagementRate,
      change: "+5.1%",
      icon: TrendingUp,
      trend: "up",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((stat) => (
        <Card key={stat.title} className="hover:text-primary transition-colors px-4 py-2 rounded-md hover:bg-amber-300 dark:hover:bg-amber-900/20">
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
