const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🎮 RentalPS Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Platform SaaS untuk Bisnis Rental PlayStation
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold">✅ Landing Page Working!</h2>
            <p className="text-gray-600">Domain: rentalps.local</p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Test other domains:</p>
            <p>🏛️ admin.rentalps.local - Admin Portal</p>
            <p>🏪 demo.rentalps.local - Demo Tenant</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage