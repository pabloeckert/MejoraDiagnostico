import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESION, tokenValido } from '@/lib/admin-auth'
import PreviewClient from './PreviewClient'

// Gate server-side: sin cookie de sesión válida no se llega a ver el shell
// de preview (antes devolvía 200 siempre, misma cookie que /admin).
export default function PreviewPage() {
  const token = cookies().get(COOKIE_SESION)?.value
  if (!tokenValido(token)) {
    redirect('/admin/login?next=/preview')
  }
  return <PreviewClient />
}
