/**
 * 批量生成注册邀请码与 LDstore 自动发卡卡密工具
 * 使用方式：
 *   node scripts/generate-invites.js 100
 *   node scripts/generate-invites.js 500 --prefix=YJYS --out=invites.txt
 *   npm run gen-invites 50
 */

const fs = require('fs')
const path = require('path')
const {
  generateInviteCode,
  verifyInviteCode
} = require('../lib/invitation.js')

// 读取配置
let BLOG = {}
try {
  BLOG = require('../blog.config.js')
} catch (e) {
  // ignore
}

function generateBatch(count = 20, options = {}) {
  const codeSet = new Set()
  const maxAttempts = count * 15
  let attempts = 0

  while (codeSet.size < count && attempts < maxAttempts) {
    attempts++
    const code = generateInviteCode(options)
    // 即时验真自测，确保生成的每一条码都能通过检验
    const check = verifyInviteCode(code, options)
    if (check.valid) {
      codeSet.add(code)
    }
  }

  return Array.from(codeSet)
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2)
  let count = 20
  let prefix =
    process.env.NEXT_PUBLIC_INVITATION_CODE_PREFIX ||
    BLOG.INVITATION_CODE_PREFIX ||
    'YJYS'
  let secret =
    process.env.INVITATION_SECRET ||
    BLOG.INVITATION_SECRET ||
    'notionnext-secret-key-yjys-2026'
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
  console.log(`🎟️  NotionNext x LDstore 注册邀请码批量生成器`)
  console.log(`==============================================`)
  console.log(`• 生成数量: ${count}`)
  console.log(`• 邀请码前缀: ${prefix}`)
  console.log(`• 签名密钥: ${secret.slice(0, 4)}****${secret.slice(-4)}`)
  console.log(`• LDstore 单价: 99 LDC`)
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

  // 1. 生成便于直接复制粘贴进 LDstore 的纯文本卡密文件（每行一个，无注释干扰）
  const ldstoreFileName = `ldstore-cards-${prefix}-${timestamp}.txt`
  const ldstoreTargetPath = path.join(__dirname, '..', ldstoreFileName)
  fs.writeFileSync(ldstoreTargetPath, codes.join('\n') + '\n', 'utf-8')

  // 2. 如果指定了 --out，也保存到对应文件
  if (outFile) {
    fs.writeFileSync(outFile, codes.join('\n') + '\n', 'utf-8')
  }

  console.log(`\n✅ 成功生成 ${codes.length} 个密码学唯一有效邀请码！`)
  console.log(`🛒 LDstore 专用发卡卡密文件（全选复制即用）:`)
  console.log(`   ${ldstoreTargetPath}\n`)
}

main()
