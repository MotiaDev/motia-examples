import { TokenData } from '../../api'

export async function verifyToken(token: string): Promise<TokenData | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    )
    
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null
    }
    
    return payload as TokenData
  } catch (error) {
    return null
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null
  }
  
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : authHeader
}

export function hasPermission(
  tokenData: TokenData | undefined,
  permission: string
): boolean {
  return tokenData?.permissions?.includes(permission) ?? false
}

export function hasRole(
  tokenData: TokenData | undefined,
  role: TokenData['role']
): boolean {
  return tokenData?.role === role
}

export function generateSampleToken(data: Partial<TokenData>): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    userId: data.userId || 'user-123',
    email: data.email || 'user@example.com',
    role: data.role || 'user',
    permissions: data.permissions || ['read:profile', 'write:profile'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...data
  }
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = 'sample-signature'
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

