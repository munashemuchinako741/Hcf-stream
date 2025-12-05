"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { io, Socket } from "socket.io-client"

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
  const [isConnected, setIsConnected] = useState(false)
  const [isStreamLive, setIsStreamLive] = useState(false)
  const [streamTitle, setStreamTitle] = useState("Live Stream")
  const scrollRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<Socket | null>(null)
  const { isAuthenticated, user } = useAuth()

  // Fetch stream status from backend
  useEffect(() => {
    const fetchStreamStatus = async () => {
      try {
        const response = await fetch('/api/live-stream/current-stream', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setIsStreamLive(data.isLive)
          setStreamTitle(data.title || "Live Stream")
        }
      } catch (error) {
        console.error('Failed to fetch stream status:', error)
        setIsStreamLive(false)
        setStreamTitle("Live Stream")
      }
    }

    // Fetch initial status
    fetchStreamStatus()

    // Poll for status updates every 30 seconds
    const interval = setInterval(fetchStreamStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  // Socket.IO connection and message handling
  useEffect(() => {
    if (isAuthenticated) {
      // Connect to Socket.IO server
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000', {
        withCredentials: true,
      })
      socketRef.current = socket

      // Handle connection
      socket.on('connect', () => {
        setIsConnected(true)
        if (user?.name) {
          socket.emit('join-chat', { user: user.name })
        }
      })

      // Handle connection error
      socket.on('connect_error', (error) => {
        setIsConnected(false)
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        setIsConnected(false)
      })

      // Handle incoming messages
      socket.on('new-message', (message: ChatMessage) => {
        setMessages((prev) => [...prev, message])
      })

      // Cleanup on unmount
      return () => {
        socket.disconnect()
      }
    }
  }, [isAuthenticated, user])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !isAuthenticated || !socketRef.current || !user?.name) {
      return
    }


    // Send message via Socket.IO
    socketRef.current.emit('send-message', {
      user: user.name,
      message: newMessage.trim()
    })

    setNewMessage("")
  }

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleTimeString("en-US", {
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
