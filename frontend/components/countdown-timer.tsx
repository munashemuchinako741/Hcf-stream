"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock } from "lucide-react"
import Link from "next/link"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface UpcomingEvent {
  id: string
  title: string
  date: string
  time: string
  type: string
}

export function CountdownTimer() {
  // Next Sunday at 9:00 AM as fallback
  const getNextSunday = () => {
    const now = new Date()
    const nextSunday = new Date(now)
    nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7))
    nextSunday.setHours(9, 0, 0, 0)
    return nextSunday
  }

  const [targetDate, setTargetDate] = useState<Date>(getNextSunday())
  const [eventTitle, setEventTitle] = useState<string>("Next Live Service")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const fetchNextEvent = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/live-stream/upcoming-events')
        if (!response.ok) {
          throw new Error('Failed to fetch upcoming events')
        }
        const data = await response.json()

        if (data.events && data.events.length > 0) {
          const nextEvent: UpcomingEvent = data.events[0]
          // Parse the date and time from the event
          const eventDateTime = new Date(`${nextEvent.date} ${nextEvent.time}`)
          setTargetDate(eventDateTime)
          setEventTitle(nextEvent.title)
        } else {
          // No upcoming events, use fallback
          setTargetDate(getNextSunday())
          setEventTitle("Next Live Service")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        // On error, use fallback
        setTargetDate(getNextSunday())
        setEventTitle("Next Live Service")
      } finally {
        setLoading(false)
      }
    }

    fetchNextEvent()
  }, [])

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime()

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        })
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading countdown...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Next Live Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Unable to load countdown</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {eventTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">{timeLeft.days}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">Days</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">{timeLeft.hours}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">Hours</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">{timeLeft.minutes}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">Minutes</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-primary">{timeLeft.seconds}</div>
            <div className="text-xs text-muted-foreground uppercase mt-1">Seconds</div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {targetDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {targetDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "GMT"
              })} GMT
            </span>
          </div>
        </div>

        <Link href="/live" className="block">
          <Button className="w-full">Set Reminder</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
