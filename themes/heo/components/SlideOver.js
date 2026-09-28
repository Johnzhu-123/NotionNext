import DarkModeButton from '@/components/DarkModeButton'
import SmartLink from '@/components/SmartLink'
import DashboardButton from '@/components/ui/dashboard/DashboardButton'
import { useGlobal } from '@/lib/global'
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Dialog, Transition } from '@headlessui/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Fragment,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'
import { MenuListSide } from './MenuListSide'
import TagGroups from './TagGroups'

/**
 * 侧边抽屉
 * 移动端的菜单在这里
 */
export default function SlideOver(props) {
  const { cRef, tagOptions } = props
  const [open, setOpen] = useState(false)
  const { locale } = useGlobal()
  const router = useRouter()
  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  /**
   * 函数组件暴露方法useImperativeHandle
   **/
  useImperativeHandle(cRef, () => ({
    toggleSlideOvers: toggleSlideOvers
  }))

  /**
   * 开关侧拉抽屉
   */
  const toggleSlideOvers = () => {
    setOpen(!open)
  }

  /**
   * 自动关闭抽屉
   */
  useEffect(() => {
    setOpen(false)
  }, [router])

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as='div' className='relative z-20' onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter='ease-in-out duration-500'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in-out duration-500'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'>
          <div className='fixed inset-0 glassmorphism bg-black bg-opacity-30 transition-opacity' />
        </Transition.Child>

        <div className='fixed inset-0 overflow-hidden'>
          <div className='absolute inset-0 overflow-hidden'>
            <div className='pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10'>
              <Transition.Child
                as={Fragment}
                enter='transform transition ease-in-out duration-500 sm:duration-700'
                enterFrom='translate-x-full'
                enterTo='translate-x-0'
                leave='transform transition ease-in-out duration-500 sm:duration-700'
                leaveFrom='translate-x-0'
                leaveTo='translate-x-full'>
                <Dialog.Panel className='pointer-events-auto relative w-96 max-w-md'>
                  <Transition.Child
                    as={Fragment}
                    enter='ease-in-out duration-500'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in-out duration-500'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'>
                    <div className='absolute left-0 top-0 -ml-8 flex pr-2 pt-4 sm:-ml-10 sm:pr-4'>
                      <button
                        type='button'
                        className='rounded-md text-gray-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-white'
                        onClick={() => setOpen(false)}>
                        <span className='sr-only'>Close panel</span>
                        <i className='fa-solid fa-xmark px-2'></i>
                      </button>
                    </div>
                  </Transition.Child>
                  {/* 内容 */}
                  <div className='flex h-full flex-col overflow-y-scroll bg-white dark:bg-[#18171d] py-6 shadow-xl'>
                    <div className='relative mt-6 flex-1 flex-col space-y-3 px-4 sm:px-6 dark:text-white '>
                      {/* 用户登录与邀请注册模块（移动端专用） */}
                      {enableClerk && (
                        <section className='p-3.5 rounded-2xl bg-gray-50/90 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 mb-1'>
                          <SignedOut>
                            <div className='flex flex-col space-y-2.5'>
                              <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1'>
                                <span className='font-medium'>会员账户</span>
                                <span className='text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50'>
                                  邀请码注册制
                                </span>
                              </div>
                              <div className='grid grid-cols-2 gap-2'>
                                <SignInButton mode='modal'>
                                  <button
                                    type='button'
                                    className='w-full py-2.5 px-3 rounded-xl bg-white dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-center'>
                                    直接登录
                                  </button>
                                </SignInButton>
                                <Link
                                  href='/sign-up'
                                  onClick={() => setOpen(false)}
                                  className='w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 text-center flex items-center justify-center space-x-1 transition-all'>
                                  <svg
                                    className='w-3.5 h-3.5 shrink-0'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'>
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth='2'
                                      d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
                                    />
                                  </svg>
                                  <span>邀请注册</span>
                                </Link>
                              </div>
                            </div>
                          </SignedOut>
                          <SignedIn>
                            <div className='flex items-center justify-between px-1 py-0.5'>
                              <div className='flex items-center space-x-2.5'>
                                <UserButton />
                                <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
                                  个人中心
                                </span>
                              </div>
                              <DashboardButton />
                            </div>
                          </SignedIn>
                        </section>
                      )}

                      <section className='space-y-2 flex flex-col'>
                        {/* 切换深色模式 */}
                        <DarkModeBlockButton />
                      </section>

                      <section className='space-y-2 flex flex-col'>
                        <div>{locale.COMMON.BLOG}</div>
                        {/* 导航按钮 */}
                        <div className='gap-2 grid grid-cols-2'>
                          <Button title={'主页'} url={'/'} />
                          <Button title={'关于'} url={'/about'} />
                        </div>
                        {/* 用户自定义菜单 */}
                        <MenuListSide {...props} />
                      </section>

                      <section className='space-y-2 flex flex-col'>
                        <div>{locale.COMMON.TAGS}</div>
                        <TagGroups tags={tagOptions} />
                      </section>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

/**
 * 一个包含图标的按钮
 */
function DarkModeBlockButton() {
  const darkModeRef = useRef()
  const { isDarkMode, locale } = useGlobal()

  function handleChangeDarkMode() {
    darkModeRef?.current?.handleChangeDarkMode()
  }
  return (
    <button
      onClick={handleChangeDarkMode}
      className={
        'group duration-200 hover:text-white hover:shadow-md hover:bg-blue-600 flex justify-between items-center px-2 py-2 border dark:border-gray-600 bg-white dark:bg-[#ff953e]  rounded-lg'
      }>
      <DarkModeButton cRef={darkModeRef} className='group-hover:text-white' />{' '}
      {isDarkMode ? locale.MENU.LIGHT_MODE : locale.MENU.DARK_MODE}
    </button>
  )
}

/**
 * 一个简单的按钮
 */
function Button({ title, url }) {
  return (
    <SmartLink
      href={url}
      className={
        'duration-200 hover:text-white hover:shadow-md flex cursor-pointer justify-between items-center px-2 py-2 border dark:border-gray-600 bg-white hover:bg-blue-600 dark:bg-[#1e1e1e] rounded-lg'
      }>
      {title}
    </SmartLink>
  )
}
