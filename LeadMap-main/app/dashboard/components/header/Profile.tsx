'use client'

import { Icon } from '@iconify/react'
import { useApp } from '@/app/providers'
import { useRouter } from 'next/navigation'

interface ProfileProps {
  activeDir?: 'ltr' | 'rtl'
}

const Profile = ({ activeDir = 'ltr' }: ProfileProps) => {
  const { profile, user, signOut } = useApp()
  const router = useRouter()

  const avatarUrl = profile?.avatar_url ?? (user?.user_metadata as { avatar_url?: string } | undefined)?.avatar_url ?? null
  const initial = profile?.name?.charAt(0).toUpperCase() || 'U'

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Profile dropdown will be controlled by parent Header component
  return (
    <div className="relative group/menu ps-4">
      <span className="hover:text-primary hover:bg-lightprimary rounded-full flex justify-center items-center cursor-pointer group-hover/menu:bg-lightprimary group-hover/menu:text-primary">
        <div className="flex h-[35px] w-[35px] items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
      </span>
    </div>
  )
}

export { Profile }
export default Profile
