import BLOG from '@/blog.config'
import { verifyInviteCode } from '@/lib/invitation'
import { redisClient } from '@/lib/cache/redis_cache'

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

  const storeUrl =
    process.env.NEXT_PUBLIC_INVITATION_STORE_URL ||
    BLOG.INVITATION_STORE_URL ||
    'https://ldcstore.com'

  const priceLdc =
    process.env.NEXT_PUBLIC_INVITATION_PRICE_LDC ||
    BLOG.INVITATION_PRICE_LDC ||
    99

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
        verified: false,
        needPurchase: true,
        storeUrl,
        priceLdc,
        message: '请填写邀请码后再注册。若未获得邀请码，请前往 LDstore 购买。'
      })
    }

    // 调用验证核心（同时兼容算法签名码和静态口令）
    const result = verifyInviteCode(code)

    if (result.valid) {
      // 若使用算法码且配置了 Redis，校验是否已被兑换使用（一码一人防重复）
      const hasRedis = !!(BLOG.REDIS_URL && typeof redisClient?.get === 'function')
      if (hasRedis && result.type === 'algorithm' && result.code) {
        try {
          const usedKey = `notion_used_invite:${result.code}`
          const isUsed = await redisClient.get(usedKey)
          if (isUsed) {
            return res.status(400).json({
              success: false,
              verified: false,
              needPurchase: true,
              storeUrl,
              priceLdc,
              message: '该邀请码已被使用，请在 LDstore 购买新的专属邀请码'
            })
          }
          // 标记已使用，保留 180 天
          await redisClient.set(
            usedKey,
            JSON.stringify({ usedAt: Date.now() }),
            'EX',
            180 * 86400
          )
        } catch (e) {
          console.warn('Redis 校验邀请码使用状态异常，已自动降级通过:', e)
        }
      }

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
        message: result.message || '邀请码验证成功'
      })
    } else {
      return res.status(400).json({
        success: false,
        verified: false,
        needPurchase: true,
        storeUrl,
        priceLdc,
        message: result.message || '邀请码错误或已失效，请核对或前往 LDstore 购买'
      })
    }
  }

  // 不支持的其他 HTTP 方法
  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
}
