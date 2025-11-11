"use client"

import { useState } from "react"
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
  id: string
  title: string
  date: string
  time: string
}

export function ScheduleManager() {
  const [events, setEvents] = useState<ScheduledEvent[]>([
    { id: "1", title: "Sunday Morning Service", date: "2025-02-09", time: "10:00" },
    { id: "2", title: "Wednesday Prayer", date: "2025-02-05", time: "19:00" },
  ])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "" })

  const handleAddEvent = () => {
    if (newEvent.title && newEvent.date && newEvent.time) {
      setEvents([
        ...events,
        {
          id: Math.random().toString(),
          ...newEvent,
        },
      ])
      setNewEvent({ title: "", date: "", time: "" })
      setIsDialogOpen(false)
    }
  }

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((event) => event.id !== id))
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
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-time">Time</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
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
                <p className="text-xs text-muted-foreground">
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {event.time}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDeleteEvent(event.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
