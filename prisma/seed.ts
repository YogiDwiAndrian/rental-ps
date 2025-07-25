// prisma/seed.ts - Complete Enhanced Seed with All Staff WhatsApp Contacts
import { PrismaClient, UserRole, ContactRole, UnitStatus, BillingType, SessionStatus, PaymentStatus, TransactionType, AuditEventType, AuditSeverity } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting complete enhanced database seeding...')

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

  // 4. Create Locations for Demo Tenant (3 locations)
  const jakartaLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: "Jakarta Gaming Center",
      code: "JKT",
      address: "Jl. Gaming Plaza No. 123, Kuningan, Jakarta Selatan 12940",
      phone: "+62 812-3456-7890",
      email: "jakarta@demo.com",
      publicDescription: "Rental PlayStation terlengkap di Jakarta Selatan dengan suasana nyaman, AC full, dan koleksi game terbaru.",
      latitude: -6.238790,
      longitude: 106.828870,
      operationalHours: {
        monday: { open: "10:00", close: "23:00" },
        tuesday: { open: "10:00", close: "23:00" },
        wednesday: { open: "10:00", close: "23:00" },
        thursday: { open: "10:00", close: "23:00" },
        friday: { open: "10:00", close: "01:00" },
        saturday: { open: "09:00", close: "01:00" },
        sunday: { open: "09:00", close: "23:00" }
      },
      showOnCustomerPage: true,
      isActive: true,
    }
  })

  const bandungLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: "Bandung Gaming Hub",
      code: "BDG",
      address: "Jl. Pasteur No. 456, Sukajadi, Bandung 40162",
      phone: "+62 813-7890-1234",
      email: "bandung@demo.com",
      publicDescription: "Gaming center terbesar di Bandung dengan fasilitas premium dan pelayanan 24/7.",
      latitude: -6.874840,
      longitude: 107.599695,
      operationalHours: {
        monday: { open: "09:00", close: "24:00" },
        tuesday: { open: "09:00", close: "24:00" },
        wednesday: { open: "09:00", close: "24:00" },
        thursday: { open: "09:00", close: "24:00" },
        friday: { open: "09:00", close: "02:00" },
        saturday: { open: "08:00", close: "02:00" },
        sunday: { open: "08:00", close: "24:00" }
      },
      showOnCustomerPage: true,
      isActive: true,
    }
  })

  const surabayaLocation = await prisma.location.create({
    data: {
      tenantId: demoTenant.id,
      name: "Surabaya Gaming Zone",
      code: "SBY",
      address: "Jl. HR Muhammad No. 789, Gubeng, Surabaya 60281",
      phone: "+62 814-5678-9012",
      email: "surabaya@demo.com",
      publicDescription: "PlayStation rental center terdepan di Surabaya dengan game-game terbaru dan fasilitas modern.",
      latitude: -7.265757,
      longitude: 112.734146,
      operationalHours: {
        monday: { open: "11:00", close: "22:00" },
        tuesday: { open: "11:00", close: "22:00" },
        wednesday: { open: "11:00", close: "22:00" },
        thursday: { open: "11:00", close: "22:00" },
        friday: { open: "11:00", close: "24:00" },
        saturday: { open: "10:00", close: "24:00" },
        sunday: { open: "10:00", close: "22:00" }
      },
      showOnCustomerPage: true,
      isActive: true,
    }
  })

  // 5. Create PS Lounge Location (single location)
  const pslLocation = await prisma.location.create({
    data: {
      tenantId: pslTenant.id,
      name: "PS Lounge Premium",
      code: "PSL",
      address: "Jl. Premium Gaming No. 456, Dago, Bandung 40135",
      phone: "+62 813-7890-1234",
      email: "info@pslounge.com",
      publicDescription: "Premium PlayStation gaming experience dengan private rooms dan VIP service.",
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
  console.log('✅ All Locations created')

  // 6. Create Owner Users (dengan location assignments untuk floating WhatsApp)
  const hashedOwnerPassword = await bcrypt.hash('owner123', 12)
  
  const demoOwner = await prisma.user.create({
    data: {
      email: 'owner@demo.com',
      name: 'Demo Owner',
      firstName: 'Demo',
      lastName: 'Owner',
      phone: '+62 811-2233-4455',
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
      phone: '+62 812-3344-5566',
      passwordHash: hashedOwnerPassword,
      role: UserRole.owner,
      tenantId: pslTenant.id,
      isActive: true,
    },
  })
  console.log('✅ Owner users created')

  // 7. Create Staff Users with Different Assignment Scenarios
  const hashedStaffPassword = await bcrypt.hash('staff123', 12)
  
  // Staff single location (Jakarta only)
  const jakartaStaff = await prisma.user.create({
    data: {
      email: 'staff.jakarta@demo.com',
      name: 'Jakarta Staff',
      firstName: 'Jakarta',
      lastName: 'Staff',
      phone: '+62 815-6677-8899',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  // Staff single location (Bandung only)
  const bandungStaff = await prisma.user.create({
    data: {
      email: 'staff.bandung@demo.com',
      name: 'Bandung Staff',
      firstName: 'Bandung',
      lastName: 'Staff',
      phone: '+62 816-7788-9900',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  // Staff multiple locations (untuk test selector page)
  const multiLocationStaff1 = await prisma.user.create({
    data: {
      email: 'staff.multi1@demo.com',
      name: 'Multi Location Staff 1',
      firstName: 'Multi',
      lastName: 'Staff 1',
      phone: '+62 817-8899-0011',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  const multiLocationStaff2 = await prisma.user.create({
    data: {
      email: 'staff.multi2@demo.com',
      name: 'All Location Staff',
      firstName: 'All Location',
      lastName: 'Staff',
      phone: '+62 818-9900-1122',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })

  // Staff PS Lounge (single location)
  const pslStaff = await prisma.user.create({
    data: {
      email: 'staff@pslounge.com',
      name: 'PS Lounge Staff',
      firstName: 'PS Lounge',
      lastName: 'Staff',
      phone: '+62 819-0011-2233',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: pslTenant.id,
      isActive: true,
    },
  })

  // Manager level staff (assign ke semua location Demo)
  const managerStaff = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      name: 'Demo Manager',
      firstName: 'Demo',
      lastName: 'Manager',
      phone: '+62 820-1122-3344',
      passwordHash: hashedStaffPassword,
      role: UserRole.staff,
      tenantId: demoTenant.id,
      isActive: true,
    },
  })
  console.log('✅ Staff users created')

  // 8. Create Location Assignments (berbagai skenario testing)
  await prisma.locationAssignment.createMany({
    data: [
      // Single location assignments
      { userId: jakartaStaff.id, locationId: jakartaLocation.id, isActive: true },
      { userId: bandungStaff.id, locationId: bandungLocation.id, isActive: true },
      { userId: pslStaff.id, locationId: pslLocation.id, isActive: true },
      
      // Multi location assignments (untuk test selector)
      { userId: multiLocationStaff1.id, locationId: jakartaLocation.id, isActive: true },
      { userId: multiLocationStaff1.id, locationId: bandungLocation.id, isActive: true },
      
      { userId: multiLocationStaff2.id, locationId: jakartaLocation.id, isActive: true },
      { userId: multiLocationStaff2.id, locationId: surabayaLocation.id, isActive: true },
      
      // Manager assign ke semua location Demo
      { userId: managerStaff.id, locationId: jakartaLocation.id, isActive: true },
      { userId: managerStaff.id, locationId: bandungLocation.id, isActive: true },
      { userId: managerStaff.id, locationId: surabayaLocation.id, isActive: true },
      
      // Owner assignments (untuk floating WhatsApp)
      { userId: demoOwner.id, locationId: jakartaLocation.id, isActive: true },
      { userId: demoOwner.id, locationId: bandungLocation.id, isActive: true },
      { userId: demoOwner.id, locationId: surabayaLocation.id, isActive: true },
      { userId: pslOwner.id, locationId: pslLocation.id, isActive: true },
    ]
  })
  console.log('✅ Location assignments created')

  // 9. Create WhatsApp Contacts - COMPLETE VERSION with ALL STAFF
  console.log('📞 Creating comprehensive WhatsApp contacts...')
  
  // JAKARTA LOCATION CONTACTS
  await prisma.whatsAppContact.createMany({
    data: [
      // Demo Owner for Jakarta
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        userId: demoOwner.id,
        name: 'Demo Owner - Jakarta',
        whatsappNumber: '+6281122334455',
        role: ContactRole.owner,
        isPrimary: true,
        responseTime: 'Usually replies within 30 minutes',
        displayOrder: 1,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "10:00", end: "23:00" },
          tuesday: { start: "10:00", end: "23:00" },
          wednesday: { start: "10:00", end: "23:00" },
          thursday: { start: "10:00", end: "23:00" },
          friday: { start: "10:00", end: "01:00" },
          saturday: { start: "09:00", end: "01:00" },
          sunday: { start: "09:00", end: "23:00" }
        }
      },
      // Jakarta Staff (single location)
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        userId: jakartaStaff.id,
        name: 'Jakarta Staff',
        whatsappNumber: '+6281566778899',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 10 minutes',
        displayOrder: 2,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "10:00", end: "18:00" },
          tuesday: { start: "10:00", end: "18:00" },
          wednesday: { start: "10:00", end: "18:00" },
          thursday: { start: "10:00", end: "18:00" },
          friday: { start: "10:00", end: "18:00" },
          saturday: { start: "18:00", end: "01:00" },
          sunday: { start: "18:00", end: "23:00" }
        }
      },
      // Multi Location Staff 1 - Jakarta assignment
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        userId: multiLocationStaff1.id,
        name: 'Multi Location Staff 1 - Jakarta',
        whatsappNumber: '+6281788990011',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 15 minutes',
        displayOrder: 3,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
          saturday: { start: "09:00", end: "15:00" },
          sunday: { start: "12:00", end: "20:00" }
        }
      },
      // All Location Staff - Jakarta assignment
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        userId: multiLocationStaff2.id,
        name: 'All Location Staff - Jakarta',
        whatsappNumber: '+6281899001122',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 15 minutes',
        displayOrder: 4,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "14:00", end: "22:00" },
          tuesday: { start: "14:00", end: "22:00" },
          wednesday: { start: "14:00", end: "22:00" },
          thursday: { start: "14:00", end: "22:00" },
          friday: { start: "14:00", end: "22:00" },
          saturday: { start: "10:00", end: "18:00" },
          sunday: { start: "10:00", end: "18:00" }
        }
      },
      // Demo Manager - Jakarta assignment
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        userId: managerStaff.id,
        name: 'Demo Manager - Jakarta',
        whatsappNumber: '+6282011223344',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 20 minutes',
        displayOrder: 5,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "08:00", end: "16:00" },
          tuesday: { start: "08:00", end: "16:00" },
          wednesday: { start: "08:00", end: "16:00" },
          thursday: { start: "08:00", end: "16:00" },
          friday: { start: "08:00", end: "16:00" },
          saturday: { start: "08:00", end: "12:00" },
          sunday: { start: "10:00", end: "14:00" }
        }
      }
    ]
  })
  
  // BANDUNG LOCATION CONTACTS
  await prisma.whatsAppContact.createMany({
    data: [
      // Demo Owner for Bandung
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        userId: demoOwner.id,
        name: 'Demo Owner - Bandung',
        whatsappNumber: '+6281122334455',
        role: ContactRole.owner,
        isPrimary: true,
        responseTime: 'Usually replies within 30 minutes',
        displayOrder: 1,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "09:00", end: "24:00" },
          tuesday: { start: "09:00", end: "24:00" },
          wednesday: { start: "09:00", end: "24:00" },
          thursday: { start: "09:00", end: "24:00" },
          friday: { start: "09:00", end: "02:00" },
          saturday: { start: "08:00", end: "02:00" },
          sunday: { start: "08:00", end: "24:00" }
        }
      },
      // Bandung Staff (single location)
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        userId: bandungStaff.id,
        name: 'Bandung Staff',
        whatsappNumber: '+6281677889900',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 10 minutes',
        displayOrder: 2,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "09:00", end: "17:00" },
          tuesday: { start: "09:00", end: "17:00" },
          wednesday: { start: "09:00", end: "17:00" },
          thursday: { start: "09:00", end: "17:00" },
          friday: { start: "09:00", end: "17:00" },
          saturday: { start: "17:00", end: "02:00" },
          sunday: { start: "17:00", end: "24:00" }
        }
      },
      // Multi Location Staff 1 - Bandung assignment
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        userId: multiLocationStaff1.id,
        name: 'Multi Location Staff 1 - Bandung',
        whatsappNumber: '+6281788990011',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 15 minutes',
        displayOrder: 3,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "17:00", end: "01:00" },
          tuesday: { start: "17:00", end: "01:00" },
          wednesday: { start: "17:00", end: "01:00" },
          thursday: { start: "17:00", end: "01:00" },
          friday: { start: "17:00", end: "01:00" },
          saturday: { start: "15:00", end: "24:00" },
          sunday: { start: "20:00", end: "24:00" }
        }
      },
      // Demo Manager - Bandung assignment
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        userId: managerStaff.id,
        name: 'Demo Manager - Bandung',
        whatsappNumber: '+6282011223344',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 20 minutes',
        displayOrder: 4,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "16:00", end: "24:00" },
          tuesday: { start: "16:00", end: "24:00" },
          wednesday: { start: "16:00", end: "24:00" },
          thursday: { start: "16:00", end: "24:00" },
          friday: { start: "16:00", end: "24:00" },
          saturday: { start: "12:00", end: "20:00" },
          sunday: { start: "14:00", end: "22:00" }
        }
      }
    ]
  })
  
  // SURABAYA LOCATION CONTACTS
  await prisma.whatsAppContact.createMany({
    data: [
      // Demo Owner for Surabaya
      {
        tenantId: demoTenant.id,
        locationId: surabayaLocation.id,
        userId: demoOwner.id,
        name: 'Demo Owner - Surabaya',
        whatsappNumber: '+6281122334455',
        role: ContactRole.owner,
        isPrimary: true,
        responseTime: 'Usually replies within 30 minutes',
        displayOrder: 1,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "11:00", end: "22:00" },
          tuesday: { start: "11:00", end: "22:00" },
          wednesday: { start: "11:00", end: "22:00" },
          thursday: { start: "11:00", end: "22:00" },
          friday: { start: "11:00", end: "24:00" },
          saturday: { start: "10:00", end: "24:00" },
          sunday: { start: "10:00", end: "22:00" }
        }
      },
      // All Location Staff - Surabaya assignment
      {
        tenantId: demoTenant.id,
        locationId: surabayaLocation.id,
        userId: multiLocationStaff2.id,
        name: 'All Location Staff - Surabaya',
        whatsappNumber: '+6281899001122',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 15 minutes',
        displayOrder: 2,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "11:00", end: "19:00" },
          tuesday: { start: "11:00", end: "19:00" },
          wednesday: { start: "11:00", end: "19:00" },
          thursday: { start: "11:00", end: "19:00" },
          friday: { start: "11:00", end: "19:00" },
          saturday: { start: "18:00", end: "24:00" },
          sunday: { start: "18:00", end: "22:00" }
        }
      },
      // Demo Manager - Surabaya assignment
      {
        tenantId: demoTenant.id,
        locationId: surabayaLocation.id,
        userId: managerStaff.id,
        name: 'Demo Manager - Surabaya',
        whatsappNumber: '+6282011223344',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 20 minutes',
        displayOrder: 3,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "19:00", end: "22:00" },
          tuesday: { start: "19:00", end: "22:00" },
          wednesday: { start: "19:00", end: "22:00" },
          thursday: { start: "19:00", end: "22:00" },
          friday: { start: "19:00", end: "24:00" },
          saturday: { start: "20:00", end: "24:00" },
          sunday: { start: "22:00", end: "24:00" }
        }
      }
    ]
  })
  
  // PS LOUNGE CONTACTS
  await prisma.whatsAppContact.createMany({
    data: [
      // PS Lounge Owner
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        userId: pslOwner.id,
        name: 'PS Lounge Owner',
        whatsappNumber: '+6281233445566',
        role: ContactRole.owner,
        isPrimary: true,
        responseTime: 'Usually replies within 15 minutes',
        displayOrder: 1,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "12:00", end: "24:00" },
          tuesday: { start: "12:00", end: "24:00" },
          wednesday: { start: "12:00", end: "24:00" },
          thursday: { start: "12:00", end: "24:00" },
          friday: { start: "12:00", end: "02:00" },
          saturday: { start: "10:00", end: "02:00" },
          sunday: { start: "10:00", end: "24:00" }
        }
      },
      // PS Lounge Staff
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        userId: pslStaff.id,
        name: 'PS Lounge Staff',
        whatsappNumber: '+6281900112233',
        role: ContactRole.staff,
        isPrimary: false,
        responseTime: 'Usually replies within 5 minutes',
        displayOrder: 2,
        isActive: true,
        availabilitySchedule: {
          monday: { start: "12:00", end: "20:00" },
          tuesday: { start: "12:00", end: "20:00" },
          wednesday: { start: "12:00", end: "20:00" },
          thursday: { start: "12:00", end: "20:00" },
          friday: { start: "12:00", end: "20:00" },
          saturday: { start: "20:00", end: "02:00" },
          sunday: { start: "20:00", end: "24:00" }
        }
      }
    ]
  })
  console.log('✅ Complete WhatsApp Contacts created for all locations and staff')

  // 10. Create Gaming Units untuk testing (dengan field yang benar)
  await prisma.unit.createMany({
    data: [
      // Jakarta Location Units (fixed field names)
      { locationId: jakartaLocation.id, name: "PS5 - Unit 1", consoleType: "PlayStation 5", status: UnitStatus.available, hourlyRate: 15000, isActive: true },
      { locationId: jakartaLocation.id, name: "PS5 - Unit 2", consoleType: "PlayStation 5", status: UnitStatus.occupied, hourlyRate: 12000, isActive: true },
      { locationId: jakartaLocation.id, name: "PS4 - Unit 1", consoleType: "PlayStation 4", status: UnitStatus.available, hourlyRate: 10000, isActive: true },
      { locationId: jakartaLocation.id, name: "PS4 - Unit 2", consoleType: "PlayStation 4", status: UnitStatus.maintenance, hourlyRate: 10000, isActive: true },
      
      // Bandung Location Units
      { locationId: bandungLocation.id, name: "PS5 - VIP 1", consoleType: "PlayStation 5", status: UnitStatus.available, hourlyRate: 18000, isActive: true },
      { locationId: bandungLocation.id, name: "PS5 - VIP 2", consoleType: "PlayStation 5", status: UnitStatus.available, hourlyRate: 15000, isActive: true },
      { locationId: bandungLocation.id, name: "PS4 - Regular 1", consoleType: "PlayStation 4", status: UnitStatus.occupied, hourlyRate: 12000, isActive: true },
      
      // Surabaya Location Units
      { locationId: surabayaLocation.id, name: "PS5 - Premium 1", consoleType: "PlayStation 5", status: UnitStatus.available, hourlyRate: 16000, isActive: true },
      { locationId: surabayaLocation.id, name: "PS4 - Standard 1", consoleType: "PlayStation 4", status: UnitStatus.available, hourlyRate: 11000, isActive: true },
      { locationId: surabayaLocation.id, name: "PS4 - Standard 2", consoleType: "PlayStation 4", status: UnitStatus.broken, hourlyRate: 11000, isActive: false },
      
      // PS Lounge Units
      { locationId: pslLocation.id, name: "Private Room 1", consoleType: "PlayStation 5 Pro", status: UnitStatus.available, hourlyRate: 25000, isActive: true },
      { locationId: pslLocation.id, name: "Private Room 2", consoleType: "PlayStation 5 Pro", status: UnitStatus.occupied, hourlyRate: 22000, isActive: true },
      { locationId: pslLocation.id, name: "VIP Lounge", consoleType: "PlayStation 5 Pro", status: UnitStatus.available, hourlyRate: 30000, isActive: true },
    ]
  })
  console.log('✅ Gaming Units created')

  // 11. Create F&B Categories dan Items (locationId based)
  const beverageCategory = await prisma.fnbCategory.create({
    data: {
      locationId: jakartaLocation.id,
      name: 'Beverages',
      isActive: true,
    }
  })

  const snackCategory = await prisma.fnbCategory.create({
    data: {
      locationId: jakartaLocation.id,
      name: 'Snacks',
      isActive: true,
    }
  })

  const mainFoodCategory = await prisma.fnbCategory.create({
    data: {
      locationId: jakartaLocation.id,
      name: 'Main Food',
      isActive: true,
    }
  })

  // Create categories for other locations too
  const bandungBeverageCategory = await prisma.fnbCategory.create({
    data: {
      locationId: bandungLocation.id,
      name: 'Beverages',
      isActive: true,
    }
  })

  const bandungSnackCategory = await prisma.fnbCategory.create({
    data: {
      locationId: bandungLocation.id,
      name: 'Snacks',
      isActive: true,
    }
  })

  await prisma.fnbItem.createMany({
    data: [
      // Jakarta Location F&B Items (fixed field names)
      { locationId: jakartaLocation.id, categoryId: beverageCategory.id, name: 'Air Mineral', sellingPrice: 3000, stockQuantity: 50, isActive: true },
      { locationId: jakartaLocation.id, categoryId: beverageCategory.id, name: 'Teh Botol', sellingPrice: 5000, stockQuantity: 30, isActive: true },
      { locationId: jakartaLocation.id, categoryId: beverageCategory.id, name: 'Kopi Instan', sellingPrice: 8000, stockQuantity: 25, isActive: true },
      { locationId: jakartaLocation.id, categoryId: beverageCategory.id, name: 'Jus Jeruk', sellingPrice: 12000, stockQuantity: 15, isActive: true },
      
      // Snacks Jakarta
      { locationId: jakartaLocation.id, categoryId: snackCategory.id, name: 'Keripik Kentang', sellingPrice: 8000, stockQuantity: 40, isActive: true },
      { locationId: jakartaLocation.id, categoryId: snackCategory.id, name: 'Biskuit Oreo', sellingPrice: 10000, stockQuantity: 20, isActive: true },
      { locationId: jakartaLocation.id, categoryId: snackCategory.id, name: 'Coklat Silverqueen', sellingPrice: 15000, stockQuantity: 18, isActive: true },
      
      // Main Food Jakarta
      { locationId: jakartaLocation.id, categoryId: mainFoodCategory.id, name: 'Mie Instan Goreng', sellingPrice: 15000, stockQuantity: 25, isActive: true },
      { locationId: jakartaLocation.id, categoryId: mainFoodCategory.id, name: 'Nasi Goreng', sellingPrice: 20000, stockQuantity: 12, isActive: true },
      { locationId: jakartaLocation.id, categoryId: mainFoodCategory.id, name: 'Ayam Geprek', sellingPrice: 25000, stockQuantity: 8, isActive: true },
      
      // Bandung Location F&B Items
      { locationId: bandungLocation.id, categoryId: bandungBeverageCategory.id, name: 'Air Mineral', sellingPrice: 3000, stockQuantity: 60, isActive: true },
      { locationId: bandungLocation.id, categoryId: bandungBeverageCategory.id, name: 'Es Teh Manis', sellingPrice: 6000, stockQuantity: 40, isActive: true },
      { locationId: bandungLocation.id, categoryId: bandungSnackCategory.id, name: 'Keripik Tempe', sellingPrice: 7000, stockQuantity: 30, isActive: true },
      { locationId: bandungLocation.id, categoryId: bandungSnackCategory.id, name: 'Cilok Bandung', sellingPrice: 12000, stockQuantity: 15, isActive: true },
    ]
  })
  console.log('✅ F&B Categories and Items created')

  // 12. Create Customer Page Configs (dengan field yang benar)
  await prisma.customerPageConfig.createMany({
    data: [
      {
        tenantId: demoTenant.id,
        locationId: jakartaLocation.id,
        showUnitStatus: true,
        showFnbMenu: true,
        showContactInfo: true,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: bandungLocation.id,
        showUnitStatus: true,
        showFnbMenu: true,
        showContactInfo: true,
        isActive: true,
      },
      {
        tenantId: demoTenant.id,
        locationId: surabayaLocation.id,
        showUnitStatus: true,
        showFnbMenu: true,
        showContactInfo: true,
        isActive: true,
      },
      {
        tenantId: pslTenant.id,
        locationId: pslLocation.id,
        showUnitStatus: true,
        showFnbMenu: true,
        showContactInfo: true,
        isActive: true,
      }
    ]
  })
  console.log('✅ Customer Page Configs created')

  // 13. Create Landing Page Config (dengan field yang benar sesuai schema)
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
        userAgent: 'Database Seeder v3.0 - Complete Enhanced',
        subdomain: null,
        requestPath: '/database/complete-enhanced-seed',
        requestMethod: 'POST',
        resourceType: 'database',
        resourceId: 'complete_enhanced_seed_v3',
        metadata: {
          operation: 'complete_enhanced_database_seeding',
          tables_created: [
            'users', 'tenants', 'locations', 'location_assignments', 
            'units', 'fnb_categories', 'fnb_items', 'whatsapp_contacts',
            'customer_page_configs', 'landing_page_config', 'audit_logs'
          ],
          environment: 'development',
          seed_version: '3.0',
          whatsapp_contacts_strategy: 'complete_multi_location_coverage',
          test_scenarios: [
            'single_location_staff',
            'multi_location_staff_complete_contacts', 
            'owner_location_assignments',
            'floating_whatsapp_comprehensive_contacts',
            'location_selector_testing',
            'multi_shift_staff_coverage'
          ]
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
        userAgent: 'Database Seeder v3.0 - Complete Enhanced',
        resourceType: 'user',
        resourceId: superAdmin.id,
        newValues: {
          email: superAdmin.email,
          role: 'super_admin',
          name: superAdmin.name
        },
        metadata: {
          created_during: 'complete_enhanced_database_seeding',
          user_type: 'super_admin',
          seed_version: '3.0'
        },
        responseTime: 0,
        timestamp: new Date(),
      }
    ]
  })
  console.log('✅ Enhanced Audit Logs created')

  console.log('🎉 Complete Enhanced database seeding completed successfully!')
  console.log('\n📋 Created Data Summary:')
  console.log('- 1 Super Admin user')
  console.log('- 2 Tenants (demo, pslounge)')
  console.log('- 4 Locations (Jakarta, Bandung, Surabaya, PS Lounge)')
  console.log('- 8 Users (1 super admin, 2 owners, 5 staff with different scenarios)')
  console.log('- 13 Gaming units across all locations')
  console.log('- 5 F&B categories with 14 items')
  console.log('- 11 WhatsApp contacts with comprehensive multi-location coverage')
  console.log('- 4 Customer page configs')
  console.log('- 1 Landing page config')
  console.log('- 2 Enhanced audit logs')
  
  console.log('\n🔑 Test Credentials:')
  console.log('Super Admin: admin@rentalps.com / admin123')
  console.log('Demo Owner: owner@demo.com / owner123')
  console.log('PS Lounge Owner: owner@pslounge.com / owner123')
  console.log('\n👥 Staff Accounts for Testing:')
  console.log('Single Location Jakarta: staff.jakarta@demo.com / staff123')
  console.log('Single Location Bandung: staff.bandung@demo.com / staff123')
  console.log('Multi Location (JKT+BDG): staff.multi1@demo.com / staff123')
  console.log('Multi Location (JKT+SBY): staff.multi2@demo.com / staff123')
  console.log('Manager All Locations: manager@demo.com / staff123')
  console.log('PS Lounge Staff: staff@pslounge.com / staff123')

  console.log('\n🧪 Testing Scenarios Available:')
  console.log('✅ Single location staff (auto-redirect)')
  console.log('✅ Multi location staff (selector page)')
  console.log('✅ Owner with location assignments (floating WhatsApp)')
  console.log('✅ Staff with location preferences (saved choices)')
  console.log('✅ Different working hours per location')
  console.log('✅ Multiple units with various statuses')
  console.log('✅ Complete F&B inventory system')
  console.log('✅ Customer page configurations')
  
  console.log('\n📱 Complete FloatingWhatsApp Coverage:')
  console.log('JAKARTA (5 contacts):')
  console.log('  - Demo Owner - Jakarta (owner, primary)')
  console.log('  - Jakarta Staff (staff, single location)')
  console.log('  - Multi Location Staff 1 - Jakarta (staff, multi location)')
  console.log('  - All Location Staff - Jakarta (staff, multi location)')
  console.log('  - Demo Manager - Jakarta (manager, all locations)')
  console.log('')
  console.log('BANDUNG (4 contacts):')
  console.log('  - Demo Owner - Bandung (owner, primary)')
  console.log('  - Bandung Staff (staff, single location)')
  console.log('  - Multi Location Staff 1 - Bandung (staff, multi location)')
  console.log('  - Demo Manager - Bandung (manager, all locations)')
  console.log('')
  console.log('SURABAYA (3 contacts):')
  console.log('  - Demo Owner - Surabaya (owner, primary)')
  console.log('  - All Location Staff - Surabaya (staff, multi location)')
  console.log('  - Demo Manager - Surabaya (manager, all locations)')
  console.log('')
  console.log('PS LOUNGE (2 contacts):')
  console.log('  - PS Lounge Owner (owner, primary)')
  console.log('  - PS Lounge Staff (staff, single location)')
  
  console.log('\n🎯 Multi-Location Staff WhatsApp Coverage:')
  console.log('✅ Multi Location Staff 1: Jakarta (+6281788990011) + Bandung (+6281788990011)')
  console.log('✅ All Location Staff: Jakarta (+6281899001122) + Surabaya (+6281899001122)')
  console.log('✅ Demo Manager: Jakarta (+6282011223344) + Bandung (+6282011223344) + Surabaya (+6282011223344)')
  
  console.log('\n🎯 Next Development Steps:')
  console.log('1. Test location selector with multi-location staff')
  console.log('2. Verify floating WhatsApp shows correct staff for each location')
  console.log('3. Test staff login flow and location preferences')
  console.log('4. Implement user preference management system')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during complete enhanced seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })