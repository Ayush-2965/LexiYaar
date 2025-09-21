'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function HelpPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-30 w-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl backdrop-blur-md" style={{ WebkitBackdropFilter: 'blur(8px)' }}>
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => router.back()} className="flex items-center justify-center w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/20 active:scale-95" aria-label="Back">
            <ArrowLeft size={22} className="text-white" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-white flex-1">Legal Help</h1>
        </div>
      </header>
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-600">DLSA contacts and legal aid coming soon...</p>
        </div>
      </div>
    </div>
  )
}