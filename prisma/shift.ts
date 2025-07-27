// prisma/seed-work-sessions.ts - Seed data untuk Work Session testing
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedWorkSessions() {
  console.log('🕒 Starting work sessions seeding...')

  // Get existing users and locations
  const jakartaStaff = await prisma.user.findUnique({
    where: { email: 'staff.jakarta@demo.com' }
  })

  const multiStaff1 = await prisma.user.findUnique({
    where: { email: 'staff.multi1@demo.com' }
  })

  const multiStaff2 = await prisma.user.findUnique({
    where: { email: 'staff.multi2@demo.com' }
  })

  const managerStaff = await prisma.user.findUnique({
    where: { email: 'manager@demo.com' }
  })

  const jakartaLocation = await prisma.location.findFirst({
    where: { code: 'JKT' }
  })

  const bandungLocation = await prisma.location.findFirst({
    where: { code: 'BDG' }
  })

  const surabayaLocation = await prisma.location.findFirst({
    where: { code: 'SBY' }
  })

  if (!jakartaStaff || !multiStaff1 || !jakartaLocation || !bandungLocation) {
    console.error('❌ Required users/locations not found. Run main seed first.')
    return
  }

  // 1. Create completed work session (yesterday)
  console.log('📋 Creating completed work sessions (yesterday)...')
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(8, 0, 0, 0) // 8 AM start
  
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(20, 15, 0, 0) // 8:15 PM end
  
  const completedSession = await prisma.workSession.create({
    data: {
      userId: jakartaStaff.id,
      locationId: jakartaLocation.id,
      startTime: yesterday,
      endTime: yesterdayEnd,
      status: 'completed',
      durationMinutes: 735, // 12h 15m
      totalRevenue: 850000,
      totalSessions: 12,
      hourlyRevenue: 540000, // 6 hourly sessions
      packageRevenue: 280000, // 4 package sessions  
      payLaterRevenue: 30000, // 2 pay later sessions
      startNotes: 'Morning shift - all units operational',
      endNotes: 'Good day, high traffic in evening',
      handoverNotes: 'PS5 #2 controller needs battery replacement'
    }
  })

  // 2. Create active work session (today - Jakarta staff)
  console.log('⏰ Creating active work session (Jakarta)...')
  
  const today = new Date()
  today.setHours(8, 5, 0, 0) // Started 5 minutes late
  
  const activeSessionJakarta = await prisma.workSession.create({
    data: {
      userId: jakartaStaff.id,
      locationId: jakartaLocation.id,
      startTime: today,
      status: 'active',
      totalRevenue: 320000,
      totalSessions: 5,
      hourlyRevenue: 180000, // 2 hourly completed
      packageRevenue: 140000, // 2 package completed
      payLaterRevenue: 0, // no pay later yet
      startNotes: 'Morning shift - slight delay due to traffic',
      pendingPayments: [
        {
          unitName: 'PS5 #1',
          customerName: 'Budi',
          startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          billingType: 'pay_later',
          estimatedAmount: 36000
        }
      ]
    }
  })

  // 3. Create active work session (today - Bandung staff)
  console.log('⏰ Creating active work session (Bandung)...')
  
  const bandungStart = new Date()
  bandungStart.setHours(9, 0, 0, 0) // On time
  
  const activeSessionBandung = await prisma.workSession.create({
    data: {
      userId: multiStaff1.id,
      locationId: bandungLocation.id,
      startTime: bandungStart,
      status: 'active',
      totalRevenue: 450000,
      totalSessions: 7,
      hourlyRevenue: 270000, // 3 hourly completed
      packageRevenue: 180000, // 3 package completed
      payLaterRevenue: 0,
      startNotes: 'Bandung morning shift - all systems green'
    }
  })

  // 4. Create handover items from previous shift
  console.log('🔄 Creating handover items...')
  
  // From yesterday's session - some customers didn't pay
  await prisma.handoverItem.create({
    data: {
      fromSessionId: completedSession.id,
      toSessionId: activeSessionJakarta.id, // Handed over to today's session
      unitName: 'PS4 #3',
      customerName: 'Ahmad',
      startTime: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000), // Started at 6 PM yesterday
      billingType: 'pay_later',
      amountDue: 54000, // 3 hours * 18000
      durationMinutes: 180,
      isPaid: true, // Jakarta staff already collected this morning
      paidAt: new Date(today.getTime() + 1 * 60 * 60 * 1000), // Paid 1 hour after shift start
      paidBySessionId: activeSessionJakarta.id,
      notes: 'Customer paid this morning, very apologetic'
    }
  })

  // Pending handover for current active session
  await prisma.handoverItem.create({
    data: {
      fromSessionId: activeSessionJakarta.id,
      unitName: 'PS5 #2',
      customerName: 'Sari',
      startTime: new Date(Date.now() - 90 * 60 * 1000), // Started 1.5 hours ago
      billingType: 'pay_later',
      amountDue: 27000, // 1.5 hours * 18000
      durationMinutes: 90,
      isPaid: false, // Still pending
      notes: 'Customer still playing, will pay when finished'
    }
  })

  // 5. Create some historical sessions for reporting
  console.log('📊 Creating historical sessions for analytics...')
  
  const lastWeek = new Date()
  lastWeek.setDate(lastWeek.getDate() - 7)
  
  // Create 5 historical sessions
  for (let i = 0; i < 5; i++) {
    const sessionDate = new Date(lastWeek)
    sessionDate.setDate(sessionDate.getDate() + i)
    sessionDate.setHours(8 + i, 0, 0, 0) // Vary start times
    
    const sessionEnd = new Date(sessionDate)
    sessionEnd.setHours(sessionDate.getHours() + 8 + (i % 3), 30, 0, 0) // 8-11 hour shifts
    
    const revenue = 400000 + (i * 100000) // Vary revenue
    
    await prisma.workSession.create({
      data: {
        userId: i % 2 === 0 ? jakartaStaff.id : multiStaff1.id,
        locationId: i % 2 === 0 ? jakartaLocation.id : bandungLocation.id,
        startTime: sessionDate,
        endTime: sessionEnd,
        status: 'completed',
        durationMinutes: Math.floor((sessionEnd.getTime() - sessionDate.getTime()) / (1000 * 60)),
        totalRevenue: revenue,
        totalSessions: 8 + i,
        hourlyRevenue: revenue * 0.6,
        packageRevenue: revenue * 0.3,
        payLaterRevenue: revenue * 0.1,
        endNotes: `Historical session ${i + 1} - good performance`
      }
    })
  }

  console.log('✅ Work sessions created successfully!')
  
  console.log('\n📊 Created Data Summary:')
  console.log('- 1 Completed session (yesterday)')
  console.log('- 2 Active sessions (Jakarta & Bandung)')
  console.log('- 2 Handover items (1 paid, 1 pending)')
  console.log('- 5 Historical sessions for analytics')
  
  console.log('\n🧪 Test Scenarios Available:')
  console.log('✅ Active work session with real revenue tracking')
  console.log('✅ Pending payment handover (PS5 #2 - Sari)')
  console.log('✅ Completed payment handover (PS4 #3 - Ahmad)')
  console.log('✅ Historical data for reporting')
  console.log('✅ Multiple billing types tracked')
  
  console.log('\n🔧 Test Features:')
  console.log('1. Login as staff.jakarta@demo.com → See active work session')
  console.log('2. Dashboard shows real revenue data')
  console.log('3. Handover notifications for pending payments')
  console.log('4. Work session history & analytics')
  console.log('5. Multiple locations with different staff')
  
  console.log('\n💰 Revenue Breakdown Example (Jakarta active):')
  console.log('- Hourly Sessions: Rp 180,000 (2 sessions)')
  console.log('- Package Sessions: Rp 140,000 (2 sessions)')
  console.log('- Pay Later: Rp 0 (1 pending)')
  console.log('- Total: Rp 320,000 (5 sessions)')
}

seedWorkSessions()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding work sessions:', e)
    await prisma.$disconnect()
    process.exit(1)
  })