"use client";

import { NavigationHeader } from "@/components/navigation-header";
import LiveStreamPlayer from "@/components/live-stream-player";
import { StreamChat } from "@/components/stream-chat";
import { ProtectedRoute } from "@/components/protected-route";
import { useSearchParams } from "next/navigation";

function LivePageContent() {
  const searchParams = useSearchParams();
  const antBaseURL = process.env.NEXT_PUBLIC_ANT_BASE_URL;


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavigationHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Player */}
          <div className="lg:col-span-2 space-y-6">
            <div className="w-full rounded-lg overflow-hidden bg-black">
              <LiveStreamPlayer streamKey="church" /> {/* ✔ Correct usage */}
            </div>
          </div>

          {/* Chat */}
          <div className="lg:col-span-1">
            <StreamChat />
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 HCF Live Stream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function LivePage() {
  return (
    <ProtectedRoute>
      <LivePageContent />
    </ProtectedRoute>
  );
}
