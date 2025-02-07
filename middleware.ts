// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

/** 
 * 1) 只匹配所有非静态资源请求
 * 2) 其他 (/_next, .js, .css 等文件) 被排除 
 */
export const config = {
  matcher: [
    // 匹配所有非静态资源的请求
    '/((?!_next|.*\\..*).*)'
  ]
}

/** 已有的Tenant匹配 */
const isTenantRoute = createRouteMatcher([
  '/user/organization-selector(.*)',
  '/user/orgid/(.*)',
  '/dashboard',
  '/dashboard/(.*)'
])

/** 已有的Admin匹配 */
const isTenantAdminRoute = createRouteMatcher([
  '/admin/(.*)/memberships',
  '/admin/(.*)/domain'
])

/** 新增: 公共白名单 */
const isPublicPath = createRouteMatcher([
  // 登录注册相关
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/auth(.*)',
  // API 接口
  '/api(.*)',
  // 如果你想公开首页或其它页面, 可在此处添加, 例如:
  // '/',
  // '/about(.*)',
])

/** 如果没有配置 ClerkKey 的处理 */
const noAuthMiddleware = async (req: NextRequest) => {
  // 无 Clerk Key 就不做登录拦截
  return NextResponse.next()
}

const authMiddleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware(async (auth, req) => {
      const { userId } = auth()

      // 1) 如果是公共路径, 直接放行
      if (isPublicPath(req)) {
        return NextResponse.next()
      }

      // 2) 如果是Tenant路由, 需要登录
      if (isTenantRoute(req)) {
        if (!userId) {
          const url = new URL('/auth/sign-in', req.url)
          url.searchParams.set('redirectTo', req.url)
          return NextResponse.redirect(url)
        }
      }

      // 3) 如果是Admin路由, 需要特定权限
      if (isTenantAdminRoute(req)) {
        auth().protect((has) => {
          return (
            has({ permission: 'org:sys_memberships:manage' }) ||
            has({ permission: 'org:sys_domains_manage' })
          )
        })
      }

      // 4) 除上述外, 所有路由都需要登录
      if (!userId) {
        const url = new URL('/auth/sign-in', req.url)
        url.searchParams.set('redirectTo', req.url)
        return NextResponse.redirect(url)
      }

      // 已登录, 放行
      return NextResponse.next()
    })
  : noAuthMiddleware

export default authMiddleware
