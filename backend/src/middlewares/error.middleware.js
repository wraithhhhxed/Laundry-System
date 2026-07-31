import { ApiError } from '../utils/ApiError.js'

const IS_DEV = process.env.NODE_ENV === 'development'

// ── Mongoose / driver error normalisation ─────────────────────────────────────

const normaliseMongoseError = (err) => {
  // Duplicate key  (e.g. unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field'
    return new ApiError(409, `Duplicate value for ${field}.`)
  }

  // Validation errors thrown by Mongoose schema validators
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message)
    return new ApiError(422, 'Validation failed.', messages)
  }

  // Malformed ObjectId
  if (err.name === 'CastError') {
    return new ApiError(400, `Invalid value for field "${err.path}".`)
  }

  return null
}

// ── JWT error normalisation ───────────────────────────────────────────────────

const normaliseJwtError = (err) => {
  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid token.')
  }
  if (err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Token has expired.')
  }
  return null
}

// ── Main error handler ────────────────────────────────────────────────────────

const errorHandler = (err, req, res, _next) => {
  // SL-010 — always log the full error server-side regardless of environment
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err)

  // Try well-known driver / library errors first
  let error =
    normaliseMongoseError(err) ??
    normaliseJwtError(err) ??
    null

  if (!error) {
    if (err instanceof ApiError) {
      error = err
    } else {
      // SL-010 — unknown errors: expose message only in dev; generic text in prod
      const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500
      const message = IS_DEV
        ? (err.message || 'Internal server error.')
        : 'Something went wrong. Please try again later.'

      error = new ApiError(statusCode, message, err?.errors ?? [], err.stack)
    }
  }

  // SL-010 — build response: stack trace only in development
  const body = {
    success: false,
    message: error.message,
    ...(error.errors?.length ? { errors: error.errors } : {}),
    ...(IS_DEV && { stack: error.stack }),
  }

  return res.status(error.statusCode).json(body)
}

export { errorHandler }