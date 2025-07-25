// prisma/seed.ts - Fixed for Updated Schema
import { PrismaClient, UserRole, ContactRole, UnitStatus, BillingType, SessionStatus, PaymentStatus, TransactionType, AuditEventType, AuditSeverity } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Create Super Admin User
  const hashedAdminPassword = await bcrypt.hash('admin123', 12)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@rentalps.com' },
    update: {},
    create: {
      email: 'admin@rentalps.com',
      name: 'Super Administrator',
      firstName: 'Super',
      lastName: 'Administrator',
      passwordHash: hashedAdminPassword,
      role: UserRole.super_admin,
      isActive: true,
    },
  })
  console.log('✅ Super Admin created')

  // 2. Create Demo Tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Gaming Center',
      subdomain: 'demo',
      customerPageEnabled: true,
      address: 'Jl. Demo Street No. 123, Jakarta',
      phone: '+62 812-3456-7890',
      settings: {
        businessType: 'gaming_center',
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        features: ['multi_location', 'fnb_management', 'customer_pages']
      },
      isActive: true,
    },
  })
  console.log('✅ Demo Tenant created')

  // 3. Create PS Lounge Tenant
  const pslTenant = await prisma.tenant.upsert({
    where: { subdomain: 'pslounge' },
    update: {},
    create: {
      name: 'PS Lounge Premium',
      subdomain: 'pslounge',
      customerPageEnabled: true,
      address: 'Jl. Premium Gaming No. 456, Bandung',
      phone: '+62 813-7890-1234',
      settings: {
        businessType: 'premium_gaming_center',
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        features: ['multi_location', 'fnb_management', 'customer_pages', 'premium_service']
      },
      isActive: true,
    },
  })
  console.log('✅ PS Lounge Tenant created')

  // 4. Create Locations
  const jakartaLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: "Jakarta Gaming Center",
      code: "JKT",
      address: "Jl. Gaming Plaza No. 123, Kuningan, Jakarta Selatan 12940",
      phone: "+62 812-3456-7890",
      email: "jakarta@demo.com",
      publicDescription: "Rental PlayStation terlengkap di Jakarta Selatan dengan suasana nyaman, AC full, dan koleksi game terbaru.",
      latitude: -6.225014,
      longitude: 106.820236,
      operationalHours: {
        monday: { open: "10:00", close: "23:00" },
        tuesday: { open: "10:00", close: "23:00" },
        wednesday: { open: "10:00", close: "23:00" },
        thursday: { open: "10:00", close: "23:00" },
        friday: { open: "10:00", close: "24:00" },
        saturday: { open: "09:00", close: "24:00" },
        sunday: { open: "09:00", close: "23:00" }
      },
      showOnCustomerPage: true,
      isActive: true,
    }
  })
  console.log('✅ Jakarta Location created')

  const bandungLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: "Bandung Gaming Center",
      code: "BDG",
      address: "Jl. Dago Raya No. 89, Coblong, Bandung 40135",
      phone: "+62 813-7890-1234",
      email: "bandung@demo.com",
      publicDescription: "Gaming center favorit di Bandung dengan atmosfer keren dan game-game terpopuler.",
      latitude: -6.899976,
      longitude: 107.618805,
      operationalHours: {
        monday: { open: "11:00", close: "23:00" },
        tuesday: { open: "11:00", close: "23:00" },
        wednesday: { open: "11:00", close: "23:00" },
        thursday: { open: "11:00", close: "23:00" },
        friday: { open: "11:00", close: "24:00" },
        saturday: { open: "10:00", close: "24:00" },
        sunday: { open: "10:00", close: "23:00" }
      },
      showOnCustomerPage: true,
      isActive: true,
    }
  })
  console.log('✅ Bandung Location created')

  const pslLocation = await prisma.location.create({
    data: {
      tenantId: pslTenant.id,
      name: "PS Lounge Bandung Premium",
      code: "PSL",
      address: "Jl. Setiabudhi No. 229, Isola, Sukasari, Bandung 40154",
      phone: "+62 813-7890-1234",
      email: "info@pslounge.com",
      publicDescription: "Premium gaming experience dengan console terbaru, snack premium, dan layanan VIP.",
      latitude: -6.874840,
      longitude: 107.599695,
      operationalHours: {
        monday: { open: "12:00", close: "24:00" },
        tuesday: { open: "12:00", close: "24:00" },
        wednesday: { open: "12:00", close: "24:00" },
        thursday: { open: "12:00", close: "24:00" },
        friday: { open: "12:00", close: "02:00" },
        saturday: { open: "10:00", close: "02:00" },
        sunday: { open: "10:00", close: "24:00" }
      },
      showOnCustomerPage: true,
      isActive: true,
    }
  })
  console.log('✅ PS Lounge Location created')

  // 5. Create Owner Users
  const hashedOwnerPassword = await bcrypt.hash('owner123', 12)
  const demoOwner = await prisma.user.create({
    data: {
      email: 'owner@demo.com',
      name: 'Demo Owner',
      firstName: 'Demo',
      lastName: 'Owner',
      passwordHash: hashedOwnerPassword,
      role: UserRole.owner,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  const pslOwner = await prisma.user.create({
    data: {
      email: 'owner@pslounge.com',
      name: 'PS Lounge Owner',
      firstName: 'PS Lounge',
      lastName: 'Owner',
      passwordHash: hashedOwnerPassword,
      role: UserRole.owner,
      tenantId: pslTenant.id,
      isActive: true,
    },
  })
  console.log('✅ Owner users created')

  // 6. Create Staff Users
  const hashedStaffPassword = await bcrypt.hash('staff123', 12)
  const jakartaStaff = await prisma.user.create({
    data: {
      email: 'staff.jakarta@demo.com',
      name: 'Jakarta Staff',
      firstName: 'Jakarta',
      lastName: 'Staff',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  const bandungStaff = await prisma.user.create({
    data: {
      email: 'staff.bandung@demo.com',
      name: 'Bandung Staff',
      firstName: 'Bandung',
      lastName: 'Staff',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  const pslStaff = await prisma.user.create({
    data: {
      email: 'staff@pslounge.com',
      name: 'PS Lounge Staff',
      firstName: 'PS Lounge',
      lastName: 'Staff',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: pslTenant.id,
      isActive: true,
    },
  })
  console.log('✅ Staff users created')

  // 7. Create Location Assignments
  await prisma.locationAssignment.createMany({
    data: [
      { userId: jakartaStaff.id, locationId: jakartaLocation.id, isActive: true },
      { userId: bandungStaff.id, locationId: bandungLocation.id, isActive: true },
      { userId: pslStaff.id, locationId: pslLocation.id, isActive: true },
    ]
  })
  console.log('✅ Location assignments created')

  // 8. Create F&B Categories
  const foodCategory = await prisma.fnbCategory.create({
    data: {
      locationId: jakartaLocation.id,
      name: 'Makanan',
      displayOrder: 1,
      isActive: true,
    }
  })

  const drinkCategory = await prisma.fnbCategory.create({
    data: {
      locationId: jakartaLocation.id,
      name: 'Minuman',
      displayOrder: 2,
      isActive: true,
    }
  })

  const snackCategory = await prisma.fnbCategory.create({
    data: {
      locationId: jakartaLocation.id,
      name: 'Snack',
      displayOrder: 3,
      isActive: true,
    }
  })
  console.log('✅ F&B Categories created')

  // 9. Create F&B Items
  await prisma.fnbItem.createMany({
    data: [
      // Makanan
      {
        locationId: jakartaLocation.id,
        categoryId: foodCategory.id,
        name: 'Indomie Goreng',
        description: 'Indomie goreng dengan telur dan sayuran',
        sellingPrice: 8000,
        costPrice: 3000,
        stockQuantity: 50,
        minStockAlert: 10,
        unitType: 'porsi',
        customerDisplayName: 'Indomie Goreng Special',
        customerDescription: '🍜 Indomie goreng dengan telur mata sapi dan sayuran segar',
        displayOrder: 1,
        showOnCustomerPage: true,
        isActive: true,
      },
      {
        locationId: jakartaLocation.id,
        categoryId: foodCategory.id,
        name: 'Nasi Goreng',
        description: 'Nasi goreng dengan ayam dan telur',
        sellingPrice: 15000,
        costPrice: 7000,
        stockQuantity: 30,
        minStockAlert: 5,
        unitType: 'porsi',
        customerDisplayName: 'Nasi Goreng Ayam',
        customerDescription: '🍚 Nasi goreng dengan potongan ayam dan telur dadar',
        displayOrder: 2,
        showOnCustomerPage: true,
        isActive: true,
      },
      // Minuman
      {
        locationId: jakartaLocation.id,
        categoryId: drinkCategory.id,
        name: 'Es Teh Manis',
        description: 'Es teh manis segar',
        sellingPrice: 4000,
        costPrice: 1000,
        stockQuantity: 100,
        minStockAlert: 20,
        unitType: 'gelas',
        customerDisplayName: 'Es Teh Manis',
        customerDescription: '🧊 Es teh manis segar untuk menghilangkan dahaga',
        displayOrder: 1,
        showOnCustomerPage: true,
        isActive: true,
      },
      {
        locationId: jakartaLocation.id,
        categoryId: drinkCategory.id,
        name: 'Kopi Hitam',
        description: 'Kopi hitam panas atau dingin',
        sellingPrice: 6000,
        costPrice: 2000,
        stockQuantity: 80,
        minStockAlert: 15,
        unitType: 'gelas',
        customerDisplayName: 'Kopi Hitam',
        customerDescription: '☕ Kopi hitam berkualitas, tersedia panas atau dingin',
        displayOrder: 2,
        showOnCustomerPage: true,
        isActive: true,
      },
      // Snack
      {
        locationId: jakartaLocation.id,
        categoryId: snackCategory.id,
        name: 'Keripik Kentang',
        description: 'Keripik kentang rasa original',
        sellingPrice: 5000,
        costPrice: 2500,
        stockQuantity: 60,
        minStockAlert: 12,
        unitType: 'bungkus',
        customerDisplayName: 'Keripik Kentang Original',
        customerDescription: '🥔 Keripik kentang renyah rasa original',
        displayOrder: 1,
        showOnCustomerPage: true,
        isActive: true,
      },
    ]
  })
  console.log('✅ F&B Items created')

  // 10. Create Gaming Units
  await prisma.unit.createMany({
    data: [
      // Jakarta Location Units
      {
        locationId: jakartaLocation.id,
        name: 'PS5 #1',
        consoleType: 'PlayStation 5',
        controllerCount: 2,
        status: UnitStatus.available,
        hourlyRate: 18000,
        customerDisplayName: 'PlayStation 5 Premium #1',
        specifications: {
          resolution: '4K HDR',
          storage: '825GB SSD',
          features: ['Ray Tracing', 'Tempest 3D AudioTech', 'Ultra High Speed SSD'],
          games: ['Spider-Man: Miles Morales', 'Demon\'s Souls', 'Ratchet & Clank: Rift Apart', 'FIFA 24', 'Call of Duty: Modern Warfare III'],
          accessories: ['DualSense Controller x2', 'PlayStation Camera', 'Premium Headset']
        },
        packageRates: {
          '2hours': 32000,
          '4hours': 60000,
          '6hours': 85000,
          '8hours': 108000
        },
        showOnCustomerPage: true,
        isActive: true,
      },
      {
        locationId: jakartaLocation.id,
        name: 'PS5 #2',
        consoleType: 'PlayStation 5',
        controllerCount: 4,
        status: UnitStatus.occupied,
        hourlyRate: 18000,
        customerDisplayName: 'PlayStation 5 Party #2',
        specifications: {
          resolution: '4K HDR',
          storage: '825GB SSD',
          features: ['Ray Tracing', 'Tempest 3D AudioTech', 'Ultra High Speed SSD', '4 Player Support'],
          games: ['FIFA 24', 'Tekken 8', 'Street Fighter 6', 'Gran Turismo 7', 'It Takes Two'],
          accessories: ['DualSense Controller x4', 'PlayStation Camera', 'Premium Sound System']
        },
        packageRates: {
          '2hours': 32000,
          '4hours': 60000,
          '6hours': 85000,
          '8hours': 108000
        },
        showOnCustomerPage: true,
        isActive: true,
      },
      {
        locationId: jakartaLocation.id,
        name: 'PS4 #1',
        consoleType: 'PlayStation 4 Pro',
        controllerCount: 2,
        status: UnitStatus.available,
        hourlyRate: 12000,
        customerDisplayName: 'PlayStation 4 Pro #1',
        specifications: {
          resolution: '4K upscaled',
          storage: '1TB HDD',
          features: ['Enhanced Graphics', 'HDR Support'],
          games: ['God of War', 'The Last of Us Part II', 'Ghost of Tsushima', 'FIFA 24', 'Grand Theft Auto V'],
          accessories: ['DualShock 4 Controller x2', 'Wireless Headset']
        },
        packageRates: {
          '2hours': 20000,
          '4hours': 38000,
          '6hours': 54000,
          '8hours': 68000
        },
        showOnCustomerPage: true,
        isActive: true,
      },
    ]
  })
  console.log('✅ Gaming units created')

  // 11. Create WhatsApp Contacts
  await prisma.whatsAppContact.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        userId: jakartaStaff.id,
        name: 'Jakarta Customer Service',
        whatsappNumber: '+6281234567890',
        role: ContactRole.staff,
        isPrimary: true,
        responseTime: 'Usually replies within minutes',
        availabilitySchedule: {
          available24_7: false,
          workingHours: {
            monday: { start: '10:00', end: '23:00' },
            tuesday: { start: '10:00', end: '23:00' },
            wednesday: { start: '10:00', end: '23:00' },
            thursday: { start: '10:00', end: '23:00' },
            friday: { start: '10:00', end: '24:00' },
            saturday: { start: '09:00', end: '24:00' },
            sunday: { start: '09:00', end: '23:00' }
          }
        },
        displayOrder: 1,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        userId: bandungStaff.id,
        name: 'Bandung Customer Service',
        whatsappNumber: '+6281234567891',
        role: ContactRole.staff,
        isPrimary: true,
        responseTime: 'Usually replies within minutes',
        availabilitySchedule: {
          available24_7: false,
          workingHours: {
            monday: { start: '11:00', end: '23:00' },
            tuesday: { start: '11:00', end: '23:00' },
            wednesday: { start: '11:00', end: '23:00' },
            thursday: { start: '11:00', end: '23:00' },
            friday: { start: '11:00', end: '24:00' },
            saturday: { start: '10:00', end: '24:00' },
            sunday: { start: '10:00', end: '23:00' }
          }
        },
        displayOrder: 1,
        isActive: true,
      },
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        userId: pslStaff.id,
        name: 'PS Lounge VIP Service',
        whatsappNumber: '+6281234567893',
        role: ContactRole.staff,
        isPrimary: true,
        responseTime: 'Usually replies instantly',
        availabilitySchedule: {
          available24_7: false,
          workingHours: {
            monday: { start: '12:00', end: '24:00' },
            tuesday: { start: '12:00', end: '24:00' },
            wednesday: { start: '12:00', end: '24:00' },
            thursday: { start: '12:00', end: '24:00' },
            friday: { start: '12:00', end: '02:00' },
            saturday: { start: '10:00', end: '02:00' },
            sunday: { start: '10:00', end: '24:00' }
          }
        },
        displayOrder: 1,
        isActive: true,
      }
    ]
  })
  console.log('✅ WhatsApp Contacts created')

  // 12. Create Customer Page Configs
  await prisma.customerPageConfig.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        showUnitStatus: true,
        showRemainingTime: true,
        showPricing: true,
        showFnbMenu: true,
        showContactInfo: true,
        showMaps: true,
        showOperationalHours: true,
        unitStatusRefreshSeconds: 30,
        fnbMenuRefreshSeconds: 300,
        primaryColor: '#3B82F6',
        publicPhone: '+62 812-3456-7890',
        publicEmail: 'jakarta@demo.com',
        publicAddress: 'Jl. Gaming Plaza No. 123, Kuningan, Jakarta Selatan 12940',
        whatsappNumber: '+6281234567890',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        showUnitStatus: true,
        showRemainingTime: true,
        showPricing: true,
        showFnbMenu: true,
        showContactInfo: true,
        showMaps: true,
        showOperationalHours: true,
        unitStatusRefreshSeconds: 30,
        fnbMenuRefreshSeconds: 300,
        primaryColor: '#10B981',
        publicPhone: '+62 813-7890-1234',
        publicEmail: 'bandung@demo.com',
        publicAddress: 'Jl. Dago Raya No. 89, Coblong, Bandung 40135',
        whatsappNumber: '+6281234567891',
        isActive: true,
      },
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        showUnitStatus: true,
        showRemainingTime: true,
        showPricing: true,
        showFnbMenu: true,
        showContactInfo: true,
        showMaps: true,
        showOperationalHours: true,
        unitStatusRefreshSeconds: 15,
        fnbMenuRefreshSeconds: 180,
        primaryColor: '#8B5CF6',
        publicPhone: '+62 813-7890-1234',
        publicEmail: 'info@pslounge.com',
        publicAddress: 'Jl. Setiabudhi No. 229, Isola, Sukasari, Bandung 40154',
        whatsappNumber: '+6281234567893',
        isActive: true,
      }
    ]
  })
  console.log('✅ Customer Page Configs created')

  // 13. Create Landing Page Config
  await prisma.landingPageConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'RentalPS Platform',
      companyDescription: 'Platform SaaS terlengkap untuk mengelola bisnis rental PlayStation Anda dengan fitur advanced dan real-time monitoring.',
      starterPrice: 150000,
      starterFeatures: [
        'Multi-location support',
        '3 billing models (Timer, Hourly, Package)',
        'F&B management system',
        'Basic reporting & analytics',
        'Customer information pages',
        'WhatsApp contact integration',
        'Real-time unit monitoring'
      ],
      premiumPrice: 250000,
      premiumFeatures: [
        'All Starter features',
        'Custom domain support',
        'Advanced reporting & analytics',
        'Priority WhatsApp support',
        'API access',
        'Audit logs & security',
        'Enhanced customer pages'
      ],
      enterprisePrice: 500000,
      enterpriseFeatures: [
        'All Premium features',
        'White-label solution',
        'Custom integrations',
        'Dedicated support team',
        'SLA guarantee (99.9% uptime)',
        'Advanced audit & compliance',
        'Enterprise-grade security'
      ],
      contactPhone: '+62 812-1234-5678',
      contactEmail: 'hello@rentalps.com',
      contactWhatsapp: '+6281212345678',
      featuresList: [
        'Multi-tenant architecture',
        'Real-time unit monitoring',
        'Integrated F&B system',
        'Power outage emergency handling',
        'Mobile-responsive design',
        'WhatsApp business integration',
        'Comprehensive audit logging',
        'Failed login rate limiting'
      ],
      isActive: true,
    },
  })
  console.log('✅ Landing Page Config created')

  // 14. Create Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        eventType: AuditEventType.SYSTEM_MAINTENANCE,
        severity: AuditSeverity.MEDIUM,
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'Database Seeder',
        subdomain: null,
        requestPath: '/database/seed',
        requestMethod: 'POST',
        resourceType: 'database',
        resourceId: 'initial_seed',
        metadata: {
          operation: 'database_seeding',
          tables_created: ['users', 'tenants', 'locations', 'units', 'fnb_items', 'audit_logs'],
          environment: 'development'
        },
        responseTime: 0,
        timestamp: new Date(),
      },
      {
        eventType: AuditEventType.USER_CREATED,
        severity: AuditSeverity.MEDIUM,
        success: true,
        userId: superAdmin.id,
        email: superAdmin.email,
        userRole: UserRole.super_admin,
        ipAddress: '127.0.0.1',
        userAgent: 'Database Seeder',
        resourceType: 'user',
        resourceId: superAdmin.id,
        newValues: {
          email: superAdmin.email,
          role: 'super_admin',
          name: superAdmin.name
        },
        metadata: {
          created_during: 'database_seeding',
          user_type: 'super_admin'
        },
        responseTime: 0,
        timestamp: new Date(),
      }
    ]
  })
  console.log('✅ Initial Audit Logs created')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📋 Created Data Summary:')
  console.log('- 1 Super Admin user')
  console.log('- 2 Tenants (demo, pslounge)')
  console.log('- 3 Locations (Jakarta, Bandung, PS Lounge)')
  console.log('- 5 Users (1 super admin, 2 owners, 3 staff)')
  console.log('- 3 Gaming units')
  console.log('- 3 F&B categories')
  console.log('- 5 F&B items')
  console.log('- 3 WhatsApp contacts')
  console.log('- 3 Customer page configs')
  console.log('- 1 Landing page config')
  console.log('- 2 Initial audit logs')
  console.log('\n🔑 Test Credentials:')
  console.log('Super Admin: admin@rentalps.com / admin123')
  console.log('Demo Owner: owner@demo.com / owner123')
  console.log('Jakarta Staff: staff.jakarta@demo.com / staff123')
  console.log('Bandung Staff: staff.bandung@demo.com / staff123')
  console.log('PS Lounge Staff: staff@pslounge.com / staff123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })