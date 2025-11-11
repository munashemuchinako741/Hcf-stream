import { NavigationHeader } from "@/components/navigation-header"
import { Card } from "@/components/ui/card"
import { Heart, Users, Video, Globe } from "lucide-react"


export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">About HCF Live</h1>
          <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
            Bringing our church community together through live streaming and archived sermons, making worship
            accessible to everyone, everywhere.
          </p>
        </div>

        {/* Mission Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Our Mission</h3>
                <p className="text-muted-foreground leading-relaxed">
                  To spread the word of God and connect our community through accessible, high-quality live streaming
                  services and archived content.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Our Community</h3>
                <p className="text-muted-foreground leading-relaxed">
                  A growing family of believers united in faith, supporting each other through worship, prayer, and
                  fellowship both online and in person.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Live Streaming</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Experience our services in real-time with high-quality video, interactive chat, and the ability to
                  engage with our community from anywhere.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Global Reach</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Connecting believers across the world, breaking down geographical barriers to make worship accessible
                  to all who seek it.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Story Section */}
        <div className="max-w-3xl mx-auto">
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                HCF Live was born from a simple vision: to ensure that no one misses out on worship and spiritual growth
                due to distance, health, or other circumstances.
              </p>
              <p>
                What started as a response to the need for remote worship has grown into a thriving platform that serves
                our community 24/7. Through live streaming, archived sermons, and interactive features, we've created a
                digital sanctuary where faith flourishes.
              </p>
              <p>
                Today, we continue to innovate and improve our platform, always keeping our community's needs at the
                heart of everything we do. Whether you're joining us live on Sunday morning or catching up on a sermon
                during your lunch break, we're here to support your spiritual journey.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
