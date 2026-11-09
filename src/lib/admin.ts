// Office staff (@cpateam.co.il) and the system owner can act on behalf of any employer
export function isAdminEmail(email?: string | null) {
  return !!email && (email.endsWith('@cpateam.co.il') || email === 'neemandu@gmail.com');
}
