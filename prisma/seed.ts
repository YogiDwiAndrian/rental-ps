// prisma/seed.ts - ENHANCED VERSION
import { PrismaClient, ContactRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting enhanced seed process...')

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
      address: 'Jl. Gaming Plaza No. 123, Jakarta Selatan',
      phone: '+62 812-3456-7890',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        businessHours: {
          open: '10:00',
          close: '23:00'
        },
        features: {
          whatsappIntegration: true,
          mapsIntegration: true,
          realTimeUpdates: true
        }
      },
      isActive: true,
    },
  })
  console.log('✅ Demo Tenant created:', demoTenant.subdomain)

  // 3. Create PS Lounge Tenant (Enhanced)
  const pslTenant = await prisma.tenant.upsert({
    where: { subdomain: 'pslounge' },
    update: {},
    create: {
      name: 'PS Lounge Premium',
      subdomain: 'pslounge',
      customerPageEnabled: true,
      address: 'Jl. PlayStation Boulevard No. 456, Bandung',
      phone: '+62 813-7890-1234',
      settings: {
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        businessHours: {
          open: '11:00',
          close: '24:00'
        },
        features: {
          whatsappIntegration: true,
          mapsIntegration: true,
          premiumServices: true
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
      firstName: 'Ahmad',
      lastName: 'Setiawan',
      phone: '+62 812-1111-2222',
      isActive: true,
    },
  })
  console.log('✅ Demo Owner created:', demoOwner.email)

  // 5. Create Owner for PS Lounge
  const pslOwner = await prisma.user.upsert({
    where: { email: 'owner@pslounge.com' },
    update: {},
    create: {
      email: 'owner@pslounge.com',
      name: 'PS Lounge Owner',
      role: 'owner',
      tenantId: pslTenant.id,
      passwordHash: await bcrypt.hash('owner123', 12),
      firstName: 'Budi',
      lastName: 'Hartono',
      phone: '+62 813-2222-3333',
      isActive: true,
    },
  })
  console.log('✅ PS Lounge Owner created:', pslOwner.email)

  // 6. Update tenant owners
  await prisma.tenant.update({
    where: { id: demoTenant.id },
    data: { ownerId: demoOwner.id }
  })

  await prisma.tenant.update({
    where: { id: pslTenant.id },
    data: { ownerId: pslOwner.id }
  })

  // 7. Create Enhanced Locations for Demo Tenant
  const jakartaLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Jakarta Gaming Center',
      code: 'JKT',
      address: 'Jl. Gaming Plaza No. 123, Kuningan, Jakarta Selatan 12940',
      phone: '+62 812-3456-7890',
      email: 'jakarta@demo.com',
      publicDescription: 'Rental PlayStation terlengkap di Jakarta Selatan dengan suasana nyaman, AC full, dan koleksi game terbaru.',
      // Enhanced coordinates for Kuningan area
      latitude: -6.225014,
      longitude: 106.820236,
      mapsPlaceId: 'ChIJzxZlDhFQaS4RXFx_DnJFFNg', // Example Place ID
      timezone: 'Asia/Jakarta',
      operationalHours: {
        monday: { open: '10:00', close: '23:00' },
        tuesday: { open: '10:00', close: '23:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '10:00', close: '23:00' },
        friday: { open: '10:00', close: '24:00' },
        saturday: { open: '09:00', close: '24:00' },
        sunday: { open: '09:00', close: '23:00' }
      },
      settings: {
        parkingAvailable: true,
        wifiPassword: 'gaming123',
        facilities: ['AC', 'Sound System', 'Comfortable Seating', 'Snack Bar']
      },
      showOnCustomerPage: true,
      isActive: true,
    },
  })
  console.log('✅ Jakarta Location created:', jakartaLocation.name)

  const bandungLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Bandung Gaming Hub',
      code: 'BDG',
      address: 'Jl. Dago Raya No. 89, Coblong, Bandung 40135',
      phone: '+62 813-7890-1234',
      email: 'bandung@demo.com',
      publicDescription: 'Gaming center dengan atmosfer cozy di jantung kota Bandung. Dilengkapi setup gaming premium dan menu F&B terlengkap.',
      // Bandung Dago coordinates
      latitude: -6.869598,
      longitude: 107.613144,
      mapsPlaceId: 'ChIJ67gdthX8aS4R9m5qNmP4_bg',
      timezone: 'Asia/Jakarta',
      operationalHours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '24:00' },
        saturday: { open: '10:00', close: '24:00' },
        sunday: { open: '10:00', close: '23:00' }
      },
      settings: {
        parkingAvailable: true,
        wifiPassword: 'bandung123',
        facilities: ['AC', 'Premium Sound', 'Gaming Chairs', 'Food Court']
      },
      showOnCustomerPage: true,
      isActive: true,
    },
  })
  console.log('✅ Bandung Location created:', bandungLocation.name)

  // 8. Create PS Lounge Location
  const pslLocation = await prisma.location.create({
    data: {
      tenantId: pslTenant.id,
      name: 'PS Lounge Bandung',
      code: 'PSL',
      address: 'Jl. Setiabudhi No. 229, Isola, Sukasari, Bandung 40154',
      phone: '+62 813-7890-1234',
      email: 'info@pslounge.com',
      publicDescription: 'Premium gaming lounge dengan setup high-end dan service berkualitas tinggi. Experience gaming like never before.',
      // Setiabudhi coordinates
      latitude: -6.873200,
      longitude: 107.590000,
      mapsPlaceId: 'ChIJ8xgKthX8aS4R8k2qNmP4_ch',
      timezone: 'Asia/Jakarta',
      operationalHours: {
        monday: { open: '12:00', close: '24:00' },
        tuesday: { open: '12:00', close: '24:00' },
        wednesday: { open: '12:00', close: '24:00' },
        thursday: { open: '12:00', close: '24:00' },
        friday: { open: '12:00', close: '02:00' },
        saturday: { open: '10:00', close: '02:00' },
        sunday: { open: '10:00', close: '24:00' }
      },
      settings: {
        parkingAvailable: true,
        vipRooms: true,
        premiumService: true,
        facilities: ['Premium AC', 'Surround Sound', 'Gaming Thrones', 'Premium Menu']
      },
      showOnCustomerPage: true,
      isActive: true,
    },
  })
  console.log('✅ PS Lounge Location created:', pslLocation.name)

  // 9. Create Staff for Demo Tenant
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

  const pslStaff = await prisma.user.create({
    data: {
      email: 'staff@pslounge.com',
      name: 'Citra PS Lounge',
      role: 'staff',
      tenantId: pslTenant.id,
      passwordHash: await bcrypt.hash('staff123', 12),
      firstName: 'Citra',
      lastName: 'Dewi',
      phone: '+62 814-4444-5555',
      isActive: true,
    },
  })

  // 10. Assign staff to locations
  await prisma.userLocationAssignment.createMany({
    data: [
      {
        userId: jakartaStaff.id,
        locationId: jakartaLocation.id,
        assignedBy: demoOwner.id,
        isActive: true,
      },
      {
        userId: bandungStaff.id,
        locationId: bandungLocation.id,
        assignedBy: demoOwner.id,
        isActive: true,
      },
      {
        userId: pslStaff.id,
        locationId: pslLocation.id,
        assignedBy: pslOwner.id,
        isActive: true,
      }
    ]
  })
  console.log('✅ Staff assigned to locations')

  // 11. Create WhatsApp Contacts
  await prisma.whatsAppContact.createMany({
    data: [
      // Demo Tenant Contacts
      {
        tenantId: demoTenant.id,
        locationId: null, // Global contact
        userId: demoOwner.id,
        name: 'Ahmad Setiawan (Owner)',
        whatsappNumber: '+6281234567890',
        role: 'owner' as ContactRole,
        isPrimary: true,
        responseTime: '5 minutes',
        displayOrder: 1,
        notes: 'Main owner contact - available 24/7 for urgent matters',
        availabilitySchedule: {
          available24_7: true,
          preferredHours: '09:00-22:00'
        }
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        userId: jakartaStaff.id,
        name: 'Ahmad Jakarta',
        whatsappNumber: '+6281234567891',
        role: 'staff' as ContactRole,
        isPrimary: false,
        responseTime: '10 minutes',
        displayOrder: 2,
        notes: 'Jakarta location staff - gaming expert',
        availabilitySchedule: {
          workingHours: {
            monday: { start: '10:00', end: '23:00' },
            tuesday: { start: '10:00', end: '23:00' },
            wednesday: { start: '10:00', end: '23:00' },
            thursday: { start: '10:00', end: '23:00' },
            friday: { start: '10:00', end: '24:00' },
            saturday: { start: '09:00', end: '24:00' },
            sunday: { start: '09:00', end: '23:00' }
          }
        }
      },
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        userId: bandungStaff.id,
        name: 'Budi Bandung',
        whatsappNumber: '+6281234567892',
        role: 'staff' as ContactRole,
        isPrimary: false,
        responseTime: '15 minutes',
        displayOrder: 3,
        notes: 'Bandung location staff - friendly and helpful',
        availabilitySchedule: {
          workingHours: {
            monday: { start: '11:00', end: '23:00' },
            tuesday: { start: '11:00', end: '23:00' },
            wednesday: { start: '11:00', end: '23:00' },
            thursday: { start: '11:00', end: '23:00' },
            friday: { start: '11:00', end: '24:00' },
            saturday: { start: '10:00', end: '24:00' },
            sunday: { start: '10:00', end: '23:00' }
          }
        }
      },
      // PS Lounge Contacts
      {
        tenantId: pslTenant.id,
        locationId: null, // Global contact
        userId: pslOwner.id,
        name: 'Budi Hartono (Owner)',
        whatsappNumber: '+6281234567893',
        role: 'owner' as ContactRole,
        isPrimary: true,
        responseTime: '3 minutes',
        displayOrder: 1,
        notes: 'PS Lounge owner - premium service specialist',
        availabilitySchedule: {
          available24_7: true,
          premiumSupport: true
        }
      },
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        userId: pslStaff.id,
        name: 'Citra Premium Support',
        whatsappNumber: '+6281234567894',
        role: 'staff' as ContactRole,
        isPrimary: false,
        responseTime: '5 minutes',
        displayOrder: 2,
        notes: 'Premium gaming consultant and customer service',
        availabilitySchedule: {
          workingHours: {
            monday: { start: '12:00', end: '24:00' },
            tuesday: { start: '12:00', end: '24:00' },
            wednesday: { start: '12:00', end: '24:00' },
            thursday: { start: '12:00', end: '24:00' },
            friday: { start: '12:00', end: '02:00' },
            saturday: { start: '10:00', end: '02:00' },
            sunday: { start: '10:00', end: '24:00' }
          }
        }
      }
    ]
  })
  console.log('✅ WhatsApp Contacts created')

  // 12. Create Enhanced Gaming Units for Jakarta
  const jakartaUnits = await prisma.unit.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS5 Premium #1',
        consoleType: 'PlayStation 5',
        controllerCount: 2,
        status: 'available',
        hourlyRate: 20000,
        packageRates: {
          '2hours': 35000,
          '3hours': 50000,
          '5hours': 80000,
          '8hours': 120000
        },
        specifications: {
          games: [
            'FIFA 24', 'Call of Duty: Modern Warfare III', 
            'Spider-Man 2', 'God of War Ragnarök', 
            'Horizon Forbidden West', 'Gran Turismo 7',
            'The Last of Us Part I', 'Ratchet & Clank: Rift Apart',
            'Demon\'s Souls', 'Returnal'
          ],
          storage: '1TB SSD',
          resolution: '4K HDR 120fps',
          features: ['Ray Tracing', 'Haptic Feedback', '3D Audio'],
          accessories: ['DualSense Controller x2', 'Headset', 'Charging Station']
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 5 Premium Setup',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS5 Premium #2',
        consoleType: 'PlayStation 5',
        controllerCount: 4,
        status: 'occupied',
        hourlyRate: 20000,
        packageRates: {
          '2hours': 35000,
          '3hours': 50000,
          '5hours': 80000,
          '8hours': 120000
        },
        specifications: {
          games: [
            'FIFA 24', 'Tekken 8', 'Street Fighter 6',
            'Mortal Kombat 1', 'It Takes Two', 'Fall Guys',
            'Overcooked! All You Can Eat', 'Moving Out 2',
            'Gang Beasts', 'Rocket League'
          ],
          storage: '1TB SSD',
          resolution: '4K HDR 120fps',
          features: ['Multiplayer Ready', '4 Controllers', 'Party Games'],
          accessories: ['DualSense Controller x4', 'Gaming Headsets x4']
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 5 Party Setup',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS4 Pro #1',
        consoleType: 'PlayStation 4 Pro',
        controllerCount: 2,
        status: 'available',
        hourlyRate: 15000,
        packageRates: {
          '2hours': 28000,
          '3hours': 40000,
          '5hours': 65000,
          '8hours': 95000
        },
        specifications: {
          games: [
            'FIFA 23', 'PES 2023', 'GTA V', 'Red Dead Redemption 2',
            'The Witcher 3', 'Assassin\'s Creed Valhalla',
            'Marvel\'s Spider-Man', 'Horizon Zero Dawn'
          ],
          storage: '1TB HDD',
          resolution: '4K Pro Enhanced',
          features: ['HDR Gaming', 'Boost Mode'],
          accessories: ['DualShock 4 x2', 'Gaming Headset']
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 4 Pro Enhanced',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        name: 'PS4 Standard #1',
        consoleType: 'PlayStation 4',
        controllerCount: 2,
        status: 'maintenance',
        hourlyRate: 12000,
        packageRates: {
          '2hours': 22000,
          '3hours': 32000,
          '5hours': 50000,
          '8hours': 75000
        },
        specifications: {
          games: [
            'FIFA 22', 'Tekken 7', 'Street Fighter V',
            'Mortal Kombat 11', 'Minecraft', 'Fortnite'
          ],
          storage: '500GB HDD',
          resolution: '1080p Full HD',
          features: ['Online Gaming', 'Share Play'],
          accessories: ['DualShock 4 x2']
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 4 Standard',
        isActive: true,
      }
    ],
  })
  console.log('✅ Jakarta Units created:', jakartaUnits.count)

  // 13. Create Units for Bandung
  await prisma.unit.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        name: 'PS5 Digital #1',
        consoleType: 'PlayStation 5 Digital',
        controllerCount: 2,
        status: 'available',
        hourlyRate: 18000,
        packageRates: {
          '2hours': 33000,
          '3hours': 47000,
          '5hours': 75000,
          '8hours': 110000
        },
        specifications: {
          games: [
            'FIFA 24', 'Call of Duty: Modern Warfare III',
            'Assassin\'s Creed Mirage', 'Spider-Man 2',
            'Baldur\'s Gate 3', 'Cyberpunk 2077'
          ],
          storage: '825GB SSD',
          resolution: '4K HDR',
          features: ['Digital Only', 'Fast Loading', 'Ray Tracing'],
          accessories: ['DualSense Controller x2', 'Headset']
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 5 Digital Edition',
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        name: 'PS4 Slim #1',
        consoleType: 'PlayStation 4 Slim',
        controllerCount: 4,
        status: 'available',
        hourlyRate: 13000,
        packageRates: {
          '2hours': 24000,
          '3hours': 35000,
          '5hours': 55000,
          '8hours': 80000
        },
        specifications: {
          games: [
            'FIFA 23', 'PES 2023', 'Tekken 7',
            'It Takes Two', 'Overcooked! 2', 'Moving Out'
          ],
          storage: '1TB HDD',
          resolution: '1080p Full HD',
          features: ['Slim Design', 'Energy Efficient'],
          accessories: ['DualShock 4 x4']
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 4 Slim Multiplayer',
        isActive: true,
      }
    ]
  })
  console.log('✅ Bandung Units created')

  // 14. Create PS Lounge Premium Units
  await prisma.unit.createMany({
    data: [
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        name: 'PS5 VIP Suite #1',
        consoleType: 'PlayStation 5',
        controllerCount: 2,
        status: 'available',
        hourlyRate: 30000,
        packageRates: {
          '2hours': 55000,
          '3hours': 80000,
          '5hours': 125000,
          '8hours': 190000
        },
        specifications: {
          games: [
            'FIFA 24', 'Call of Duty: Modern Warfare III',
            'Spider-Man 2', 'God of War Ragnarök',
            'The Last of Us Part I', 'Horizon Forbidden West',
            'Gran Turismo 7', 'Demon\'s Souls'
          ],
          storage: '2TB SSD',
          resolution: '4K HDR 120fps',
          features: [
            'Premium VIP Room', 'Surround Sound', 
            'Massage Chair', 'Private AC', 
            'Complimentary Drinks'
          ],
          accessories: [
            'DualSense Controller x2', 
            'Premium Headset', 
            'Gaming Chair with Massage'
          ]
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 5 VIP Experience',
        isActive: true,
      },
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        name: 'PS5 Premium #1',
        consoleType: 'PlayStation 5',
        controllerCount: 4,
        status: 'occupied',
        hourlyRate: 25000,
        packageRates: {
          '2hours': 45000,
          '3hours': 65000,
          '5hours': 105000,
          '8hours': 160000
        },
        specifications: {
          games: [
            'FIFA 24', 'Tekken 8', 'Street Fighter 6',
            'Mortal Kombat 1', 'It Takes Two'
          ],
          storage: '1TB SSD',
          resolution: '4K HDR',
          features: ['Premium Setup', 'Party Ready'],
          accessories: ['DualSense Controller x4']
        },
        showOnCustomerPage: true,
        customerDisplayName: 'PlayStation 5 Premium Party',
        isActive: true,
      }
    ]
  })
  console.log('✅ PS Lounge Units created')

  // 15. Create F&B Categories and Items
  const demoFnbCategory = await prisma.fnbCategory.create({
    data: {
      tenantId: demoTenant.id,
      locationId: jakartaLocation.id,
      name: 'Makanan & Minuman',
      description: 'Menu makanan dan minuman segar untuk gaming session',
      displayOrder: 1,
      isActive: true,
    },
  })

  const demoDrinksCategory = await prisma.fnbCategory.create({
    data: {
      tenantId: demoTenant.id,
      locationId: jakartaLocation.id,
      name: 'Minuman Segar',
      description: 'Berbagai pilihan minuman untuk menemani gaming',
      displayOrder: 2,
      isActive: true,
    },
  })

  const pslFnbCategory = await prisma.fnbCategory.create({
    data: {
      tenantId: pslTenant.id,
      locationId: pslLocation.id,
      name: 'Premium Menu',
      description: 'Menu premium untuk gaming experience terbaik',
      displayOrder: 1,
      isActive: true,
    },
  })

  // Demo F&B Items
  await prisma.fnbItem.createMany({
    data: [
      // Jakarta Demo Items
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: demoFnbCategory.id,
        name: 'Indomie Goreng Special',
        description: 'Indomie goreng dengan telur dan sosis',
        sellingPrice: 12000,
        costPrice: 5000,
        stockQuantity: 30,
        minStockAlert: 5,
        unitType: 'porsi',
        showOnCustomerPage: true,
        customerDisplayName: 'Indomie Goreng Special',
        customerDescription: 'Indomie goreng dengan telur mata sapi dan sosis',
        displayOrder: 1,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: demoFnbCategory.id,
        name: 'Nasi Goreng Gaming',
        description: 'Nasi goreng porsi besar untuk gamer',
        sellingPrice: 18000,
        costPrice: 8000,
        stockQuantity: 20,
        minStockAlert: 3,
        unitType: 'porsi',
        showOnCustomerPage: true,
        customerDisplayName: 'Nasi Goreng Gaming',
        customerDescription: 'Nasi goreng spesial dengan ayam dan kerupuk',
        displayOrder: 2,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: demoDrinksCategory.id,
        name: 'Es Teh Manis',
        description: 'Es teh manis segar',
        sellingPrice: 5000,
        costPrice: 2000,
        stockQuantity: 50,
        minStockAlert: 10,
        unitType: 'gelas',
        showOnCustomerPage: true,
        customerDisplayName: 'Es Teh Manis',
        customerDescription: 'Teh manis dingin yang menyegarkan',
        displayOrder: 1,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: demoDrinksCategory.id,
        name: 'Coca Cola',
        description: 'Coca Cola 330ml dingin',
        sellingPrice: 8000,
        costPrice: 4000,
        stockQuantity: 0, // Out of stock for testing
        minStockAlert: 5,
        unitType: 'kaleng',
        showOnCustomerPage: true,
        customerDisplayName: 'Coca Cola',
        customerDescription: 'Coca Cola dingin 330ml',
        displayOrder: 2,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        categoryId: demoDrinksCategory.id,
        name: 'Energy Drink Gaming',
        description: 'Energy drink untuk boost gaming performance',
        sellingPrice: 15000,
        costPrice: 7000,
        stockQuantity: 25,
        minStockAlert: 5,
        unitType: 'kaleng',
        showOnCustomerPage: true,
        customerDisplayName: 'Gaming Energy Boost',
        customerDescription: 'Energy drink premium untuk gaming marathon',
        displayOrder: 3,
        isActive: true,
      },
      // PS Lounge Premium Items
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        categoryId: pslFnbCategory.id,
        name: 'Premium Wagyu Burger',
        description: 'Burger wagyu premium dengan kentang',
        sellingPrice: 45000,
        costPrice: 25000,
        stockQuantity: 15,
        minStockAlert: 3,
        unitType: 'porsi',
        showOnCustomerPage: true,
        customerDisplayName: 'Premium Wagyu Burger',
        customerDescription: 'Burger wagyu premium dengan kentang truffle',
        displayOrder: 1,
        isActive: true,
      },
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        categoryId: pslFnbCategory.id,
        name: 'Artisan Coffee',
        description: 'Kopi artisan premium blend',
        sellingPrice: 25000,
        costPrice: 10000,
        stockQuantity: 30,
        minStockAlert: 5,
        unitType: 'cup',
        showOnCustomerPage: true,
        customerDisplayName: 'Premium Artisan Coffee',
        customerDescription: 'Single origin coffee dengan premium blend',
        displayOrder: 2,
        isActive: true,
      },
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        categoryId: pslFnbCategory.id,
        name: 'Japanese Matcha Latte',
        description: 'Matcha latte premium dari Jepang',
        sellingPrice: 30000,
        costPrice: 15000,
        stockQuantity: 2, // Low stock for testing
        minStockAlert: 5,
        unitType: 'cup',
        showOnCustomerPage: true,
        customerDisplayName: 'Premium Matcha Latte',
        customerDescription: 'Authentic Japanese matcha dengan premium milk',
        displayOrder: 3,
        isActive: true,
      }
    ],
  })
  console.log('✅ F&B Items created')

  // 16. Create Customer Page Configurations
  await prisma.customerPageConfig.createMany({
    data: [
      // Demo Jakarta Config
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
      // Demo Bandung Config
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
      // PS Lounge Config
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
        unitStatusRefreshSeconds: 15, // Faster refresh for premium
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

  // 17. Create Enhanced Landing Page Config
  await prisma.landingPageConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'RentalPS Platform',
      companyDescription: 'Platform SaaS terlengkap untuk mengelola bisnis rental PlayStation Anda dengan fitur WhatsApp integration, Google Maps, dan real-time monitoring.',
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
        'Google Maps integration',
        'Advanced reporting & analytics',
        'Priority WhatsApp support',
        'API access',
        'Operational hours management',
        'Enhanced customer pages'
      ],
      enterprisePrice: 500000,
      enterpriseFeatures: [
        'All Premium features',
        'White-label solution',
        'Custom integrations',
        'Dedicated support team',
        'SLA guarantee (99.9% uptime)',
        'Advanced analytics & insights',
        'Multi-tenant management',
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
        'Google Maps integration',
        'Advanced customer analytics'
      ],
      isActive: true,
    },
  })
  console.log('✅ Enhanced Landing Page Config created')

  // 18. Create Sample Active Sessions (for testing occupied units)
  const activeSession1 = await prisma.rentalSession.create({
    data: {
      tenantId: demoTenant.id,
      locationId: jakartaLocation.id,
      unitId: (await prisma.unit.findFirst({ 
        where: { name: 'PS5 Premium #2', locationId: jakartaLocation.id } 
      }))!.id,
      staffId: jakartaStaff.id,
      billingModel: 'package',
      startTime: new Date(Date.now() - 60 * 60 * 1000), // Started 1 hour ago
      purchasedDuration: 180, // 3 hours package
      extendedDuration: 0,
      sessionIdentifier: 'DEMO-001',
      psAmount: 50000,
      fnbAmount: 0,
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      notes: 'Family gaming session - 3 hour package',
    },
  })

  const activeSession2 = await prisma.rentalSession.create({
    data: {
      tenantId: pslTenant.id,
      locationId: pslLocation.id,
      unitId: (await prisma.unit.findFirst({ 
        where: { name: 'PS5 Premium #1', locationId: pslLocation.id } 
      }))!.id,
      staffId: pslStaff.id,
      billingModel: 'hourly',
      startTime: new Date(Date.now() - 45 * 60 * 1000), // Started 45 minutes ago
      purchasedDuration: 120, // 2 hours
      extendedDuration: 60, // Extended 1 hour
      sessionIdentifier: 'PSL-001',
      psAmount: 90000,
      fnbAmount: 0,
      status: 'active',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      notes: 'VIP customer - extended session',
    },
  })

  console.log('✅ Sample active sessions created')

  console.log('\n🎉 Enhanced seed data completed successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('👑 Super Admin: admin@rentalps.com / admin123')
  console.log('🏢 Demo Owner: owner@demo.com / owner123')
  console.log('🏢 PS Lounge Owner: owner@pslounge.com / owner123')
  console.log('👤 Jakarta Staff: staff.jakarta@demo.com / staff123')
  console.log('👤 Bandung Staff: staff.bandung@demo.com / staff123')
  console.log('👤 PS Lounge Staff: staff@pslounge.com / staff123')
  
  console.log('\n📱 WhatsApp Contacts:')
  console.log('📞 Demo Owner: +6281234567890')
  console.log('📞 Jakarta Staff: +6281234567891')
  console.log('📞 Bandung Staff: +6281234567892')
  console.log('📞 PS Lounge Owner: +6281234567893')
  console.log('📞 PS Lounge Staff: +6281234567894')
  
  console.log('\n🌐 Test URLs:')
  console.log('🏠 Landing: http://rentalps.local:3000')
  console.log('🏛️ Admin: http://admin.rentalps.local:3000')
  console.log('🏪 Demo: http://demo.rentalps.local:3000')
  console.log('🏪 PS Lounge: http://pslounge.rentalps.local:3000')
  
  console.log('\n🗺️ Maps Integration:')
  console.log('📍 Jakarta: -6.225014, 106.820236 (Kuningan)')
  console.log('📍 Bandung: -6.869598, 107.613144 (Dago)')
  console.log('📍 PS Lounge: -6.873200, 107.590000 (Setiabudhi)')
  
  console.log('\n🎮 Sample Data:')
  console.log('📊 2 Tenants with complete data')
  console.log('📍 3 Locations with coordinates')
  console.log('🎮 8 Gaming units with enhanced specifications')
  console.log('🍕 8 F&B items with proper categorization')
  console.log('📱 5 WhatsApp contacts with schedules')
  console.log('⚡ 2 Active gaming sessions for testing')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Enhanced seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })