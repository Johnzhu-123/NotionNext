// pages/auth/sign-in/[[...index]].js
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <SignIn
      path="/auth/sign-in"
      routing="path"
      signInUrl="/auth/sign-in"
    />
  )
}
