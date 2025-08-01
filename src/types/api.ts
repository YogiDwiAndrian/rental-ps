// src/types/api.ts - API Response Types (No Any Types)

// ============================================
// COMMON API RESPONSE STRUCTURE
// ============================================

export interface BaseApiResponse {
  success: boolean
  error?: string
}

// ============================================
// F&B API TYPES
// ============================================

export interface FnbOrderItem {
  id: string
  fnbItemId: string
  fnbItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface FnbOrderTransaction {
  id: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod: string
  createdAt: string
}

export interface ApiFnbOrder {
  id: string
  totalAmount: number
  status: 'pending' | 'completed' | 'cancelled'
  items: FnbOrderItem[]
  createdAt: string
  paidAt?: string
  transactions?: FnbOrderTransaction[]
  paymentTiming?: 'immediate' | 'end_of_session'
}

export interface GetSessionFnbOrdersResponse extends BaseApiResponse {
  data?: ApiFnbOrder[]
}

export interface CreateFnbOrderRequest {
  items: Array<{
    fnbItemId: string
    quantity: number
  }>
  rentalSessionId?: string
  paymentTiming: 'immediate' | 'end_of_session'
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  notes?: string
}

export interface CreateFnbOrderResponse extends BaseApiResponse {
  data?: {
    orderId: string
    totalAmount: number
    itemCount: number
    paymentStatus: 'paid' | 'pending'
  }
}

// ============================================
// RENTAL SESSION API TYPES
// ============================================

export interface ApiActiveSession {
  sessionId: string
  unitId: string
  unitName: string
  billingModel: 'timer' | 'hourly' | 'package'
  startTime: string
  estimatedEndTime?: string
  remainingMinutes?: number
  totalAmount?: number
  isOvertime: boolean
  purchasedDuration?: number
  extendedDuration?: number
  hourlyRate: number
  customerName?: string
}

export interface GetActiveSessionsResponse extends BaseApiResponse {
  data?: ApiActiveSession[]
}

export interface StartSessionRequest {
  unitId: string
  billingModel: 'timer' | 'hourly' | 'package'
  customerName?: string
  purchasedDuration?: number
  packageId?: string
  notes?: string
}

export interface StartSessionResponse extends BaseApiResponse {
  data?: {
    sessionId: string
    unitName: string
    startTime: string
    estimatedEndTime?: string
    totalAmount: number
    hourlyRate: number
  }
}

export interface StopSessionRequest {
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  fnbAmount?: number
  notes?: string
}

export interface StopSessionResponse extends BaseApiResponse {
  data?: {
    sessionId: string
    endTime: string
    totalAmount: number
    receipt?: {
      sessionId: string
      unitName: string
      startTime: string
      endTime: string
      duration: string
      billingModel: string
      totalAmount: number
      paymentMethod: string
      locationName?: string
    }
  }
}

export interface ExtendSessionRequest {
  additionalDuration: number
  paymentMethod: 'cash' | 'card' | 'digital_wallet'
  notes?: string
}

export interface ExtendSessionResponse extends BaseApiResponse {
  data?: {
    sessionId: string
    newEndTime: string
    additionalCost: number
    totalAmount: number
  }
}

// ============================================
// UNIT MANAGEMENT API TYPES
// ============================================

export interface ApiUnit {
  id: string
  name: string
  consoleType: string
  controllerCount: number
  status: 'available' | 'occupied' | 'maintenance' | 'broken'
  hourlyRate: number
  customerDisplayName?: string
  packages?: Array<{
    id: string
    name: string
    durationMinutes: number
    price: number
    description?: string
  }>
}

export interface GetUnitsResponse extends BaseApiResponse {
  data?: {
    units: ApiUnit[]
    totalCount: number
  }
}

export interface UpdateUnitStatusRequest {
  status: 'available' | 'maintenance' | 'broken'
}

export interface UpdateUnitStatusResponse extends BaseApiResponse {
  data?: {
    unitId: string
    previousStatus: string
    newStatus: string
    updatedAt: string
  }
}

// ============================================
// REPORTS API TYPES
// ============================================

export interface DailyReportData {
  date: string
  location: {
    id: string
    name: string
  }
  summary: {
    totalRevenue: number
    psRevenue: number
    fnbRevenue: number
    totalSessions: number
    averageSessionValue: number
  }
  sessions: Array<{
    id: string
    unitName: string
    duration: string
    billingModel: string
    amount: number
    customerName?: string
  }>
  fnbSales: Array<{
    itemName: string
    quantity: number
    revenue: number
  }>
}

export interface GetDailyReportResponse extends BaseApiResponse {
  data?: DailyReportData
}

// ============================================
// ERROR HANDLING TYPES
// ============================================

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: string
}

export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR'
  fieldErrors?: Record<string, string[]>
}

export interface AuthError extends ApiError {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'TOKEN_EXPIRED'
}

export interface NotFoundError extends ApiError {
  code: 'NOT_FOUND'
  resource: string
  resourceId?: string
}

export interface ConflictError extends ApiError {
  code: 'CONFLICT'
  conflictType: 'DUPLICATE' | 'STATE_MISMATCH' | 'RESOURCE_IN_USE'
}

// ============================================
// TYPE GUARDS FOR RUNTIME VALIDATION
// ============================================

export function isBaseApiResponse(obj: unknown): obj is BaseApiResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as BaseApiResponse).success === 'boolean'
  )
}

export function isGetSessionFnbOrdersResponse(obj: unknown): obj is GetSessionFnbOrdersResponse {
  if (!isBaseApiResponse(obj)) return false
  
  const response = obj as GetSessionFnbOrdersResponse
  return (
    response.success === false ||
    (Array.isArray(response.data) &&
     response.data.every((order: unknown) => 
       typeof order === 'object' &&
       order !== null &&
       typeof (order as ApiFnbOrder).id === 'string' &&
       typeof (order as ApiFnbOrder).totalAmount === 'number'
     ))
  )
}

export function isGetActiveSessionsResponse(obj: unknown): obj is GetActiveSessionsResponse {
  if (!isBaseApiResponse(obj)) return false
  
  const response = obj as GetActiveSessionsResponse
  return (
    response.success === false ||
    (Array.isArray(response.data) &&
     response.data.every((session: unknown) => 
       typeof session === 'object' &&
       session !== null &&
       typeof (session as ApiActiveSession).sessionId === 'string' &&
       typeof (session as ApiActiveSession).hourlyRate === 'number'
     ))
  )
}

// ============================================
// API CLIENT UTILITIES
// ============================================

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = '/api', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
  }

  async request<T extends BaseApiResponse>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    })

    const data = await response.json()
    
    if (!isBaseApiResponse(data)) {
      throw new Error('Invalid API response format')
    }

    return data as T
  }

  // Typed API methods
  async getSessionFnbOrders(sessionId: string, locationId: string): Promise<GetSessionFnbOrdersResponse> {
    return this.request<GetSessionFnbOrdersResponse>(
      `/rentals/${sessionId}/fnb-orders?locationId=${locationId}`
    )
  }

  async getActiveSessions(locationId: string): Promise<GetActiveSessionsResponse> {
    return this.request<GetActiveSessionsResponse>(
      `/rentals/active?locationId=${locationId}`
    )
  }

  async stopSession(sessionId: string, data: StopSessionRequest, locationId: string): Promise<StopSessionResponse> {
    return this.request<StopSessionResponse>(
      `/rentals/${sessionId}/stop`,
      {
        method: 'POST',
        headers: { 'X-Location-ID': locationId },
        body: JSON.stringify(data)
      }
    )
  }
}

// ============================================
// EXPORT DEFAULT CLIENT INSTANCE
// ============================================

export const apiClient = new ApiClient()