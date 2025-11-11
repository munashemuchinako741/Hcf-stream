"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
  isLiveComment?: boolean
}

export function StreamChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, user } = useAuth()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !isAuthenticated) return

    const message: ChatMessage = {
      id: Math.random().toString(),
      user: user?.name || "Anonymous",
      message: newMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, message])
    setNewMessage("")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <Card className="h-full min-h-[400px] max-h-[600px] sm:h-[500px] md:h-[600px] flex flex-col">
      <CardHeader className="border-b border-border px-3 py-3 sm:px-4 sm:py-4">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          Live Chat
          <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium bg-destructive/20 text-destructive animate-pulse">
            LIVE
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
          <div className="space-y-3 sm:space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{msg.user}</span>
                  {msg.isLiveComment && (
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-destructive/20 text-destructive">
                      LIVE
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatTime(msg.timestamp)}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed break-words">{msg.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 sm:p-4">
          {isAuthenticated ? (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Send a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button type="submit" size="icon" disabled={!newMessage.trim()} className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Sign in to join the chat</p>
              <Button size="sm" variant="outline" asChild>
                <a href="/login">Sign in</a>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
