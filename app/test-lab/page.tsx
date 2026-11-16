import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESION, tokenValido } from '@/lib/admin-auth'
import TestLabClient from './TestLabClient'

// Gate server-side obligatorio: /test-lab nunca debe quedar expuesto al público
// porque inyecta sesiones sintéticas y permite limpiar registros de prueba.
export default function TestLabPage() {
  const token = cookies().get(COOKIE_SESION)?.value
  if (!tokenValido(token)) {
    redirect('/admin/login?next=/test-lab')
  }
  return <TestLabClient />
}
