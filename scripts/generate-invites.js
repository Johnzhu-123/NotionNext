/**
 * 批量生成注册邀请码工具
 * 使用方式：
 *   node scripts/generate-invites.js 100
 *   node scripts/generate-invites.js 500 --prefix=YJYS --out=invites.txt
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// 读取配置
let BLOG = {}
try {
  BLOG = require('../blog.config.js')
} catch (e) {
  // ignore
}

const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function bufferToSafeString(buffer, length) {
  let result = ''
  for (let i = 0; i < length; i++) {
    const byte = buffer[i % buffer.length]
    result += SAFE_ALPHABET[byte % SAFE_ALPHABET.length]
  }
  return result
}

function computeSignature(payload, secret, sigLength = 4) {
  const hmac = crypto.createHmac('sha256', secret || 'notionnext-secret-key-yjys-2026')
  hmac.update(payload.toUpperCase())
  const digest = hmac.digest()
  return bufferToSafeString(digest, sigLength)
}

function generateInviteCode(options = {}) {
  const prefix = (options.prefix || BLOG.INVITATION_CODE_PREFIX || 'YJYS')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const secret =
    options.secret ||
    process.env.INVITATION_SECRET ||
    BLOG.INVITATION_SECRET ||
    'notionnext-secret-key-yjys-2026'
  const payloadLength = options.payloadLength || 4
  const sigLength = options.sigLength || 4

  const randomBytes = crypto.randomBytes(payloadLength)
  const payload = bufferToSafeString(randomBytes, payloadLength)

  const signSource = `${prefix}-${payload}`
  const signature = computeSignature(signSource, secret, sigLength)

  return `${prefix}-${payload}-${signature}`
}

function generateBatch(count = 20, options = {}) {
  const codeSet = new Set()
  const maxAttempts = count * 10
  let attempts = 0

  while (codeSet.size < count && attempts < maxAttempts) {
    attempts++
    codeSet.add(generateInviteCode(options))
  }

  return Array.from(codeSet)
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  let count = 20
  let prefix = BLOG.INVITATION_CODE_PREFIX || 'YJYS'
  let secret = process.env.INVITATION_SECRET || BLOG.INVITATION_SECRET || 'notionnext-secret-key-yjys-2026'
  let outFile = ''

  for (const arg of args) {
    if (/^\d+$/.test(arg)) {
      count = parseInt(arg, 10)
    } else if (arg.startsWith('--prefix=')) {
      prefix = arg.split('=')[1]
    } else if (arg.startsWith('--secret=')) {
      secret = arg.split('=')[1]
    } else if (arg.startsWith('--out=') || arg.startsWith('--output=')) {
      outFile = arg.split('=')[1]
    }
  }

  return { count, prefix, secret, outFile }
}

function main() {
  const { count, prefix, secret, outFile } = parseArgs()

  console.log(`\n==============================================`)
  console.log(`🎟️  NotionNext 算法签名批量邀请码生成器`)
  console.log(`==============================================`)
  console.log(`• 生成数量: ${count}`)
  console.log(`• 邀请码前缀: ${prefix}`)
  console.log(`• 签名密钥: ${secret.slice(0, 4)}****${secret.slice(-4)}`)
  console.log(`==============================================\n`)

  const codes = generateBatch(count, { prefix, secret })

  // 终端展示前 10 个示例
  const previewCount = Math.min(codes.length, 10)
  console.log(`[前 ${previewCount} 个邀请码预览]:`)
  codes.slice(0, previewCount).forEach((c, idx) => {
    console.log(`  ${String(idx + 1).padStart(3, ' ')}. ${c}`)
  })

  if (codes.length > previewCount) {
    console.log(`  ... 还有 ${codes.length - previewCount} 个邀请码已生成`)
  }

  // 保存到文件
  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15)
  const defaultFileName = `invites-${prefix}-${timestamp}.txt`
  const targetPath = outFile || path.join(__dirname, '..', defaultFileName)

  const fileContent = [
    `# NotionNext 注册邀请码清单`,
    `# 生成时间: ${now.toLocaleString()}`,
    `# 数量: ${codes.length}`,
    `# 前缀: ${prefix}`,
    `# ----------------------------------------`,
    ...codes,
    ``
  ].join('\n')

  fs.writeFileSync(targetPath, fileContent, 'utf-8')

  console.log(`\n✅ 成功生成 ${codes.length} 个唯一有效邀请码！`)
  console.log(`📁 文件已保存至: ${targetPath}\n`)
}

main()

