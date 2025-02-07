// pages/edit/[[...index]].js

import { useUser } from '@clerk/nextjs'

export default function EditTestPage() {
  const { isSignedIn, user } = useUser()

  if (!isSignedIn) {
    return <div>抱歉，你还没有登录。请先去 /auth/sign-in 登录。</div>
  }

  return (
    <div>
      <h2>欢迎，只有已登录用户能看到这个编辑页面</h2>
      <p>当前用户ID: {user?.id}</p>
    </div>
  )
}
