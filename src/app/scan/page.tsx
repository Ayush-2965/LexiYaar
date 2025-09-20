import { Suspense } from 'react'
import ScanPage from '@/components/ScanPage'

export default function Scan() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScanPage />
    </Suspense>
  )
}