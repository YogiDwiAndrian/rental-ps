import { ResponsiveWrapper } from '@/components/customer/responsive-wrapper'

export default async function CustomerPage({ 
  params 
}: { 
  params: Promise<{ subdomain: string }>
}) {
  // Await params in Next.js 15
  const { subdomain } = await params
  
  return (
    <div className="min-h-screen bg-gray-50">
      <ResponsiveWrapper subdomain={subdomain} />
    </div>
  )
}