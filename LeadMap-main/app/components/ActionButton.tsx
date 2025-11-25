'use client'

import { usePageState } from '@/app/contexts/PageStateContext'
import { validateAction, prepareActionContext, ACTION_BUTTONS, ActionType } from '@/app/lib/actionMapper'
import { usePathname } from 'next/navigation'
import { 
  UserPlus, List, TrendingUp, Briefcase, Mail, Phone, Eye, 
  Download, Sparkles, CheckSquare, LucideIcon 
} from 'lucide-react'

interface ActionButtonProps {
  action: ActionType
  listingId?: string
  listing?: any
  label?: string
  icon?: LucideIcon
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  className?: string
  isDark?: boolean
}

const iconMap: Record<string, LucideIcon> = {
  UserPlus,
  List,
  TrendingUp,
  Briefcase,
  Mail,
  Phone,
  Eye,
  Download,
  Sparkles,
  CheckSquare
}

export default function ActionButton({
  action,
  listingId,
  listing,
  label,
  icon: IconProp,
  variant = 'default',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  isDark = false
}: ActionButtonProps) {
  const pathname = usePathname()
  const { state, executeAction, selectListing, deselectListing } = usePageState()
  
  const buttonConfig = ACTION_BUTTONS.find(b => b.action === action)
  const Icon = IconProp || (buttonConfig?.icon ? iconMap[buttonConfig.icon] : null)
  const displayLabel = label || buttonConfig?.label || action
  
  const selectedCount = listingId 
    ? (state.selectedListingIds.has(listingId) ? 1 : 0)
    : state.selectedListingIds.size
  
  const validation = validateAction(action, selectedCount)
  const isDisabled = disabled || !validation.valid
  
  const handleClick = async () => {
    if (isDisabled) return
    
    // If single listing action, ensure it's selected
    if (listingId && listing) {
      if (!state.selectedListingIds.has(listingId)) {
        selectListing(listingId, listing)
      }
    }
    
    // Prepare context
    const listingIds = listingId 
      ? [listingId]
      : Array.from(state.selectedListingIds)
    
    const listings = listing
      ? [listing]
      : state.selectedListings
    
    const context = prepareActionContext(
      action,
      pathname,
      listingIds,
      listings
    )
    
    // Execute action
    await executeAction(action, context)
    
    // Call custom onClick if provided
    if (onClick) {
      onClick()
    }
  }
  
  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '12px', iconSize: 14 },
    md: { padding: '8px 16px', fontSize: '14px', iconSize: 16 },
    lg: { padding: '10px 20px', fontSize: '16px', iconSize: 18 }
  }
  
  const variantStyles = {
    default: {
      background: isDark 
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'
        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      color: '#ffffff',
      border: 'none',
      hover: {
        background: isDark
          ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)'
          : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
      }
    },
    outline: {
      background: 'transparent',
      color: isDark ? '#e2e8f0' : '#6366f1',
      border: isDark ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #6366f1',
      hover: {
        background: isDark 
          ? 'rgba(99, 102, 241, 0.1)'
          : 'rgba(99, 102, 241, 0.05)'
      }
    },
    ghost: {
      background: 'transparent',
      color: isDark ? '#94a3b8' : '#6b7280',
      border: 'none',
      hover: {
        background: isDark 
          ? 'rgba(99, 102, 241, 0.1)'
          : 'rgba(99, 102, 241, 0.05)'
      }
    }
  }
  
  const styles = sizeStyles[size]
  const variantStyle = variantStyles[variant]
  
  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={validation.error || buttonConfig?.tooltip || displayLabel}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: styles.padding,
        border: variantStyle.border,
        borderRadius: '8px',
        background: variantStyle.background,
        color: variantStyle.color,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: styles.fontSize,
        fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        outline: 'none',
        ...(isDisabled ? {} : {
          ':hover': variantStyle.hover
        })
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          Object.assign(e.currentTarget.style, variantStyle.hover)
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = variantStyle.background
          e.currentTarget.style.color = variantStyle.color
        }
      }}
    >
      {Icon && <Icon size={styles.iconSize} />}
      <span>{displayLabel}</span>
    </button>
  )
}

