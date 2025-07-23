// src/app/(domains)/admin/auth/signin/page.tsx
import SignInForm from '@/components/auth/signin-form'

export default async function AdminSignInPage() {
  return <SignInForm subdomain="admin" domainType="admin" />
}