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

export function CountdownTimer() {
  // Next Sunday at 10:00 AM
  const getNextSunday = () => {
    const now = new Date()
    const nextSunday = new Date(now)
    nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7))
    nextSunday.setHours(10, 0, 0, 0)
    return nextSunday
  }

  const [targetDate] = useState(getNextSunday())
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

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
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Next Live Service
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
            <span className="text-muted-foreground">10:00 AM EST</span>
          </div>
        </div>

        <Link href="/live" className="block">
          <Button className="w-full">Set Reminder</Button>
        </Link>
      </CardContent>
    </Card>
  )
}
