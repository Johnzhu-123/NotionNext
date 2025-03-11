// pages/auth/sign-in.js
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn
        path="/auth/sign-in"
        routing="path"
        signInUrl="/auth/sign-in"
      />
    </div>
  )
}
