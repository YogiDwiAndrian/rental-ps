import { ResponsiveWrapper } from '@/components/customer/responsive-wrapper'
import { useLocationData } from '@/hooks/use-location-data'

export default async function CustomerPage({ 
  params 
}: { 
  params: Promise<{ subdomain: string }>
}) {
  // Await params in Next.js 15
  const { subdomain } = await params
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <ResponsiveWrapper subdomain={subdomain} />
    </div>
  )
}