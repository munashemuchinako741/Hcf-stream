"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Menu, User, Video } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"

export function NavigationHeader() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Video className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground">HCF Live</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/live" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Live
          </Link>
          <Link href="/archive" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Archive
          </Link>
          <Link href="/about" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            About
          </Link>
          {isAuthenticated && (
            <Link href="/admin" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
              Admin
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin">Admin Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                <Link
                  href="/live"
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors px-4 py-3 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/20"
                >
                  Live
                </Link>
                <Link
                  href="/archive"
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors px-4 py-3 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/20"
                >
                  Archive
                </Link>
                <Link
                  href="/about"
                  className="text-lg font-medium text-foreground hover:text-primary transition-colors px-4 py-3 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/20"
                >
                  About
                </Link>
                {isAuthenticated && (
                  <Link
                    href="/admin"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors px-4 py-3 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/20"
                  >
                    Admin
                  </Link>
                )}
                {!isAuthenticated && (
                  <Link
                    href="/login"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors px-4 py-3 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/20"
                  >
                    Log in
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>


    </header>
  )
}
