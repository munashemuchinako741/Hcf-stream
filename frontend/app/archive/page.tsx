"use client"

import { NavigationHeader } from "@/components/navigation-header"
import { ArchiveGrid } from "@/components/archive-grid"
import { ArchiveFilters } from "@/components/archive-filters"
import { ProtectedRoute } from "@/components/protected-route"

function ArchivePageContent() {

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Sermon Archive</h1>
            <p className="text-muted-foreground leading-relaxed">Browse our collection of past sermons and messages</p>
          </div>

          <ArchiveFilters />
          <ArchiveGrid />
        </div>
      </main>
    </div>
  )
}

export default function ArchivePage() {
  return (
    <ProtectedRoute>
      <ArchivePageContent />
    </ProtectedRoute>
  )
}
