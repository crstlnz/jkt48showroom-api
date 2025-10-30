import jwt from 'jsonwebtoken'

const DEFAULT_SECRET = process.env.JWT_SECRET || 'supersecret'

/**
 * Custom error untuk identifikasi error JWT
 */
export class JWTError extends Error {
  name = 'JWTError'
  code: 'INVALID' | 'EXPIRED'

  constructor(message: string, code: 'INVALID' | 'EXPIRED') {
    super(message)
    this.code = code
  }
}

/**
 * Membuat JWT token.
 * @param payload - Data yang ingin disimpan di dalam token.
 * @param expireMs - Lama waktu token berlaku dalam milidetik.
 * @param secret - Kunci rahasia (opsional).
 * @returns Token JWT (string)
 */
export function createJWT<T extends object>(
  payload: T,
  expireMs: number,
  secret: string = DEFAULT_SECRET,
): string {
  return jwt.sign(payload, secret, {
    expiresIn: Math.floor(expireMs / 1000), // konversi ms ke detik
  })
}

/**
 * Memverifikasi JWT token.
 * Jika valid: mengembalikan payload.
 * Jika tidak valid atau expired: melempar JWTError.
 * @param token - Token JWT yang akan dicek.
 * @param secret - Kunci rahasia (opsional).
 * @returns Payload token
 */
export function verifyJWT<T = any>(token: string, secret: string = DEFAULT_SECRET): T {
  try {
    const decoded = jwt.verify(token, secret)
    return decoded as T
  }
  catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new JWTError('Token has expired', 'EXPIRED')
    }
    if (err.name === 'JsonWebTokenError') {
      throw new JWTError('Invalid token', 'INVALID')
    }
    throw new JWTError('Unknown JWT error', 'INVALID')
  }
}

/**
 * Mengecek apakah JWT valid tanpa melempar error.
 * Mengembalikan true jika valid, false jika tidak.
 */
export function isJWTValid(token: string, secret: string = DEFAULT_SECRET): boolean {
  try {
    jwt.verify(token, secret)
    return true
  }
  catch {
    return false
  }
}
