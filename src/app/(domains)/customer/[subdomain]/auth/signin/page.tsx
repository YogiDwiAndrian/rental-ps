// src/app/(domains)/customer/[subdomain]/auth/signin/page.tsx
import SignInForm from '@/components/auth/signin-form'
import { notFound } from 'next/navigation'

interface CustomerSignInPageProps {
  params: Promise<{
    subdomain: string
  }>
}

export default async function CustomerSignInPage({ params }: CustomerSignInPageProps) {
  const { subdomain } = await params

  // Basic subdomain validation
  if (!subdomain || subdomain.length < 2) {
    notFound()
  }

  return <SignInForm subdomain={subdomain} domainType="tenant" />
}