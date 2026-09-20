/**
 * emailService.js — SendGrid integration with Development Mock Fallback
 * 
 * Sends transactional email notifications for:
 * 1. Price Drops
 * 2. Back-In-Stock alerts
 * 
 * In development (or if SENDGRID_API_KEY is not set), it logs the
 * rich HTML email preview directly to the server console.
 */

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.FROM_EMAIL || 'alerts@ine-tracker.com';

const isSendGridConfigured = Boolean(
  SENDGRID_API_KEY &&
  !SENDGRID_API_KEY.includes('your_') &&
  SENDGRID_API_KEY.startsWith('SG.')
);

if (isSendGridConfigured) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log(`[email] ✅ SendGrid configured with sender: ${FROM_EMAIL}`);
} else {
  console.log('[email] ℹ️  SendGrid API key not set or invalid. Running in Mock Email Mode (logs to console).');
}

/**
 * Format currency in Indian Rupees.
 */
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Send email (or log if mock mode)
 */
async function sendEmail({ to, subject, html, text }) {
  if (isSendGridConfigured) {
    try {
      const msg = {
        to,
        from: FROM_EMAIL,
        subject,
        html,
        text: text || subject,
      };
      await sgMail.send(msg);
      console.log(`[email] ✉️  SendGrid delivered email to: ${to} (Subject: "${subject}")`);
      return { success: true, mode: 'sendgrid', to, subject };
    } catch (err) {
      console.error('[email] ❌ SendGrid delivery failed:', err.response?.body || err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log('\n' + '─'.repeat(60));
    console.log(`📧 [MOCK EMAIL DISPATCHED]`);
    console.log(`   To:      ${to}`);
    console.log(`   From:    ${FROM_EMAIL}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Text:    ${text || subject}`);
    console.log('─'.repeat(60) + '\n');
    return { success: true, mode: 'mock', to, subject };
  }
}

/**
 * Send a Price Drop Alert Email
 */
export async function sendPriceDropEmail({ to, product, oldPrice, newPrice, targetPrice = null }) {
  const savings = oldPrice - newPrice;
  const percentDrop = Math.round((savings / oldPrice) * 100);
  const subject = `📉 Price Drop: ${product.name} dropped ${percentDrop}% to ${formatINR(newPrice)}!`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Price Drop Alert!</h1>
        <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 15px;">The item you're tracking just went on sale</p>
      </div>

      <div style="padding: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 18px;">${product.name}</h2>
        <div style="background: #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px solid #334155;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-bottom: 8px; color: #94a3b8; font-size: 14px;">Previous Price:</td>
              <td style="padding-bottom: 8px; text-align: right; color: #94a3b8; text-decoration: line-through; font-size: 15px;">${formatINR(oldPrice)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #ffffff; font-size: 16px; font-weight: bold;">New Price:</td>
              <td style="padding: 8px 0; text-align: right; color: #10b981; font-size: 22px; font-weight: 800;">${formatINR(newPrice)}</td>
            </tr>
            <tr>
              <td style="padding-top: 8px; color: #818cf8; font-size: 14px;">You Save:</td>
              <td style="padding-top: 8px; text-align: right; color: #818cf8; font-weight: bold; font-size: 15px;">${formatINR(savings)} (${percentDrop}% OFF)</td>
            </tr>
            ${targetPrice ? `
            <tr>
              <td style="padding-top: 8px; color: #cbd5e1; font-size: 13px;">Your Target Price:</td>
              <td style="padding-top: 8px; text-align: right; color: #cbd5e1; font-size: 13px;">${formatINR(targetPrice)}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${product.product_url || 'https://demo.inelabteamdev.com'}" style="background: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
            View Deal in Store ›
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
          You received this email because you subscribed to price alerts on INE Product Price Tracker.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Price Drop Alert: ${product.name} dropped from ${formatINR(oldPrice)} to ${formatINR(newPrice)}! View in store: ${product.product_url}`,
  });
}

/**
 * Send a Back-In-Stock Alert Email
 */
export async function sendBackInStockEmail({ to, product, stock }) {
  const subject = `📦 Back in Stock: ${product.name} is available now!`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Back in Stock!</h1>
        <p style="margin: 8px 0 0 0; color: #d1fae5; font-size: 15px;">An item on your watchlist is ready to purchase</p>
      </div>

      <div style="padding: 24px;">
        <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 18px;">${product.name}</h2>
        <div style="background: #1e293b; border-radius: 8px; padding: 18px; margin-bottom: 24px; border: 1px solid #334155;">
          <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 14px;">Stock Status:</p>
          <p style="margin: 0; color: #10b981; font-size: 20px; font-weight: 700;">${stock}</p>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${product.product_url || 'https://demo.inelabteamdev.com'}" style="background: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px;">
            Buy Now on Store ›
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
        <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
          You received this email because you subscribed to restock alerts on INE Product Price Tracker.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Back in Stock Alert: ${product.name} is now in stock (${stock})! View on store: ${product.product_url}`,
  });
}
