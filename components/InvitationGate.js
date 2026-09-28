import { siteConfig } from '@/lib/config'
import { isBrowser } from '@/lib/utils'
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

/**
 * 注册邀请码门禁组件
 * 包含：
 * 1. 邀请码验证表单
 * 2. LDstore 购买邀请码弹窗提示（未填写邀请码或点击购买时弹出）
 * 3. 验证成功后展示 Clerk <SignUp /> 注册组件
 */
export default function InvitationGate(props) {
  const router = useRouter()
  const inputRef = useRef(null)
  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // 邀请码功能开关与配置
  const isEnabled = siteConfig(
    'ENABLE_INVITATION_CODE',
    true,
    props?.NOTION_CONFIG
  )
  const tips = siteConfig(
    'INVITATION_TIPS',
    '本站实行专属邀请注册制，注册时必须填写有效邀请码。',
    props?.NOTION_CONFIG
  )
  const storeUrl = siteConfig(
    'INVITATION_STORE_URL',
    'https://ldcstore.com',
    props?.NOTION_CONFIG
  )
  const priceLdc = siteConfig(
    'INVITATION_PRICE_LDC',
    99,
    props?.NOTION_CONFIG
  )
  const contactText = siteConfig(
    'INVITATION_CONTACT_TEXT',
    '前往 LDstore 购买邀请码',
    props?.NOTION_CONFIG
  )

  const [inviteCode, setInviteCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [shake, setShake] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // 初始化检查客户端会话是否已验证
  useEffect(() => {
    if (!isEnabled) {
      setIsVerified(true)
      setIsChecking(false)
      return
    }

    if (isBrowser) {
      const sessionVerified = sessionStorage.getItem('notion_invite_verified')
      if (sessionVerified === 'true') {
        setIsVerified(true)
        setIsChecking(false)
        return
      }

      // 服务端 cookie 校验
      fetch('/api/auth/verify-invite')
        .then(res => res.json())
        .then(data => {
          if (data?.verified) {
            setIsVerified(true)
            sessionStorage.setItem('notion_invite_verified', 'true')
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsChecking(false)
        })
    } else {
      setIsChecking(false)
    }
  }, [isEnabled])

  // ESC 键关闭弹窗
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && showModal) {
        closeModalAndFocus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const closeModalAndFocus = () => {
    setShowModal(false)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 150)
  }

  // 提交邀请码验证
  const handleVerify = async e => {
    if (e) e.preventDefault()

    // 核心改造要求：注册时必须填写邀请码，若未填写则直接弹窗提示去 LDstore 购买
    if (!inviteCode || !inviteCode.trim()) {
      setShowModal(true)
      triggerShake()
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      const response = await fetch('/api/auth/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() })
      })

      const data = await response.json()

      if (response.ok && data?.success) {
        setIsVerified(true)
        if (isBrowser) {
          sessionStorage.setItem('notion_invite_verified', 'true')
        }
      } else {
        setErrorMsg(data?.message || '邀请码错误或已失效')
        triggerShake()
      }
    } catch (err) {
      setErrorMsg('网络请求失败，请检查网络后重试')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载检查中
  if (isChecking) {
    return (
      <div className='flex justify-center items-center py-24'>
        <div className='flex flex-col items-center space-y-4 text-gray-500 dark:text-gray-400'>
          <div className='w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin' />
          <span className='text-sm tracking-wide'>正在核对准入凭证...</span>
        </div>
      </div>
    )
  }

  // 已通过验证：解锁并展示 Clerk 注册组件
  if (isVerified) {
    return (
      <div className='flex flex-col items-center w-full max-w-md mx-auto animate-fadeIn'>
        {/* 顶部微标：提示已通过邀请码验证 */}
        {isEnabled && (
          <div className='mb-6 px-5 py-2 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex items-center space-x-2.5 text-xs text-emerald-700 dark:text-emerald-300'>
            <div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
            <span className='font-medium'>已验证专属邀请码，欢迎注册 LD 研究生院</span>
          </div>
        )}

        {/* Clerk 注册表单 */}
        {enableClerk ? (
          <SignUp />
        ) : (
          <div className='p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 w-full'>
            <svg
              className='w-12 h-12 text-gray-400 mx-auto mb-3'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='1.5'
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
            <p className='text-sm font-medium'>尚未配置 Clerk 鉴权组件</p>
            <p className='text-xs text-gray-400 mt-1'>
              请在环境变量中配置 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
            </p>
          </div>
        )}
      </div>
    )
  }

  // 未验证：显示邀请码输入门禁卡片与弹窗
  return (
    <div className='relative w-full max-w-lg mx-auto'>
      {/* 门禁主卡片 */}
      <div
        className={`p-8 sm:p-10 rounded-3xl bg-white/95 dark:bg-[#1a1921]/95 border border-gray-100 dark:border-gray-800 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          shake ? 'animate-shake ring-2 ring-red-400/80 dark:ring-red-500/60' : ''
        }`}>
        {/* 顶部图标与标题 */}
        <div className='text-center space-y-3 mb-8'>
          <div className='relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 text-white shadow-xl shadow-orange-500/20 mb-1 group'>
            <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='1.8'
                d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
              />
            </svg>
            <div className='absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider'>
              LD
            </div>
          </div>

          <h2 className='text-2xl font-bold text-gray-900 dark:text-white tracking-tight'>
            LD 研究生院 · 注册通道
          </h2>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto'>
            {tips}
          </p>

          {/* LDstore 提示标签条 */}
          <div className='inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-700 dark:text-amber-300 font-medium'>
            <span>🛒 邀请码在 LDstore 现已上架 · {priceLdc} LDC/个</span>
          </div>
        </div>

        {/* 邀请码输入表单 */}
        <form onSubmit={handleVerify} className='space-y-5'>
          <div>
            <div className='flex items-center justify-between mb-2'>
              <label className='block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider'>
                专属邀请码
              </label>
              <button
                type='button'
                onClick={() => setShowModal(true)}
                className='text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors flex items-center space-x-1'>
                <span>没有邀请码？</span>
              </button>
            </div>

            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                  />
                </svg>
              </div>
              <input
                ref={inputRef}
                type='text'
                value={inviteCode}
                onChange={e => {
                  setInviteCode(e.target.value.toUpperCase())
                  if (errorMsg) setErrorMsg('')
                }}
                placeholder='输入邀请码 (例如: YJYS-8M7P-K4F2)'
                autoFocus
                className='w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-center tracking-wider text-base'
              />
            </div>
          </div>

          {/* 错误提示区域 */}
          {errorMsg && (
            <div className='p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 animate-fadeIn'>
              <div className='flex items-center space-x-2'>
                <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
                <span>{errorMsg}</span>
              </div>
              <button
                type='button'
                onClick={() => setShowModal(true)}
                className='shrink-0 px-2.5 py-1 rounded-lg bg-red-100 dark:bg-red-900/50 hover:bg-red-200 text-red-700 dark:text-red-300 font-semibold transition-colors'>
                去购买邀请码 →
              </button>
            </div>
          )}

          {/* 验证并开启注册按钮 */}
          <button
            type='submit'
            disabled={isLoading}
            className='w-full py-4 px-6 rounded-2xl text-white font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition-all shadow-xl shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-base'>
            {isLoading ? (
              <>
                <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                <span>正在校验准入凭证...</span>
              </>
            ) : (
              <>
                <span>验证并开启注册</span>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M14 5l7 7m0 0l-7 7m7-7H3' />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* LDstore 快捷购买横幅引导 */}
        <div className='mt-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between text-xs'>
          <div className='space-y-0.5'>
            <span className='font-semibold text-gray-800 dark:text-gray-200 block'>
              还没有专属邀请码？
            </span>
            <span className='text-gray-500 dark:text-gray-400 text-[11px] block'>
              前往 LDstore 使用 {priceLdc} LDC 积分秒级兑换
            </span>
          </div>
          <button
            type='button'
            onClick={() => setShowModal(true)}
            className='px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-sm shrink-0'>
            获取邀请码
          </button>
        </div>

        {/* 底部导航区 */}
        <div className='mt-8 pt-6 border-t border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-3'>
          <div className='flex items-center space-x-1.5'>
            <span>已有账号？</span>
            <Link
              href='/sign-in'
              className='font-semibold text-indigo-600 dark:text-indigo-400 hover:underline'>
              直接登录
            </Link>
          </div>

          <a
            href={storeUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center space-x-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'>
            <span>{contactText}</span>
            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
              />
            </svg>
          </a>
        </div>
      </div>

      {/* 核心要求弹窗：用户未填写邀请码或点击获取时展示 */}
      {showModal && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn'>
          {/* 点击背景遮罩关闭 */}
          <div className='absolute inset-0' onClick={closeModalAndFocus} />

          {/* 弹窗内容容器 */}
          <div className='relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1f1e28] border border-gray-100 dark:border-gray-800 shadow-2xl text-left z-10 animate-fadeIn'>
            {/* 关闭按钮 */}
            <button
              type='button'
              onClick={closeModalAndFocus}
              className='absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>

            {/* 弹窗头部 */}
            <div className='flex items-center space-x-3 mb-5'>
              <div className='w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
                  />
                </svg>
              </div>
              <div>
                <span className='px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 uppercase tracking-wider inline-block mb-1'>
                  LINUX DO 社区集市 · LDstore
                </span>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white'>
                  需凭邀请码开启注册
                </h3>
              </div>
            </div>

            {/* 弹窗正文说明 */}
            <div className='space-y-3.5 text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed'>
              <p className='p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/40 text-amber-800 dark:text-amber-200'>
                <strong className='font-semibold'>⚠️ 提示：</strong>
                本站目前实行邀请注册制，注册账号必须输入有效的专属邀请码。
              </p>

              <div className='p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 space-y-2.5'>
                <div className='flex items-center justify-between font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-200/50 dark:border-gray-700/50'>
                  <span>商品名称</span>
                  <span className='text-indigo-600 dark:text-indigo-400'>
                    LD研究生院注册邀请码
                  </span>
                </div>
                <div className='flex items-center justify-between font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-200/50 dark:border-gray-700/50'>
                  <span>定价标准</span>
                  <span className='text-amber-600 dark:text-amber-400 font-bold'>
                    {priceLdc} LDC 积分 / 个
                  </span>
                </div>
                <div className='flex items-center justify-between text-gray-500 dark:text-gray-400'>
                  <span>发货方式</span>
                  <span>自动发卡（支付后秒级出码）</span>
                </div>
              </div>

              <div className='space-y-1.5 text-gray-500 dark:text-gray-400'>
                <p className='font-medium text-gray-700 dark:text-gray-300'>💡 获取流程：</p>
                <ol className='list-decimal list-inside space-y-1 pl-1'>
                  <li>前往 LDstore 找到并购买本站邀请码；</li>
                  <li>使用 LDC 社区积分完成兑换，获取专属卡密；</li>
                  <li>返回本页面输入卡密，即可解锁并完成注册。</li>
                </ol>
              </div>
            </div>

            {/* 弹窗操作按钮 */}
            <div className='flex flex-col sm:flex-row gap-3'>
              <a
                href={storeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 active:scale-[0.99] transition-all shadow-lg shadow-orange-500/20 text-center flex items-center justify-center space-x-1.5 text-xs sm:text-sm'>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
                  />
                </svg>
                <span>前往 LDstore 购买邀请码</span>
                <svg className='w-3.5 h-3.5 opacity-80' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                  />
                </svg>
              </a>

              <button
                type='button'
                onClick={closeModalAndFocus}
                className='py-3 px-4 rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-center text-xs sm:text-sm'>
                我已有邀请码
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
