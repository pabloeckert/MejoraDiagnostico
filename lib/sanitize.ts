// Escapa texto de usuario antes de interpolarlo en HTML (emails) o en
// mensajes de Telegram con parse_mode: 'HTML' — evita que un nombre/whatsapp
// con `<`, `&`, etc. rompa el render o inyecte marcado en lo que le llega al admin.
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
