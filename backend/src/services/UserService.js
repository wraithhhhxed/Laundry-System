import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import UserRepository from '../repositories/UserRepository.js'
import AppointmentRepository from '../repositories/AppointmentRepository.js'
import { ApiError } from '../utils/apiError.js'
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

class UserService {
  async register(name, email, password, phone, address) {
    if (!name || !email || !password || !phone) {
      throw new ApiError(400, 'Missing required fields')
    }

    const exists = await UserRepository.findByEmail(email)
    if (exists) throw new ApiError(409, 'User already exists')

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await UserRepository.create({
      name, email,
      password: hashedPassword,
      phone,
      address: address ? JSON.parse(address) : { line1: '', line2: '' }
    })

    const token = jwt.sign(
      { id: user._id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return token
  }

  async login(email, password) {
    const user = await UserRepository.findByEmail(email)
    if (!user) throw new ApiError(401, 'Invalid credentials')

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) throw new ApiError(401, 'Invalid credentials')

    const token = jwt.sign(
      { id: user._id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return token
  }

  async getProfileByEmail(email) {
    return await UserRepository.findByEmail(email)
  }

  async getProfile(userId) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new ApiError(404, 'User not found')
    return user
  }

  async updateProfile(userId, updates, imageFile) {
    const { name, phone, address, dob, gender } = updates

    const updateData = { name, phone, dob, gender }
    if (address) updateData.address = JSON.parse(address)

    if (imageFile) {
      updateData.image = await uploadToCloudinary(imageFile.buffer, 'laundry-app/profiles')
    }

    return await UserRepository.updateById(userId, updateData)
  }

  async createPaymentLink(appointmentId) {
    const appointment = await AppointmentRepository.findById(appointmentId)
    if (!appointment) throw new ApiError(404, 'Appointment not found')

    if (appointment.payment) throw new ApiError(400, 'Appointment is already paid')

    const rawAmount = appointment.actualFinalAmount
      ?? appointment.finalAmount
      ?? appointment.totalAmount
      ?? appointment.amount
      ?? 0

    if (!rawAmount || rawAmount <= 0) {
      throw new ApiError(400, 'Appointment has no valid amount for payment')
    }

    const serviceLabel = Array.isArray(appointment.services) && appointment.services.length > 0
      ? appointment.services.map(s => s?.name ?? s?.toString()).filter(Boolean).join(', ')
      : appointment.service ?? 'Laundry Service'

    const itemName = appointment.promoCode
      ? `Laundry booking - ${serviceLabel} (Promo: ${appointment.promoCode})`
      : `Laundry booking - ${serviceLabel}`

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const authHeader  = `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`

    let sessionId, checkoutUrl

    try {
      const response = await axios.post(
        'https://api.paymongo.com/v1/checkout_sessions',
        {
          data: {
            attributes: {
              billing: { name: appointment.userData?.name || 'Customer' },
              line_items: [
                {
                  currency: 'PHP',
                  amount:   Math.round(rawAmount * 100),
                  name:     itemName,
                  quantity: 1,
                }
              ],
              payment_method_types: ['card', 'gcash', 'paymaya', 'grab_pay'],
              success_url: `${frontendUrl}/payment-success?appointmentId=${appointmentId}`,
              cancel_url:  `${frontendUrl}/my-appointments`,
              description: `Appointment ID: ${appointmentId}`,
              metadata: { appointmentId },
            }
          }
        },
        {
          headers: {
            Authorization:  authHeader,
            'Content-Type': 'application/json',
          }
        }
      )

      sessionId   = response.data.data.id
      checkoutUrl = response.data.data.attributes.checkout_url

    } catch (err) {
      console.error('PayMongo error:', JSON.stringify(err.response?.data, null, 2) || err.message)
      throw new ApiError(500, err.response?.data?.errors?.[0]?.detail ?? 'Payment link creation failed')
    }

    const MAX_RETRIES = 3
    let saved = false

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await AppointmentRepository.saveSessionId(appointmentId, sessionId)
        saved = true
        break
      } catch (dbErr) {
        console.error(`[PayMongo] saveSessionId attempt ${attempt} failed:`, dbErr.message)
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 300))
        }
      }
    }

    if (!saved) {
      try {
        await axios.post(
          `https://api.paymongo.com/v1/checkout_sessions/${sessionId}/expire`,
          {},
          {
            headers: {
              Authorization:  authHeader,
              'Content-Type': 'application/json',
            }
          }
        )
        console.error(`[PayMongo] Session ${sessionId} expired after DB write failure`)
      } catch (expireErr) {
        console.error(
          `[PayMongo] CRITICAL: session ${sessionId} for appointment ${appointmentId} ` +
          `could not be saved OR expired. Manual reconciliation required.`,
          expireErr.message
        )
      }
      throw new ApiError(500, 'Payment session could not be saved. Please try again.')
    }

    return { checkoutUrl, sessionId }
  }

  async verifyPayment(appointmentId) {
    const appointment = await AppointmentRepository.findById(appointmentId)
    if (!appointment) throw new ApiError(404, 'Appointment not found')

    if (appointment.payment) return true

    const sessionId = appointment.sessionId
    if (!sessionId) throw new ApiError(400, 'No payment session found for this appointment')

    const response = await axios.get(
      `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ':').toString('base64')}`
        }
      }
    )

    const status = response.data.data.attributes.payment_intent?.attributes?.status
    if (status === 'succeeded') {
      await AppointmentRepository.markPaid(appointmentId)
      return true
    }
    return false
  }

  async googleAuth(idToken) {
    const { OAuth2Client } = await import('google-auth-library')
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const { sub: googleId, email, name, picture } = ticket.getPayload()

    let user = await UserRepository.findByEmail(email)

    if (!user) {
      user = await UserRepository.create({
        name,
        email,
        googleId,
        password: null,
        image: picture,
        phone: '0000000000',
        address: { line1: '', line2: '' }
      })
    } else if (!user.googleId) {
      await UserRepository.updateById(user._id, { googleId })
    }

    const token = jwt.sign(
      { id: user._id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )
    return token
  }

  // ─── CHANGE PASSWORD (for email/password users) ──────────────────────────
  async changePassword(userId, oldPassword, newPassword) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new ApiError(404, 'User not found')

    if (!user.password) {
      throw new ApiError(400, 'This account uses Google login. Use "Set Password" instead.')
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) throw new ApiError(401, 'Current password is incorrect')

    if (newPassword.length < 8) {
      throw new ApiError(400, 'New password must be at least 8 characters')
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await UserRepository.updateById(userId, { password: hashed })
  }

  // ─── SET PASSWORD (for Google-only users setting a password for the first time) ──
  async setPassword(userId, newPassword) {
    const user = await UserRepository.findById(userId)
    if (!user) throw new ApiError(404, 'User not found')

    if (user.password) {
      throw new ApiError(400, 'Password already set. Use "Change Password" instead.')
    }

    if (newPassword.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters')
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await UserRepository.updateById(userId, { password: hashed })
  }

  // ─── FORGOT PASSWORD ─────────────────────────────────────────────────────
  async forgotPassword(email) {
    const user = await UserRepository.findByEmail(email)
    if (!user) throw new ApiError(404, 'No account found with that email.')

    const rawToken    = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expires     = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await UserRepository.saveResetToken(user._id, hashedToken, expires)

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}` // ✅ fixed

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from:    `"Selfie Wash" <${process.env.GMAIL_USER}>`,
      to:      user.email,
      subject: 'Password Reset Link — Selfie Wash',
      html: `
        <div style="font-family:Georgia,serif;max-width:480px;margin:auto;padding:32px;border:1px solid #ede9fe;border-radius:8px;">
          <h2 style="color:#7c3aed;margin-bottom:8px;">Selfie Wash</h2>
          <p style="color:#374151;">Hi <strong>${user.name}</strong>,</p>
          <p style="color:#374151;">We received a request to reset your password. Click the button below — this link expires in <strong>15 minutes</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;font-family:sans-serif;font-size:14px;border-radius:4px;">
            Reset My Password
          </a>
          <p style="color:#6b7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color:#6b7280;font-size:13px;">— The Selfie Wash Team</p>
        </div>
      `,
    })
  }

  // ─── RESET PASSWORD ───────────────────────────────────────────────────────
  async resetPassword(rawToken, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
    const user        = await UserRepository.findByResetToken(hashedToken)

    if (!user) throw new ApiError(400, 'Reset link is invalid or has expired.')

    if (newPassword.length < 8)
      throw new ApiError(400, 'Password must be at least 8 characters.')

    const hashed = await bcrypt.hash(newPassword, 10)

    user.password             = hashed
    user.resetPasswordToken   = null
    user.resetPasswordExpires = null
    await user.save()
  }
}

export default new UserService()