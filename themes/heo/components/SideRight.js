import Live2D from '@/components/Live2D'
import { siteConfig } from '@/lib/config'
import { SignedOut } from '@clerk/nextjs'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AnalyticsCard } from './AnalyticsCard'
import Card from './Card'
import Catalog from './Catalog'
import { InfoCard } from './InfoCard'
import LatestPostsGroupMini from './LatestPostsGroupMini'
import TagGroups from './TagGroups'
import TouchMeCard from './TouchMeCard'

const FaceBookPage = dynamic(
  () => {
    let facebook = <></>
    try {
      facebook = import('@/components/FacebookPage')
    } catch (err) {
      console.error(err)
    }
    return facebook
  },
  { ssr: false }
)

/**
 * Hexo主题右侧栏
 * @param {*} props
 * @returns
 */
export default function SideRight(props) {
  const { post, tagOptions, currentTag, rightAreaSlot } = props
  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // 只摘取标签的前60个，防止右侧过长
  const sortedTags = tagOptions?.slice(0, 60) || []

  return (
    <div id='sideRight' className='hidden xl:block w-72 space-y-4 h-full'>
      <InfoCard {...props} className='w-72 wow fadeInUp' />

      {/* 邀请注册门禁卡片（未登录用户专属引导） */}
      {enableClerk && (
        <SignedOut>
          <div className='p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/70 dark:from-[#211f2c] dark:via-[#1e1c27] dark:to-[#1b1924] border border-indigo-100 dark:border-indigo-900/50 shadow-sm'>
            <div className='flex items-center space-x-2.5 mb-2.5'>
              <div className='w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0'>
                <svg
                  className='w-4 h-4'
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
              </div>
              <div>
                <h4 className='text-sm font-bold text-gray-900 dark:text-white'>
                  LD 研究生院
                </h4>
                <p className='text-[10px] text-indigo-600 dark:text-indigo-400 font-medium'>
                  专属邀请注册通道
                </p>
              </div>
            </div>
            <p className='text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3.5'>
              本站实行专属邀请制。持有邀请码即可开启完整科研导航、工具集与互助社区。
            </p>
            <div className='flex items-center gap-2'>
              <Link
                href='/sign-up'
                className='flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/20 text-center transition-all flex items-center justify-center space-x-1'>
                <span>去注册</span>
                <svg
                  className='w-3 h-3'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M14 5l7 7m0 0l-7 7m7-7H3'
                  />
                </svg>
              </Link>
              <a
                href={siteConfig(
                  'INVITATION_STORE_URL',
                  'https://ldcstore.com',
                  props?.NOTION_CONFIG
                )}
                target='_blank'
                rel='noopener noreferrer'
                className='py-2 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-400 text-xs font-medium transition-colors text-center shrink-0'>
                买邀请码
              </a>
            </div>
          </div>
        </SignedOut>
      )}

      <div className='sticky top-20 space-y-4'>
        {/* 文章页显示目录 */}
        {post && post.toc && post.toc.length > 0 && (
          <Card className='bg-white dark:bg-[#1e1e1e] wow fadeInUp'>
            <Catalog toc={post.toc} />
          </Card>
        )}

        {/* 联系交流群 */}
        <div className='wow fadeInUp'>
          <TouchMeCard />
        </div>

        {/* 最新文章列表 */}
        <div
          className={
            'border wow fadeInUp  hover:border-indigo-600  dark:hover:border-yellow-600 duration-200 dark:border-gray-700 dark:bg-[#1e1e1e] dark:text-white rounded-xl lg:p-6 p-4 hidden lg:block bg-white'
          }>
          <LatestPostsGroupMini {...props} />
        </div>

        {rightAreaSlot}

        <FaceBookPage />
        <Live2D />

        {/* 标签和成绩 */}
        <Card
          className={
            'bg-white dark:bg-[#1e1e1e] dark:text-white hover:border-indigo-600  dark:hover:border-yellow-600 duration-200'
          }>
          <TagGroups tags={sortedTags} currentTag={currentTag} />
          <hr className='mx-1 flex border-dashed relative my-4' />
          <AnalyticsCard {...props} />
        </Card>
      </div>
    </div>
  )
}
