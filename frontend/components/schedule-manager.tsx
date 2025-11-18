"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Plus, Trash2 } from "lucide-react"

interface ScheduledEvent {
  id: number
  title: string
  description?: string
  scheduledAt: string
  createdAt: string
}

export function ScheduleManager() {
  const [events, setEvents] = useState<ScheduledEvent[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [newEvent, setNewEvent] = useState({ title: "", description: "", scheduledAt: "" })

  // Fetch scheduled events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch('/api/admin/schedule', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events)
        }
      } catch (error) {
        console.error('Failed to fetch scheduled events:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const handleAddEvent = async () => {
    if (newEvent.title && newEvent.scheduledAt) {
      const token = localStorage.getItem("token")
      if (!token) return

      try {
        const res = await fetch('/api/admin/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newEvent)
        })

        if (res.ok) {
          const data = await res.json()
          setEvents([...events, data.event])
          setNewEvent({ title: "", description: "", scheduledAt: "" })
          setIsDialogOpen(false)
        } else {
          const error = await res.json()
          alert(`Failed to schedule event: ${error.error}`)
        }
      } catch (error) {
        console.error('Failed to schedule event:', error)
        alert('Failed to schedule event')
      }
    }
  }

  const handleDeleteEvent = async (id: number) => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      const res = await fetch(`/api/admin/schedule/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        setEvents(events.filter((event) => event.id !== id))
      } else {
        const error = await res.json()
        alert(`Failed to delete event: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('Failed to delete event')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-3 border border-border rounded-lg">
                <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                <div className="h-3 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Manager
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Event</DialogTitle>
                <DialogDescription>Add a new event to your streaming schedule</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="event-title">Event Title</Label>
                  <Input
                    id="event-title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Sunday Morning Service"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-description">Description (Optional)</Label>
                  <Input
                    id="event-description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Join us for worship and teaching"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-scheduledAt">Scheduled Date & Time</Label>
                  <Input
                    id="event-scheduledAt"
                    type="datetime-local"
                    value={newEvent.scheduledAt}
                    onChange={(e) => setNewEvent({ ...newEvent, scheduledAt: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddEvent} className="w-full">
                  Add Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">{event.title}</h4>
                {event.description && (
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(event.scheduledAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDeleteEvent(event.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scheduled events</p>
              <p className="text-sm">Add your first event to get started</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
