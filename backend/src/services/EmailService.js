import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@selfiewash.com';

class EmailService {
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

  async sendReceiptEmail(userEmail, appointment, subject = 'Your Receipt — Selfie Wash') {
    if (!userEmail) {
      console.warn('[Email] No email provided for receipt');
      return;
    }

    try {
      const a = appointment;
      const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const hasActual = a.actualFinalAmount != null;
      const estimated = a.finalAmount ?? a.totalAmount ?? 0;
      const finalAmt = a.actualFinalAmount ?? estimated;
      const vatRate = a.vatRate ?? 0;
      const vatPercent = Math.round(vatRate * 100);
      const vatAmt = finalAmt - finalAmt / (1 + vatRate);
      const vatableSales = finalAmt - vatAmt;

      const payStatus = a.paymentStatus || (a.payment ? (a.paymentMethod === 'online' ? 'paid_online' : 'paid_cash') : 'unpaid');
      const labels = { unpaid: 'Unpaid', pending_payment: 'Awaiting Payment', paid_cash: 'Paid (Cash)', paid_online: 'Paid (Online)' };
      const isPaid = payStatus === 'paid_cash' || payStatus === 'paid_online';

      const now = new Date();
      const receiptDate = now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });
      const receiptTime = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' });

      const row = (l, r, extra = '') =>
        `<tr><td style="padding:3px 0;color:#555;${extra}">${l}</td><td style="padding:3px 0;text-align:right;${extra}">${r}</td></tr>`;

      const servicesHtml = (a.services || []).map((svc, i) => `
        <tr><td colspan="2" style="padding-top:8px;font-weight:bold;">Basket ${i + 1} — ${svc.name}</td></tr>
        ${row('Est. weight', `${svc.kg}kg`)}
        ${svc.actualKg != null ? row('Actual weight', `<b>${svc.actualKg}kg</b>`) : ''}
        ${svc.overweightCharge > 0 ? row('Overweight charge', fmt(svc.overweightCharge)) : ''}
      `).join('');

      const addOnsHtml = (a.addOns || []).length > 0 ? `
        <hr style="border:none;border-top:1px dashed #999;margin:12px 0;">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;">Add-ons</div>
        <table width="100%" style="font-size:13px;">
          ${a.addOns.map(x => row(`${x.basketIndex != null ? `Basket ${x.basketIndex + 1} — ` : ''}${x.name} x${x.quantity}`, fmt(x.price * x.quantity))).join('')}
        </table>` : '';

      const html = `
        <div style="font-family:'Courier New',monospace;max-width:360px;margin:0 auto;padding:20px;background:#fff;color:#111;font-size:13px;border:1px solid #ddd;">
          <div style="text-align:center;">
            <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888;">Customer's Copy</div>
            <div style="font-size:20px;font-weight:900;">SELFIE WASH</div>
            <div style="font-size:10px;color:#555;">Official Service Receipt</div>
            <div style="font-size:10px;color:#555;margin-top:6px;">${receiptDate} · ${receiptTime}</div>
          </div>
          <hr style="border:none;border-top:1px dashed #999;margin:12px 0;">
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;">Client</div>
          <div style="font-weight:bold;font-size:16px;">${a.userData?.name || '—'}</div>
          <div style="font-size:10px;color:#555;">${a.userData?.email || ''}</div>
          <hr style="border:none;border-top:1px dashed #999;margin:12px 0;">
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;">Schedule</div>
          <div>${a.slotDate} · ${a.slotTime}</div>
          <hr style="border:none;border-top:1px dashed #999;margin:12px 0;">
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#888;">Services</div>
          <table width="100%" style="font-size:13px;">${servicesHtml}</table>
          ${addOnsHtml}
          <hr style="border:none;border-top:1px dashed #999;margin:12px 0;">
          <table width="100%" style="font-size:13px;">
            ${hasActual ? row('Estimated', `<s style="color:#999;">${fmt(estimated)}</s>`) : ''}
            ${hasActual && a.overweightChargeTotal > 0 ? row('Overweight total', `+${fmt(a.overweightChargeTotal)}`) : ''}
                        ${a.discountAmount > 0 ? row(`Discount (${a.promoCode || ''})`, `-${fmt(a.discountAmount)}`) : ''}
            ${a.deliveryFee > 0 ? row('Delivery fee', `+${fmt(a.deliveryFee)}`) : ''}
            <tr><td colspan="2"><hr style="border:none;border-top:1px dashed #999;margin:6px 0;"></td></tr>
            ${row('TOTAL', fmt(finalAmt), 'font-size:15px;font-weight:900;color:#111;')}
            ${vatPercent > 0 ? row('VATable Sales', fmt(vatableSales), 'font-size:11px;') : ''}
            ${vatPercent > 0 ? row(`VAT (${vatPercent}%)`, fmt(vatAmt), 'font-size:11px;') : ''}
          </table>
          ${vatPercent > 0 ? '<div style="text-align:center;font-size:10px;color:#555;">Price is VAT inclusive</div>' : ''}
          <hr style="border:none;border-top:1px dashed #999;margin:12px 0;">
          <div style="text-align:center;">
            <span style="display:inline-block;border:1px solid ${isPaid ? '#16a34a' : '#d97706'};color:${isPaid ? '#16a34a' : '#d97706'};padding:2px 8px;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${labels[payStatus] || 'Unpaid'}</span>
            <div style="font-size:10px;color:#555;margin-top:6px;">Payment: ${a.preferredPaymentMethod === 'online' ? 'Online' : 'Cash'}</div>
          </div>
          <hr style="border:none;border-top:1px dashed #999;margin:16px 0 8px;">
          <div style="text-align:center;font-size:10px;color:#555;">Thank you for choosing Selfie Wash!<br/>Please keep this receipt for your records.</div>
        </div>
      `;

      const response = await resend.emails.send({
        from: SENDER_EMAIL,
        to: userEmail,
        subject,
        html,
      });

      console.log(`[Email] Receipt email sent to ${userEmail}:`, response);
      return response;
    } catch (error) {
      console.error(`[Email] Failed to send receipt email: ${error.message}`);
      throw error;
    }
  }
}

export default new EmailService();