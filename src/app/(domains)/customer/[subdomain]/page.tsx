// src/app/(domains)/customer/[subdomain]/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MapPin, Clock, Phone, MessageCircle, Wifi } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import RealtimeUnits from "@/components/customer/realtime-units"
import RealtimeFnb from "@/components/customer/realtime-fnb"

interface CustomerPageProps {
  params: Promise<{
    subdomain: string
  }>
}

async function getTenantData(subdomain: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { 
        subdomain: subdomain,
        isActive: true,
        customerPageEnabled: true
      },
      include: {
        locations: {
          where: { 
            isActive: true,
            showOnCustomerPage: true 
          },
          include: {
            units: {
              where: { 
                isActive: true,
                showOnCustomerPage: true 
              },
              include: {
                rentalSessions: {
                  where: {
                    status: 'active'
                  },
                  select: {
                    id: true,
                    startTime: true,
                    endTime: true,
                    purchasedDuration: true,
                    extendedDuration: true,
                    billingModel: true
                  }
                }
              }
            },
            fnbItems: {
              where: { 
                isActive: true,
                showOnCustomerPage: true 
              },
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    displayOrder: true
                  }
                }
              },
              orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' }
              ]
            },
            customerPageConfig: true
          }
        }
      }
    })

    return tenant
  } catch (error) {
    console.error('Error fetching tenant data:', error)
    return null
  }
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { subdomain } = await params
  
  if (!subdomain || subdomain.length < 2) {
    notFound()
  }

  const tenant = await getTenantData(subdomain)
  
  if (!tenant) {
    notFound()
  }

  const primaryLocation = tenant.locations[0]
  const config = primaryLocation?.customerPageConfig[0]

  // Prepare initial data for real-time components
  
  // Units data with remaining time calculation
  const initialUnits = primaryLocation?.units.map(unit => {
    let remainingMinutes: number | null = null
    let estimatedEndTime: string | null = null

    if (unit.status === 'occupied' && unit.rentalSessions.length > 0) {
      const activeSession = unit.rentalSessions[0]
      const now = new Date()
      
      if (activeSession.billingModel !== 'timer') {
        const totalDuration = (activeSession.purchasedDuration || 0) + activeSession.extendedDuration
        const endTime = new Date(activeSession.startTime.getTime() + totalDuration * 60000)
        estimatedEndTime = endTime.toISOString()
        remainingMinutes = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 60000))
      }
    }

    return {
      id: unit.id,
      name: unit.customerDisplayName || unit.name,
      consoleType: unit.consoleType,
      controllerCount: unit.controllerCount,
      status: unit.status as 'available' | 'occupied' | 'maintenance' | 'broken',
      hourlyRate: Number(unit.hourlyRate),
      remainingMinutes,
      estimatedEndTime,
      locationName: primaryLocation.name
    }
  }) || []

  // F&B data organized by categories
  const categoryMap = new Map<string, typeof primaryLocation.fnbItems>()
  
  primaryLocation?.fnbItems.forEach(item => {
    const categoryName = item.category?.name || 'Uncategorized'
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, [])
    }
    categoryMap.get(categoryName)!.push(item)
  })

  const initialFnbCategories = Array.from(categoryMap.entries()).map(([categoryName, items]) => ({
    categoryName,
    items: items.map(item => ({
      id: item.id,
      name: item.customerDisplayName || item.name,
      description: item.customerDescription || item.description,
      price: Number(item.sellingPrice),
      stockQuantity: item.stockQuantity,
      isAvailable: item.stockQuantity > 0,
      unitType: item.unitType,
      locationName: primaryLocation.name
    })),
    locationName: primaryLocation.name
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🎮 {tenant.name}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-green-500" />
                Real-time gaming status & menu
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Live Status</div>
              <div className="text-lg font-semibold text-green-600 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Online
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Real-time Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Real-time Units Status */}
            <RealtimeUnits 
              subdomain={subdomain}
              initialUnits={initialUnits}
            />

            {/* Real-time F&B Menu */}
            <RealtimeFnb 
              subdomain={subdomain}
              initialCategories={initialFnbCategories}
            />
          </div>

          {/* Right Column - Static Info */}
          <div className="space-y-6">
            
            {/* Location Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Location Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">📍 Address</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {primaryLocation?.address}
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Opening Hours
                  </h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Monday - Thursday:</span>
                      <span>10:00 - 23:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Friday - Saturday:</span>
                      <span>10:00 - 24:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday:</span>
                      <span>09:00 - 23:00</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3">📞 Contact Us</h4>
                  <div className="space-y-3">
                    {config?.publicPhone && (
                      <a
                        href={`tel:${config.publicPhone}`}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Phone className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-medium">Call Us</div>
                          <div className="text-sm text-gray-600">{config.publicPhone}</div>
                        </div>
                      </a>
                    )}
                    
                    {config?.whatsappNumber && (
                      <a
                        href={`https://wa.me/${config.whatsappNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-green-50 transition-colors border-green-200"
                      >
                        <MessageCircle className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="font-medium text-green-700">WhatsApp</div>
                          <div className="text-sm text-green-600">Chat with us!</div>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Live Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📊 Live Stats
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Available Units</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {initialUnits.filter(u => u.status === 'available').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Occupied Units</span>
                    <Badge variant="destructive">
                      {initialUnits.filter(u => u.status === 'occupied').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Available F&B</span>
                    <Badge variant="outline">
                      {initialFnbCategories.flatMap(c => c.items).filter(i => i.isAvailable).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Menu Categories</span>
                    <Badge variant="outline">
                      {initialFnbCategories.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-refresh Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Wifi className="w-8 h-8 text-blue-600 mx-auto" />
                  <h4 className="font-medium text-blue-900">Real-time Updates</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>🎮 Units: Every 30 seconds</div>
                    <div>🍕 Menu: Every 5 minutes</div>
                    <div>📊 Stats: Live updates</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}