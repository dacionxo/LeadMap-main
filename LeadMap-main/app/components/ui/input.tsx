import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/app/lib/utils'

const inputVariants = cva(
  'flex h-10 w-full border rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-0',
  {
    variants: {
      variant: {
        default:
          'border-gray-300 bg-transparent text-gray-900 placeholder:text-gray-500 focus-visible:border-blue-600 focus-visible:ring-0 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
  VariantProps<typeof inputVariants> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export { Input }
