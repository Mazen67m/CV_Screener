import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d2f3e]">
      <SignIn />
    </div>
  )
}
