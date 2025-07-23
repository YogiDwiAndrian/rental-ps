// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed process...')

  // 1. Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@rentalps.com' },
    update: {},
    create: {
      email: 'admin@rentalps.com',
      name: 'Super Admin',
      role: 'super_admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
  })
  console.log('✅ Super Admin created:', superAdmin.email)

  // 2. Create Demo Tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Rental PS',
      subdomain: 'demo',
      customerPageEnabled: true,
      address: 'Jl. Gaming No. 123, Jakarta Selatan',
      phone: '+62 812-3456-7890',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        businessHours: {
          open: '10:00',
          close: '23:00'
        }
      },
      isActive: true,
    },
  })
  console.log('✅ Demo Tenant created:', demoTenant.subdomain)

  // 3. Create PS Lounge Tenant
  const pslTenant = await prisma.tenant.upsert({
    where: { subdomain: 'pslounge' },
    update: {},
    create: {
      name: 'PS Lounge',
      subdomain: 'pslounge',
      customerPageEnabled: true,
      address: 'Jl. PlayStation No. 456, Bandung',
      phone: '+62 813-7890-1234',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        businessHours: {
          open: '11:00',
          close: '24:00'
        }
      },
      isActive: true,
    },
  })
  console.log('✅ PS Lounge Tenant created:', pslTenant.subdomain)

  // 4. Create Owner for Demo Tenant
  const demoOwner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      email: 'owner@demo.com',
      name: 'Demo Owner',
      role: 'owner',
      tenantId: demoTenant.id,
      passwordHash: await bcrypt.hash('owner123', 12),
      firstName: 'Demo',
      lastName: 'Owner',
      phone: '+62 812-1111-2222',
      isActive: true,
    },
  })
  console.log('✅ Demo Owner created:', demoOwner.email)

  // 5. Update tenant owner
  await prisma.tenant.update({
    where: { id: demoTenant.id },
    data: { ownerId: demoOwner.id }
  })

  // 6. Create Jakarta Location for Demo
  const jakartaLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Jakarta Pusat',
      code: 'JKT',
      address: 'Jl. Gaming No. 123, Jakarta Pusat',
      phone: '+62 812-3456-7890',
      email: 'jakarta@demo.com',
      publicDescription: 'Rental PlayStation terlengkap di Jakarta Pusat dengan suasana nyaman dan AC full.',
      operationalHours: {
        monday: { open: '10:00', close: '23:00' },
        tuesday: { open: '10:00', close: '23:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '10:00', close: '23:00' },
        friday: { open: '10:00', close: '24:00' },
        saturday: { open: '09:00', close: '24:00' },
        sunday: { open: '09:00', close: '23:00' }
      },
      showOnCustomerPage: true,
      isActive: true,
    },
  })
  console.log('✅ Jakarta Location created:', jakartaLocation.name)

  // 7. Create Bandung Location for Demo
  const bandungLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Bandung Centrum',
      code: 'BDG',
      address: 'Jl. Gaming No. 456, Bandung',
      phone: '+62 813-7890-1234',
      email: 'bandung@demo.com',
      publicDescription: 'Rental PS dengan koleksi game terbaru dan makanan ringan terlengkap.',
      operationalHours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '24:00' },
        saturday: { open: '10:00', close: '24:00' },
        sunday: { open: '10:00', close: '23:00' }
      },
      showOnCustomerPage: true,
      isActive: true,
    },
  })
  console.log('✅ Bandung Location created:', bandungLocation.name)

  // 8. Create Staff for Jakarta
  const jakartaStaff = await prisma.user.create({
    data: {
      email: 'staff.jakarta@demo.com',
      name: 'Ahmad Jakarta',
      role: 'staff',
      tenantId: demoTenant.id,
      passwordHash: await bcrypt.hash('staff123', 12),
      firstName: 'Ahmad',
      lastName: 'Hidayat',
      phone: '+62 812-2222-3333',
      isActive: true,
    },
  })

  // 9. Create Staff for Bandung
  const bandungStaff = await prisma.user.create({
    data: {
      email: 'staff.bandung@demo.com',
      name: 'Budi Bandung',
      role: 'staff',
      tenantId: demoTenant.id,
      passwordHash: await bcrypt.hash('staff123', 12),
      firstName: 'Budi',
      lastName: 'Setiawan',
      phone: '+62 813-3333-4444',
      isActive: true,
    },
  })

  // 10. Assign staff to locations
  await prisma.userLocationAssignment.create({
    data: {
      userId: jakartaStaff.id,
      locationId: jakartaLocation.id,
      assignedBy: demoOwner.id,
      isActive: true,
    },
  })

  await prisma.userLocationAssignment.create({
    data: {
      userId: bandungStaff.id,
      locationId: bandungLocation.id,
      assignedBy: demoOwner.id,
      isActive: true,
    },
  })
  console.log('✅ Staff assigned to locations')

  // 11. Create Gaming Units for Jakarta
  const jakartaUnits = await prisma.unit.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS5 #1',
        consoleType: 'PlayStation 5',
        controllerCount: 2,
        status: 'available',
        hourlyRate: 18000,
        packageRates: {
          '3hours': 48000,
          '5hours': 75000,
          '8hours': 115000
        },
        specifications: {
          games: ['FIFA 24', 'Call of Duty', 'Spider-Man', 'God of War'],
          storage: '1TB SSD',
          resolution: '4K HDR'
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 5 Premium',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS5 #2',
        consoleType: 'PlayStation 5',
        controllerCount: 2,
        status: 'occupied',
        hourlyRate: 18000,
        packageRates: {
          '3hours': 48000,
          '5hours': 75000,
          '8hours': 115000
        },
        specifications: {
          games: ['FIFA 24', 'Tekken 8', 'GTA V', 'Minecraft'],
          storage: '1TB SSD',
          resolution: '4K HDR'
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 5 Premium',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS4 #1',
        consoleType: 'PlayStation 4',
        controllerCount: 2,
        status: 'available',
        hourlyRate: 15000,
        packageRates: {
          '3hours': 40000,
          '5hours': 65000,
          '8hours': 95000
        },
        specifications: {
          games: ['FIFA 23', 'PES 2023', 'GTA V', 'Mortal Kombat'],
          storage: '1TB HDD',
          resolution: '1080p'
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 4 Standard',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS4 #2',
        consoleType: 'PlayStation 4',
        controllerCount: 4,
        status: 'maintenance',
        hourlyRate: 15000,
        packageRates: {
          '3hours': 40000,
          '5hours': 65000,
          '8hours': 95000
        },
        specifications: {
          games: ['FIFA 23', 'Tekken 7', 'Street Fighter'],
          storage: '500GB HDD',
          resolution: '1080p'
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 4 Multiplayer',
        isActive: true,
      }
    ],
  })
  console.log('✅ Jakarta Units created:', jakartaUnits.count)

  // 12. Create F&B Categories
  const fnbCategory = await prisma.fnbCategory.create({
    data: {
      tenantId: demoTenant.id,
      locationId: jakartaLocation.id,
      name: 'Makanan & Minuman',
      description: 'Menu makanan dan minuman untuk gaming',
      displayOrder: 1,
      isActive: true,
    },
  })

  // 13. Create F&B Items
  await prisma.fnbItem.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: fnbCategory.id,
        name: 'Indomie Goreng',
        description: 'Indomie goreng spesial dengan telur',
        sellingPrice: 8000,
        costPrice: 3500,
        stockQuantity: 25,
        minStockAlert: 5,
        unitType: 'porsi',
        showOnCustomerPage: true,
        customerDisplayName: 'Indomie Goreng Special',
        customerDescription: 'Indomie goreng dengan telur mata sapi',
        displayOrder: 1,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: fnbCategory.id,
        name: 'Es Teh Manis',
        description: 'Es teh manis segar',
        sellingPrice: 4000,
        costPrice: 1500,
        stockQuantity: 50,
        minStockAlert: 10,
        unitType: 'gelas',
        showOnCustomerPage: true,
        customerDisplayName: 'Es Teh Manis',
        customerDescription: 'Teh manis dingin yang menyegarkan',
        displayOrder: 2,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: fnbCategory.id,
        name: 'Coca Cola',
        description: 'Coca Cola 330ml',
        sellingPrice: 6000,
        costPrice: 3000,
        stockQuantity: 0, // Habis stock
        minStockAlert: 5,
        unitType: 'kaleng',
        showOnCustomerPage: true,
        customerDisplayName: 'Coca Cola',
        customerDescription: 'Coca Cola dingin 330ml',
        displayOrder: 3,
        isActive: true,
      },
    ],
  })
  console.log('✅ F&B Items created')

  // 14. Create Customer Page Config
  await prisma.customerPageConfig.upsert({
    where: { 
      tenantId_locationId: { 
        tenantId: demoTenant.id, 
        locationId: jakartaLocation.id 
      }
    },
    update: {},
    create: {
      tenantId: demoTenant.id,
      locationId: jakartaLocation.id,
      showUnitStatus: true,
      showRemainingTime: true,
      showPricing: true,
      showFnbMenu: true,
      showContactInfo: true,
      unitStatusRefreshSeconds: 30,
      fnbMenuRefreshSeconds: 300,
      primaryColor: '#3B82F6',
      publicPhone: '+62 812-3456-7890',
      publicEmail: 'jakarta@demo.com',
      publicAddress: 'Jl. Gaming No. 123, Jakarta Pusat',
      whatsappNumber: '+6281234567890',
      isActive: true,
    },
  })
  console.log('✅ Customer Page Config created')

  // 15. Create Landing Page Config
  await prisma.landingPageConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'RentalPS Platform',
      companyDescription: 'Platform SaaS terlengkap untuk mengelola bisnis rental PlayStation Anda',
      starterPrice: 150000,
      starterFeatures: [
        'Multi-location support',
        '3 billing models',
        'F&B integration',
        'Basic reporting',
        'Customer pages'
      ],
      premiumPrice: 250000,
      premiumFeatures: [
        'All Starter features',
        'Custom domain',
        'Advanced reporting',
        'Priority support',
        'API access'
      ],
      enterprisePrice: 500000,
      enterpriseFeatures: [
        'All Premium features',
        'White-label solution',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee'
      ],
      contactPhone: '+62 812-1234-5678',
      contactEmail: 'hello@rentalps.com',
      contactWhatsapp: '+6281212345678',
      featuresList: [
        'Multi-tenant architecture',
        'Real-time unit monitoring',
        'Integrated F&B system',
        'Power outage emergency',
        'Mobile-responsive design'
      ],
      isActive: true,
    },
  })
  console.log('✅ Landing Page Config created')

  console.log('\n🎉 Seed data completed successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('👑 Super Admin: admin@rentalps.com / admin123')
  console.log('🏢 Demo Owner: owner@demo.com / owner123')
  console.log('👤 Jakarta Staff: staff.jakarta@demo.com / staff123')
  console.log('👤 Bandung Staff: staff.bandung@demo.com / staff123')
  console.log('\n🌐 Test URLs:')
  console.log('🏠 Landing: http://rentalps.local:3000')
  console.log('🏛️ Admin: http://admin.rentalps.local:3000')
  console.log('🏪 Demo: http://demo.rentalps.local:3000')
  console.log('🏪 PS Lounge: http://pslounge.rentalps.local:3000')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })