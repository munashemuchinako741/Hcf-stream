export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-primary">403</div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this resource. 
          If you believe this is a mistake, please contact an administrator.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <a 
            href="/live" 
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition"
          >
            Go to Live Stream
          </a>
          <a 
            href="/archive" 
            className="px-6 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 transition"
          >
            Browse Archive
          </a>
        </div>
      </div>
    </div>
  )
}
