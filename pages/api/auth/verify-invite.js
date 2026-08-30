import BLOG from '@/blog.config'
import { verifyInviteCode } from '@/lib/invitation'

/**
 * 注册邀请码验证 API
 * 支持算法签名批量邀请码与静态邀请码
 * @param req
 * @param res
 */
export default async function handler(req, res) {
  const isEnabled =
    process.env.NEXT_PUBLIC_ENABLE_INVITATION_CODE !== 'false' &&
    BLOG.ENABLE_INVITATION_CODE !== false

  // 如果未启用邀请码功能，直接视为已验证
  if (!isEnabled) {
    return res.status(200).json({
      success: true,
      verified: true,
      message: '未启用邀请码验证'
    })
  }

  // GET 请求：检查当前是否已通过验证
  if (req.method === 'GET') {
    const verifiedCookie = req.cookies?.notion_invite_verified
    if (verifiedCookie === 'true') {
      return res.status(200).json({ verified: true })
    }
    return res.status(200).json({ verified: false })
  }

  // POST 请求：提交邀请码进行验证
  if (req.method === 'POST') {
    const { code } = req.body || {}

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: '请输入邀请码'
      })
    }

    // 调用验证核心
    const result = verifyInviteCode(code)

    if (result.valid) {
      const maxAge = BLOG.INVITATION_COOKIE_EXPIRE || 86400
      const isProduction = process.env.NODE_ENV === 'production'
      const cookieOptions = [
        `notion_invite_verified=true`,
        `Path=/`,
        `Max-Age=${maxAge}`,
        `SameSite=Lax`,
        isProduction ? 'Secure' : ''
      ]
        .filter(Boolean)
        .join('; ')

      res.setHeader('Set-Cookie', cookieOptions)

      return res.status(200).json({
        success: true,
        verified: true,
        type: result.type,
        message: '邀请码验证成功'
      })
    } else {
      return res.status(400).json({
        success: false,
        verified: false,
        message: result.message || '邀请码错误或已失效，请核对后重试'
      })
    }
  }

  // 不支持的其他 HTTP 方法
  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
}
