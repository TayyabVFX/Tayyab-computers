// api/_utils/webPushClient.js
// Utility module for sending Web Push notifications using the 'web-push' library.
// This file will be used by serverless functions on Vercel.

const webPush = require('web-push');

// VAPID keys should be set as environment variables in Vercel dashboard.
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('⚠️ VAPID keys are not set. Push notifications will not work.');
}

// Configure web-push with VAPID details.
webPush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@example.com'}`,
  vapidPublicKey,
  vapidPrivateKey
);

/**
 * Sends a push notification to a given subscription.
 * @param {Object} subscription - The PushSubscription object (JSON from client).
 * @param {Object} payload - Payload object to be sent. It will be stringified.
 * @returns {Promise} Resolves when the notification is sent.
 */
function sendNotification(subscription, payload) {
  const payloadString = JSON.stringify(payload);
  return webPush.sendNotification(subscription, payloadString).catch(err => {
    // Log the error but do not throw to prevent one bad subscription from aborting all.
    console.error('❌ Push notification error for endpoint', subscription.endpoint, err);
  });
}

module.exports = { sendNotification };
