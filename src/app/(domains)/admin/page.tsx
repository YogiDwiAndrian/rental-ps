const AdminPage = () => {
  return(
    <div className="min-h-screen bg-purple-50 flex items-center justify-center">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-purple-900 mb-4">
          🏛️ Super Admin Portal
        </h1>
        <p className="text-xl text-purple-700 mb-8">
          Platform Management Dashboard
        </p>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-green-600">✅ ADMIN WORKING!</h2>
          <p className="text-gray-600">Domain: admin.rentalps.local</p>
          <p className="text-sm text-gray-500 mt-2">
            Super Admin dapat mengelola semua tenant
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminPage