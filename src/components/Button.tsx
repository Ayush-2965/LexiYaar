import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'gradient' | 'success' | 'warning' | 'glass'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'icon' | 'icon-sm' | 'icon-lg'
  isLoading?: boolean
  fullWidth?: boolean
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export default function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  fullWidth = false,
  rounded = 'lg',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg active:transform active:scale-[0.98]',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-md hover:shadow-lg active:transform active:scale-[0.98]',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg active:transform active:scale-[0.98]',
    outline: 'border-2 border-red-600 text-red-600 bg-transparent hover:bg-red-600 hover:text-white focus:ring-red-500 active:transform active:scale-[0.98]',
    ghost: 'text-red-600 bg-transparent hover:bg-red-50 focus:ring-red-500 active:transform active:scale-[0.98]',
    gradient: 'bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700 focus:ring-red-500 shadow-md hover:shadow-lg active:transform active:scale-[0.98]',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-md hover:shadow-lg active:transform active:scale-[0.98]',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 shadow-md hover:shadow-lg active:transform active:scale-[0.98]',
  glass: 'bg-white/10 backdrop-blur-md border border-white/20 text-blue-700 hover:bg-white/30 focus:ring-blue-300 shadow-lg active:transform active:scale-[0.98]'
  }

  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
    '2xl': 'px-10 py-5 text-2xl',
    'icon-sm': 'p-1.5 rounded-full',
    icon: 'p-2.5 rounded-full',
    'icon-lg': 'p-3.5 rounded-full'
  }

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  }

  const isIconButton = size.includes('icon')

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        !isIconButton && sizes[size],
        isIconButton && sizes[size],
        !isIconButton && roundedClasses[rounded],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  )
}
