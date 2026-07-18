// api/send-notification.js
const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

// Supabase — use env vars if set, otherwise fall back to hardcoded project keys
const supabaseUrl = process.env.SUPABASE_URL || 'https://cqefgloiprzmvsjwtkrr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZWZnbG9pcHJ6bXZzand0a3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTAzNzEsImV4cCI6MjA5OTg4NjM3MX0.Om_5sqI_9iwlE_JukIWe486yOl7nB8ZFWqB4TtvE_I4';
const supabase = createClient(supabaseUrl, supabaseKey);

// VAPID — configure from env vars at startup if available
let vapidConfigured = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:tayyabvfx@gmail.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  } catch (e) {
    console.error('VAPID env config failed:', e);
  }
}

module.exports = async function handler(req, res) {
  // CORS for all responses
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { title, body, image, link, userId, email, whatsapp } = req.body || {};

    // ── 1. Load VAPID keys from DB if not already configured via env vars ──
    if (!vapidConfigured) {
      const { data: settingsRows } = await supabase
        .from('orders')
        .select('address')
        .eq('customerName', '__notification_settings__')
        .limit(1);

      if (!settingsRows || settingsRows.length === 0) {
        return res.status(500).json({
          error: 'VAPID keys not found. Open your site in a browser first so the keys get generated, then try again.'
        });
      }

      const keys = JSON.parse(settingsRows[0].address);
      let privateKeyVal = keys.privateKey;
      if (keys.privateKey && typeof keys.privateKey === 'object' && keys.privateKey.d) {
        privateKeyVal = keys.privateKey.d;
      }
      webpush.setVapidDetails('mailto:tayyabvfx@gmail.com', keys.publicKey, privateKeyVal);
      vapidConfigured = true;
    }

    // ── 2. Save the notification payload to the DB (service worker reads this) ──
    const payloadData = {
      title: title || 'Store by Tayyab 🎉',
      body: body || 'New arrivals are now available!',
      image: image || null,
      link: link || '/',
      timestamp: Date.now()
    };

    const dbPayload = {
      customerName: '__notification_payload__',
      address: JSON.stringify(payloadData),
      whatsapp: 'payload',
      productId: '0',
      productName: 'payload',
      qty: 1,
      total: 0
    };

    // Use select-then-update/insert (same pattern as data-manager.js)
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('customerName', '__notification_payload__');

    if (existing && existing.length > 0) {
      const { error: updateErr } = await supabase
        .from('orders')
        .update(dbPayload)
        .eq('id', existing[0].id);
      if (updateErr) {
        console.error('Payload update error:', updateErr);
        return res.status(500).json({ error: 'Failed to update notification payload: ' + updateErr.message });
      }
      // Clean up duplicates
      for (let i = 1; i < existing.length; i++) {
        await supabase.from('orders').delete().eq('id', existing[i].id);
      }
    } else {
      const { error: insertErr } = await supabase
        .from('orders')
        .insert([dbPayload]);
      if (insertErr) {
        console.error('Payload insert error:', insertErr);
        return res.status(500).json({ error: 'Failed to insert notification payload: ' + insertErr.message });
      }
    }

    // ── 3. Fetch all push subscribers ──
    const { data: subscribers, error: subError } = await supabase
      .from('orders')
      .select('*')
      .eq('customerName', '__notification_subscription__');

    if (subError) {
      console.error('Subscriber fetch error:', subError);
      return res.status(500).json({ error: 'Failed to fetch subscribers: ' + subError.message });
    }

    let filteredSubscribers = subscribers || [];

    // Filter subscribers by target constraints if provided
    if (userId || email || whatsapp) {
      let targetWhatsapp = whatsapp ? whatsapp.trim() : null;
      if (targetWhatsapp && targetWhatsapp.startsWith('03')) {
        targetWhatsapp = '+92' + targetWhatsapp.substring(1);
      }
      
      filteredSubscribers = filteredSubscribers.filter(sub => {
        try {
          const subObj = JSON.parse(sub.address);
          
          if (userId && subObj.userId === userId) return true;
          if (email && (subObj.email === email || sub.whatsapp === email)) return true;
          if (targetWhatsapp && (subObj.whatsapp === targetWhatsapp || subObj.email === targetWhatsapp || sub.whatsapp === targetWhatsapp)) return true;
          
          return false;
        } catch (e) {
          return false;
        }
      });
    }

    if (filteredSubscribers.length === 0) {
      return res.status(200).json({ message: 'No matching subscribers to notify', results: [] });
    }

    // ── 4. Send push to every subscriber ──
    const results = [];
    for (const sub of filteredSubscribers) {
      try {
        const subscription = JSON.parse(sub.address);
        await webpush.sendNotification(
          subscription,
          null
        );
        results.push({ endpoint: subscription.endpoint, status: 'success' });
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid — remove it
          await supabase.from('orders').delete().eq('id', sub.id);
          results.push({ endpoint: 'expired', status: 'expired' });
        } else {
          const detail = err.message + (err.statusCode ? ` (Status: ${err.statusCode}, Body: ${err.body})` : '');
          results.push({ endpoint: 'failed', status: 'failed', error: detail });
        }
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status !== 'success').length;

    return res.status(200).json({
      message: `Sent to ${successCount} subscribers, ${failedCount} failed`,
      results
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};
