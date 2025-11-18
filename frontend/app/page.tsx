import { NavigationHeader } from "@/components/navigation-header"
import { Button } from "@/components/ui/button"
import { CountdownTimer } from "@/components/countdown-timer"
import { UpcomingEvents } from "@/components/upcoming-events"
import Link from "next/link"
import { Video, Calendar, Archive } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/mp-bg.jpg')" }}>
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center space-y-6 text-white">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
              Experience worship from anywhere
            </h1>
            <p className="text-lg md:text-xl text-white/90 leading-relaxed text-pretty">
              Join us live for sermons, worship services, and special events. Stay connected with our community no
              matter where you are.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/live">
                <Button size="lg" className="w-full sm:w-auto">
                  <Video className="mr-2 h-5 w-5" />
                  Watch Live
                </Button>
              </Link>
              <Link href="/archive">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                  <Archive className="mr-2 h-5 w-5" />
                  Browse Archive
                </Button>
              </Link>
            </div>
            </div>
          </div>
        </section>

        {/* Countdown & Schedule Section */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <CountdownTimer />
              <UpcomingEvents />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
                  <Video className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">Live Streaming</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Watch services in real-time with high-quality video and audio
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">Event Schedule</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Never miss a service with our upcoming events calendar
                </p>
              </div>
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground">
                  <Archive className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">Full Archive</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Access past sermons and messages anytime, anywhere
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 HCF Live Stream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
