// prisma/seed-preferences.ts - Seed untuk UserPreference setelah migration
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedUserPreferences() {
  console.log('🌱 Starting user preferences seeding...')

  // Get users yang perlu preference
  const multiLocationStaff1 = await prisma.user.findUnique({
    where: { email: 'staff.multi1@demo.com' }
  })

  const multiLocationStaff2 = await prisma.user.findUnique({
    where: { email: 'staff.multi2@demo.com' }
  })

  const managerStaff = await prisma.user.findUnique({
    where: { email: 'manager@demo.com' }
  })

  // Get locations
  const jakartaLocation = await prisma.location.findFirst({
    where: { code: 'JKT' }
  })

  const bandungLocation = await prisma.location.findFirst({
    where: { code: 'BDG' }
  })

  const surabayaLocation = await prisma.location.findFirst({
    where: { code: 'SBY' }
  })

  if (!multiLocationStaff1 || !multiLocationStaff2 || !managerStaff) {
    console.error('❌ Users not found. Run main seed first.')
    return
  }

  if (!jakartaLocation || !bandungLocation || !surabayaLocation) {
    console.error('❌ Locations not found. Run main seed first.')
    return
  }

  // Create User Preferences
  await prisma.userPreference.createMany({
    data: [
      // Multi location staff 1 prefer Jakarta
      {
        userId: multiLocationStaff1.id,
        preferredLocationId: jakartaLocation.id,
        theme: 'light',
        notifications: true,
        defaultDashboard: 'units',
        settings: {
          dashboardLayout: 'grid',
          autoRefresh: true,
          soundNotifications: false
        }
      },
      // Multi location staff 2 prefer Surabaya
      {
        userId: multiLocationStaff2.id,
        preferredLocationId: surabayaLocation.id,
        theme: 'dark',
        notifications: false,
        defaultDashboard: 'overview',
        settings: {
          dashboardLayout: 'list',
          autoRefresh: false,
          soundNotifications: true
        }
      },
      // Manager prefer Bandung
      {
        userId: managerStaff.id,
        preferredLocationId: bandungLocation.id,
        theme: 'auto',
        notifications: true,
        defaultDashboard: 'reports',
        settings: {
          dashboardLayout: 'cards',
          autoRefresh: true,
          soundNotifications: false,
          showAdvancedMetrics: true
        }
      }
    ]
  })

  console.log('✅ User Preferences created successfully!')
  console.log('\n📋 Created Preferences:')
  console.log('- Multi Location Staff 1: prefers Jakarta, light theme')
  console.log('- Multi Location Staff 2: prefers Surabaya, dark theme')
  console.log('- Manager: prefers Bandung, auto theme')
  
  console.log('\n🧪 Test Cases Ready:')
  console.log('✅ Staff with saved location preference (auto-redirect)')
  console.log('✅ Staff without preference (show selector)')
  console.log('✅ Different themes and dashboard preferences')
  console.log('✅ Location-based smart routing')
}

seedUserPreferences()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding user preferences:', e)
    await prisma.$disconnect()
    process.exit(1)
  })