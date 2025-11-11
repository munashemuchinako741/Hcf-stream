"use client"

import type React from "react"
import { SessionProvider } from "next-auth/react"
import { Analytics } from "@vercel/analytics/react"
import { AuthProvider } from "../lib/auth-context"
import "./globals.css"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SessionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
