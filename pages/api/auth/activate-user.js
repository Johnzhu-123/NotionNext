if (typeof self === 'undefined') {
  global.self = globalThis
}

import BLOG from '@/blog.config'
import { verifyInviteCode, signUserActivation, verifyUserActivation } from '@/lib/invitation'

/**
 * 开图通行证用户激活 API
 * 校验邀请码并将通行证数字签名与该用户永久绑定
 */
export default async function handler(req, res) {
  // 跨域支持 (支持 openlib.seeyjys.eu.org)
  const origin = req.headers.origin || ''
  if (
    origin === 'https://openlib.seeyjys.eu.org' ||
    origin.endsWith('.seeyjys.eu.org')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const isEnabled =
    process.env.NEXT_PUBLIC_ENABLE_INVITATION_CODE !== 'false' &&
    BLOG.ENABLE_INVITATION_CODE !== false

  const storeUrl =
    process.env.NEXT_PUBLIC_INVITATION_STORE_URL ||
    BLOG.INVITATION_STORE_URL ||
    'https://ldcstore.com/product/12974'

  const priceLdc =
    process.env.NEXT_PUBLIC_INVITATION_PRICE_LDC ||
    BLOG.INVITATION_PRICE_LDC ||
    99

  // 管理员账号自动免除邀请码激活
  const ADMIN_EMAILS = ['shuiwu@jxnu.edu.cn']

  // 若功能未启用，默认所有用户已激活
  if (!isEnabled) {
    return res.status(200).json({
      success: true,
      is_activated: true,
      message: '未启用邀请码门禁'
    })
  }

  // GET: 检查当前用户是否已激活
  if (req.method === 'GET') {
    const { userId, email, signature, inviteCode } = req.query || {}

    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(200).json({ is_activated: true, isAdmin: true })
    }

    if (!userId) {
      return res.status(400).json({ is_activated: false, message: '缺少 userId 参数' })
    }

    // 1. 若客户端携带了合法签名，直接常数时间验证
    if (signature && inviteCode) {
      const isValidSig = verifyUserActivation(userId, inviteCode, signature)
      if (isValidSig) {
        return res.status(200).json({ is_activated: true })
      }
    }

    // 2. 若配置了 Redis，从 Redis 查询激活记录
    if (BLOG.REDIS_URL) {
      try {
        const { redisClient } = await import('@/lib/cache/redis_cache')
        if (typeof redisClient?.get === 'function') {
          const userKey = `notion_active_user:${userId}`
          const activeRecord = await redisClient.get(userKey)
          if (activeRecord) {
            return res.status(200).json({ is_activated: true })
          }
        }
      } catch (err) {
        console.warn('Redis 查询用户激活状态失败:', err)
      }
    }

    return res.status(200).json({ is_activated: false })
  }

  // POST: 提交邀请码激活该账号
  if (req.method === 'POST') {
    const { userId, code, username, email } = req.body || {}

    // 管理员账号免激活
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      const adminSignature = signUserActivation(userId, 'ADMIN')
      return res.status(200).json({
        success: true,
        is_activated: true,
        invite_code: 'ADMIN',
        signature: adminSignature,
        activated_at: Date.now(),
        message: '管理员账号已直接免激活'
      })
    }

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({
        success: false,
        is_activated: false,
        message: '未检测到登录用户身份凭证，请先登录'
      })
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        is_activated: false,
        needPurchase: true,
        storeUrl,
        priceLdc,
        message: '请填写有效邀请码以激活开图通行证'
      })
    }

    // 校验邀请码算法签名与通用码
    const result = verifyInviteCode(code)

    if (result.valid) {
      const canonicalCode = result.code || code.trim().toUpperCase()

      // 若配置了 Redis，核验该邀请码是否已被消耗
      if (BLOG.REDIS_URL && result.type === 'algorithm') {
        try {
          const { redisClient } = await import('@/lib/cache/redis_cache')
          if (typeof redisClient?.get === 'function') {
            const usedKey = `notion_used_invite:${canonicalCode}`
            const usedRecord = await redisClient.get(usedKey)
            if (usedRecord) {
              const parsed = JSON.parse(usedRecord)
              // 如果已经被其他用户使用
              if (parsed.userId && parsed.userId !== userId) {
                return res.status(400).json({
                  success: false,
                  is_activated: false,
                  needPurchase: true,
                  storeUrl,
                  priceLdc,
                  message: '该邀请码已被其他用户激活绑定，请前往 LDstore 购买新的专属邀请码'
                })
              }
            }
            // 标记已使用并绑定此用户
            await redisClient.set(
              usedKey,
              JSON.stringify({ userId, usedAt: Date.now(), username }),
              'EX',
              365 * 86400
            )
          }
        } catch (e) {
          console.warn('Redis 核验/记录邀请码消耗异常，降级通过:', e)
        }
      }

      // 生成防篡改专属数字签名
      const signature = signUserActivation(userId, canonicalCode)
      const activatedAt = Date.now()

      // 将激活记录持久化到 Redis
      if (BLOG.REDIS_URL) {
        try {
          const { redisClient } = await import('@/lib/cache/redis_cache')
          if (typeof redisClient?.set === 'function') {
            await redisClient.set(
              `notion_active_user:${userId}`,
              JSON.stringify({ code: canonicalCode, signature, activatedAt, username, email }),
              'EX',
              365 * 86400
            )
          }
        } catch (e) {
          console.warn('Redis 保存用户激活记录异常:', e)
        }
      }

      // 设置客户端 Cookie，有效期 1 年
      const maxAge = 365 * 86400
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
        is_activated: true,
        invite_code: canonicalCode,
        signature,
        activated_at: activatedAt,
        message: '开图通行证激活成功！欢迎使用。'
      })
    } else {
      return res.status(400).json({
        success: false,
        is_activated: false,
        needPurchase: true,
        storeUrl,
        priceLdc,
        message: result.message || '邀请码错误或已失效，请核对或前往 LDstore 购买'
      })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS'])
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
}
