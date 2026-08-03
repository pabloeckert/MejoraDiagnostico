import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESION, tokenValido } from '@/lib/admin-auth'
import AdminClient from './AdminClient'

// Gate server-side: sin cookie de sesión válida no se llega a ver el shell
// del panel (antes devolvía 200 siempre y el gate real quedaba solo en
// /api/admin/data).
export default function AdminPage() {
  const token = cookies().get(COOKIE_SESION)?.value
  if (!tokenValido(token)) {
    redirect('/admin/login')
  }
  return <AdminClient />
}
