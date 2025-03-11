// pages/sign-up.js
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <SignUp
      path="/auth/sign-up"
      routing="path"
      signInUrl="/auth/sign-in"
      signUpUrl="/auth/sign-up"
    />
  )
}
