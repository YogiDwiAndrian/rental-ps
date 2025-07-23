// src/components/auth/signin-form.tsx
'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'

interface SignInFormProps {
  subdomain: string
  domainType: 'admin' | 'tenant'
}

// Error message mapping
const ERROR_MESSAGES = {
  'DATABASE_CONNECTION_FAILED': {
    title: 'Database Connection Error',
    message: 'Cannot connect to database. Please ensure Docker containers are running.',
    action: 'Run: docker-compose up -d',
    type: 'system' as const
  },
  'USER_NOT_FOUND': {
    title: 'User Not Found',
    message: 'No account found with this email address.',
    action: 'Check your email or contact administrator.',
    type: 'user' as const
  },
  'INVALID_PASSWORD': {
    title: 'Invalid Password',
    message: 'The password you entered is incorrect.',
    action: 'Please try again or reset your password.',
    type: 'user' as const
  },
  'ACCOUNT_DISABLED': {
    title: 'Account Disabled',
    message: 'Your account has been disabled.',
    action: 'Contact administrator to reactivate your account.',
    type: 'user' as const
  },
  'TENANT_ACCESS_DENIED': {
    title: 'Access Denied',
    message: 'You do not have permission to access this tenant.',
    action: 'Contact administrator or try different subdomain.',
    type: 'permission' as const
  },
  'NO_TENANT_ASSIGNED': {
    title: 'No Tenant Assigned',
    message: 'Your account is not assigned to any tenant.',
    action: 'Contact administrator to assign tenant access.',
    type: 'permission' as const
  },
  'SYSTEM_ERROR': {
    title: 'System Error',
    message: 'An unexpected error occurred.',
    action: 'Please try again or contact support.',
    type: 'system' as const
  },
  'default': {
    title: 'Login Failed',
    message: 'Unable to sign in with provided credentials.',
    action: 'Please check your email and password.',
    type: 'user' as const
  }
}

export default function SignInForm({ subdomain, domainType }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [systemStatus, setSystemStatus] = useState<'checking' | 'healthy' | 'error'>('checking')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || (domainType === 'admin' ? '/admin' : '/dashboard')

  // Check system health on component mount
  useEffect(() => {
    checkSystemHealth()
  }, [])

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('/api/health')
      const health = await response.json()
      
      if (health.status === 'healthy') {
        setSystemStatus('healthy')
      } else {
        setSystemStatus('error')
        if (health.connection && !health.connection.isConnected) {
          setError('DATABASE_CONNECTION_FAILED: ' + health.connection.error)
        }
      }
    } catch (error) {
      console.error('Health check failed:', error)
      setSystemStatus('error')
      setError('SYSTEM_ERROR')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        subdomain: domainType === 'admin' ? 'admin' : subdomain,
        redirect: false,
      })

      if (result?.error) {
        console.error('Sign in error:', result.error)
        setError(result.error)
      } else {
        // Success - redirect based on role
        const session = await getSession()
        
        if (session?.user.role === 'super_admin') {
          router.push('/admin')
        } else if (session?.user.role === 'owner' || session?.user.role === 'staff') {
          router.push('/dashboard')
        } else {
          router.push(callbackUrl)
        }
      }
    } catch (error) {
      console.error('Unexpected sign in error:', error)
      setError('SYSTEM_ERROR')
    } finally {
      setIsLoading(false)
    }
  }

  // Get error details
  const getErrorInfo = (errorCode: string) => {
    // Extract main error code (remove additional info)
    const mainError = errorCode.split(':')[0]
    return ERROR_MESSAGES[mainError as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default
  }

  const isAdminDomain = domainType === 'admin'
  const displayName = isAdminDomain ? 'Super Admin' : subdomain.charAt(0).toUpperCase() + subdomain.slice(1)

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
      isAdminDomain ? 'bg-purple-50' : 'bg-blue-50'
    }`}>
      <div className="max-w-md w-full space-y-8">
        
        {/* System Status Indicator */}
        {systemStatus === 'checking' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">Checking system status...</p>
              </div>
            </div>
          </div>
        )}

        {systemStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">System Issue Detected</h3>
                <p className="mt-1 text-sm text-red-700">Please check system requirements before logging in.</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <div className={`mx-auto h-12 w-12 flex items-center justify-center rounded-full ${
            isAdminDomain ? 'bg-purple-100' : 'bg-blue-100'
          }`}>
            {isAdminDomain ? '🏛️' : '🎮'}
          </div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${
            isAdminDomain ? 'text-purple-900' : 'text-blue-900'
          }`}>
            {displayName} Login
          </h2>
          <p className={`mt-2 text-center text-sm ${
            isAdminDomain ? 'text-purple-700' : 'text-blue-700'
          }`}>
            {isAdminDomain ? 'Platform Management Access' : 'Business Management Portal'}
          </p>
        </div>
        
        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:z-10 sm:text-sm ${
                  isAdminDomain 
                    ? 'focus:ring-purple-500 focus:border-purple-500' 
                    : 'focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || systemStatus === 'error'}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:z-10 sm:text-sm ${
                  isAdminDomain 
                    ? 'focus:ring-purple-500 focus:border-purple-500' 
                    : 'focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || systemStatus === 'error'}
              />
            </div>
          </div>

          {/* Enhanced Error Display */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {getErrorInfo(error).title}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{getErrorInfo(error).message}</p>
                    <p className="mt-1 font-medium">{getErrorInfo(error).action}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading || systemStatus === 'error'}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isAdminDomain 
                  ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Test Credentials */}
          <div className="mt-6">
            <div className={`text-center text-sm ${
              isAdminDomain ? 'text-purple-600' : 'text-blue-600'
            }`}>
              <details className="mt-4">
                <summary className={`cursor-pointer ${
                  isAdminDomain ? 'hover:text-purple-500' : 'hover:text-blue-500'
                }`}>
                  Test Credentials
                </summary>
                <div className={`mt-2 text-left p-3 rounded text-xs ${
                  isAdminDomain ? 'bg-purple-50' : 'bg-blue-50'
                }`}>
                  {isAdminDomain ? (
                    <div>
                      <strong>Super Admin:</strong><br />
                      admin@rentalps.com / admin123
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <strong>Owner:</strong><br />
                        owner@demo.com / owner123
                      </div>
                      <div>
                        <strong>Staff Jakarta:</strong><br />
                        staff.jakarta@demo.com / staff123
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}