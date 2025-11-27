"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { AdminStats } from "@/components/admin-stats"
import { StreamControls } from "@/components/stream-controls"
import { RecentActivity } from "@/components/recent-activity"
import { ScheduleManager } from "@/components/schedule-manager"
import { VideoUpload } from "@/components/video-upload"
import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Upload, BarChart3, Radio, Calendar, Activity, Users, Search, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface User {
  id: number
  email: string
  username: string
  role: string
  isApproved: boolean
  createdAt: string
  updatedAt: string
}

function AdminPageContent() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setLoadingUsers(false)
        return
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleApproveUser = async (userId: number, isApproved: boolean) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isApproved })
      })
      if (response.ok) {
        await fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update user approval:', error)
    }
  }

  const handleSetRole = async (userId: number, role: string) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role })
      })
      if (response.ok) {
        await fetchUsers() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter(user =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof User]
      let bValue: any = b[sortBy as keyof User]

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    }
  }, [activeTab])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground leading-relaxed">Manage your live streams and content</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger value="stream" className="flex items-center gap-2">
                <Radio className="h-4 w-4" />
                <span className="hidden sm:inline">Stream</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Schedule</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <AdminStats />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Search and Sort Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt">Join Date</SelectItem>
                          <SelectItem value="username">Name</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="role">Role</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-3"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {loadingUsers ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading users...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAndSortedUsers.length === 0 && users.length > 0 ? (
                        <p className="text-center text-muted-foreground py-8">No users match your search criteria</p>
                      ) : (
                        filteredAndSortedUsers.map((user) => (
                        <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{user.username}</p>
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                              <Badge variant={user.isApproved ? 'default' : 'destructive'}>
                                {user.isApproved ? 'Approved' : 'Pending'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground">
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:min-w-fit">
                            {!user.isApproved && (
                              <Button
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => handleApproveUser(user.id, true)}
                              >
                                Approve
                              </Button>
                            )}
                            {user.isApproved && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => handleApproveUser(user.id, false)}
                              >
                                Unapprove
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => handleSetRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                            >
                              {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </Button>
                          </div>
                        </div>
                        ))
                      )}
                      {users.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No users found</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Sermon Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <VideoUpload />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stream" className="space-y-6">
              <StreamControls />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <ScheduleManager />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <RecentActivity />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminPageContent />
    </ProtectedRoute>
  )
}
