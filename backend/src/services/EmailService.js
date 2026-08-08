import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Default sender email — change this sa environment variable kung gusto
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@selfiewash.com';

class EmailService {
  /**
   * Send "Picked Up" email
   * @param {string} userEmail - recipient email
   * @param {object} appointment - appointment data
   */
  async sendPickupReadyEmail(userEmail, appointment) {
    if (!userEmail) {
      console.warn('[Email] No email provided for pickup notification');
      return;
    }

    try {
      const branchName = appointment.branch?.name || 'Selfie Wash';
      const appointmentId = appointment.id;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7faff;">
          <div style="background: #2563eb; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Laundry Picked Up</h1>
          </div>
          
          <div style="background: white; padding: 24px; border: 1px solid #dbeafe;">
            <p style="font-size: 16px; color: #1f2937;">Hi there,</p>
            
            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Good news! Our rider has picked up your laundry and it is now on its way to <strong>${branchName}</strong> for processing.</p>
            
            <div style="background-color: #eff6ff; padding: 16px; border-left: 4px solid #2563eb; margin: 20px 0;">
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>Appointment ID:</strong> ${appointmentId}</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>Branch:</strong> ${branchName}</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>Status:</strong> Picked Up — In Transit</p>
            </div>

            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">We will notify you again once your laundry is ready and out for delivery back to you. If you have any questions, feel free to reach out to us.</p>

            <p style="font-size: 15px; color: #1f2937;">Thank you for choosing Selfie Wash!</p>

            <hr style="border: none; border-top: 1px solid #dbeafe; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">Selfie Wash Laundry System | Hagonoy, Taguig</p>
          </div>
        </div>
      `;

      const response = await resend.emails.send({
        from: SENDER_EMAIL,
        to: userEmail,
        subject: 'Laundry Picked Up — In Transit',
        html,
      });

      console.log(`[Email] Pickup email sent to ${userEmail}:`, response);
      return response;
    } catch (error) {
      console.error(`[Email] Failed to send pickup email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send "Delivery Completed" email
   * @param {string} userEmail - recipient email
   * @param {object} appointment - appointment data
   */
  async sendDeliveryCompletedEmail(userEmail, appointment) {
    if (!userEmail) {
      console.warn('[Email] No email provided for delivery completed notification');
      return;
    }

    try {
      const branchName = appointment.branch?.name || 'Selfie Wash';
      const appointmentId = appointment.id;
      const finalAmount = appointment.finalAmount || 0;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7faff;">
          <div style="background: #2563eb; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Laundry Delivered</h1>
          </div>
          
          <div style="background: white; padding: 24px; border: 1px solid #dbeafe;">
            <p style="font-size: 16px; color: #1f2937;">Hi there,</p>
            
            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Your laundry has been successfully delivered! We hope everything is perfect.</p>
            
            <div style="background-color: #f0fdf4; padding: 16px; border-left: 4px solid #22c55e; margin: 20px 0;">
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>Appointment ID:</strong> ${appointmentId}</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>Branch:</strong> ${branchName}</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>Status:</strong> Delivered</p>
              <p style="margin: 5px 0; color: #1f2937; font-size: 14px;"><strong>Amount Paid:</strong> ₱${finalAmount.toFixed(2)}</p>
            </div>

            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">Thank you for choosing Selfie Wash! We appreciate your trust and look forward to serving you again soon.</p>

            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">If you have any feedback or concerns, please don't hesitate to contact us.</p>

            <p style="font-size: 15px; color: #1f2937;">Happy laundry day!</p>

            <hr style="border: none; border-top: 1px solid #dbeafe; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">Selfie Wash Laundry System | Hagonoy, Taguig</p>
          </div>
        </div>
      `;

      const response = await resend.emails.send({
        from: SENDER_EMAIL,
        to: userEmail,
        subject: 'Laundry Delivered Successfully',
        html,
      });

      console.log(`[Email] Delivery completed email sent to ${userEmail}:`, response);
      return response;
    } catch (error) {
      console.error(`[Email] Failed to send delivery completed email: ${error.message}`);
      throw error;
    }
  }

/**
   * Send "Password Reset" email
   * @param {string} userEmail - recipient email
   * @param {string} userName - user's name
   * @param {string} resetUrl - full reset link with token
   */
  async sendPasswordResetEmail(userEmail, userName, resetUrl) {
    if (!userEmail) {
      console.warn('[Email] No email provided for password reset');
      return;
    }

    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7faff;">
          <div style="background: #2563eb; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Password Reset</h1>
          </div>

          <div style="background: white; padding: 24px; border: 1px solid #dbeafe;">
            <p style="font-size: 16px; color: #1f2937;">Hi ${userName || 'there'},</p>

            <p style="font-size: 15px; color: #374151; line-height: 1.6;">We received a request to reset your password. Click the button below — this link expires in <strong>15 minutes</strong>.</p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 28px; background: #2563eb; color: #fff; text-decoration: none; font-size: 14px; border-radius: 4px;">
                Reset My Password
              </a>
            </div>

            <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">If you didn't request this, you can safely ignore this email.</p>

            <hr style="border: none; border-top: 1px solid #dbeafe; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">Selfie Wash Laundry System | Hagonoy, Taguig</p>
          </div>
        </div>
      `;

      const response = await resend.emails.send({
        from: SENDER_EMAIL,
        to: userEmail,
        subject: 'Password Reset Link — Selfie Wash',
        html,
      });

      console.log(`[Email] Password reset email sent to ${userEmail}:`, response);
      return response;
    } catch (error) {
      console.error(`[Email] Failed to send password reset email: ${error.message}`);
      throw error;
    }
  }

}

export default new EmailService();