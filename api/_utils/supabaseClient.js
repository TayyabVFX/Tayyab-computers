// api/_utils/supabaseClient.js
// Utility for interacting with Supabase from Vercel serverless functions.
// Uses the service role key to allow privileged operations (e.g., reading all subscription rows).

const { createClient } = require('@supabase/supabase-js');

// These environment variables should be set in the Vercel dashboard.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase URL or Service Role Key not set. Database operations will fail.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Retrieves all push subscription records stored in the `orders` table.
 * Each record has customerName='__notification_subscription__' and the subscription JSON in the `address` column.
 * @returns {Promise<Array>} Array of subscription objects with at least { endpoint, keys: { p256dh, auth } }.
 */
async function getAllSubscriptions() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, address')
    .eq('customerName', '__notification_subscription__');

  if (error) {
    console.error('❌ Error fetching subscriptions from Supabase:', error);
    return [];
  }

  return data.map(row => {
    try {
      const sub = JSON.parse(row.address);
      return { id: row.id, ...sub };
    } catch (e) {
      console.warn('⚠️ Failed to parse subscription JSON for row', row.id);
      return null;
    }
  }).filter(Boolean);
}

module.exports = { supabase, getAllSubscriptions };
