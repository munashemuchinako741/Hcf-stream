import { ResetPasswordForm } from "@/components/reset-password-form"
import { NavigationHeader } from "@/components/navigation-header"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavigationHeader />
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Set new password</h1>
            <p className="text-muted-foreground">Enter your new password below</p>
          </div>
          <ResetPasswordForm />
        </div>
      </main>
    </div>
  )
}

// Force dynamic rendering to avoid prerendering issues with useSearchParams
export const dynamic = 'force-dynamic'
