/**
 * alertService.js — Price-Drop & Back-in-Stock Evaluation Engine
 * 
 * Called automatically after every successful scrape to:
 * 1. Compare new price/stock against the product's previous recording
 * 2. Identify price drops or restock events
 * 3. Match against user alert rules
 * 4. Generate in-app notifications
 * 5. Send automated emails via SendGrid
 */

import {
  getLatestTwoPrices,
  getAlertRulesForProduct,
  createNotification,
  getProductById,
} from '../db/supabase.js';
import { sendPriceDropEmail, sendBackInStockEmail } from './emailService.js';

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Evaluate alerts for a product immediately after a scrape.
 */
export async function evaluateAlerts(productId, newPrice, newStock) {
  try {
    const product = await getProductById(productId);
    if (!product) {
      console.warn(`[alertService] Product ${productId} not found for alert evaluation.`);
      return;
    }

    // Fetch the 2 most recent price records
    const recentPrices = await getLatestTwoPrices(productId);
    if (!recentPrices || recentPrices.length < 2) {
      // First recording for this product — no prior baseline to compare against
      console.log(`[alertService] First price recording for "${product.name}". Baseline established at ${formatINR(newPrice)}.`);
      return;
    }

    // recentPrices[0] is the current scrape just saved, recentPrices[1] is the previous one
    const prevRecord = recentPrices[1];
    const prevPrice = Number(prevRecord.price);
    const prevStock = prevRecord.stock || '';
    const currentPrice = Number(newPrice);
    const currentStock = String(newStock || '');

    console.log(`[alertService] Checking alerts for "${product.name}": Prev ${formatINR(prevPrice)} → New ${formatINR(currentPrice)}`);

    // Fetch alert rules configured for this product
    const rules = await getAlertRulesForProduct(productId);

    // ─── 1. CHECK FOR PRICE DROP ──────────────────────────────────────────
    const isPriceDrop = currentPrice < prevPrice;

    if (isPriceDrop) {
      const dropAmount = prevPrice - currentPrice;
      const percentDrop = Math.round((dropAmount / prevPrice) * 100);
      console.log(`[alertService] 📉 PRICE DROP DETECTED on "${product.name}": -${formatINR(dropAmount)} (-${percentDrop}%)`);

      // 1. Create global in-app notification (visible to all users on the site)
      await createNotification({
        userId: null,
        userEmail: 'all',
        productId,
        type: 'PRICE_DROP',
        title: `📉 Price Drop: ${product.name}`,
        message: `Dropped ${percentDrop}% from ${formatINR(prevPrice)} to ${formatINR(currentPrice)}!`,
        oldValue: prevPrice,
        newValue: currentPrice,
      });

      // 2. Process individual user alert rules
      for (const rule of rules) {
        let shouldTrigger = false;

        if (rule.target_price && currentPrice <= rule.target_price) {
          shouldTrigger = true;
        } else if (rule.on_price_drop) {
          shouldTrigger = true;
        }

        if (shouldTrigger && rule.user_email) {
          // Personal in-app notification
          await createNotification({
            userId: rule.user_id,
            userEmail: rule.user_email,
            productId,
            type: 'PRICE_DROP',
            title: `🎯 Target Met: ${product.name}`,
            message: `Dropped to ${formatINR(currentPrice)} (below your target of ${formatINR(rule.target_price || prevPrice)})`,
            oldValue: prevPrice,
            newValue: currentPrice,
          });

          // Email delivery via SendGrid
          await sendPriceDropEmail({
            to: rule.user_email,
            product,
            oldPrice: prevPrice,
            newPrice: currentPrice,
            targetPrice: rule.target_price,
          });
        }
      }
    }

    // ─── 2. CHECK FOR BACK IN STOCK ───────────────────────────────────────
    const wasOutOfStock = prevStock.toLowerCase().includes('out of stock');
    const isNowInStock = !currentStock.toLowerCase().includes('out of stock') && currentStock.trim().length > 0;

    if (wasOutOfStock && isNowInStock) {
      console.log(`[alertService] 📦 BACK IN STOCK DETECTED on "${product.name}": "${currentStock}"`);

      // Global in-app notification
      await createNotification({
        userId: null,
        userEmail: 'all',
        productId,
        type: 'BACK_IN_STOCK',
        title: `📦 Back in Stock: ${product.name}`,
        message: `Item is back in stock: ${currentStock}`,
        oldValue: prevStock,
        newValue: currentStock,
      });

      // Process user alert rules subscribed to restocks
      for (const rule of rules) {
        if (rule.on_back_in_stock && rule.user_email) {
          await createNotification({
            userId: rule.user_id,
            userEmail: rule.user_email,
            productId,
            type: 'BACK_IN_STOCK',
            title: `📦 Back in Stock Alert: ${product.name}`,
            message: `Now available: ${currentStock}`,
            oldValue: prevStock,
            newValue: currentStock,
          });

          await sendBackInStockEmail({
            to: rule.user_email,
            product,
            stock: currentStock,
          });
        }
      }
    }

  } catch (err) {
    console.error('[alertService] ❌ Error evaluating alerts:', err.message);
  }
}
