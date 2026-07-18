// Service Worker for Store By Tayyab Web Push Notifications

// Force immediate activation
self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
    console.log('Push notification event received!');
    
    // Fetch the latest notification payload from Supabase
    const supabaseUrl = 'https://cqefgloiprzmvsjwtkrr.supabase.co/rest/v1/orders?customerName=eq.__notification_payload__&order=id.desc&limit=1';
    const supabaseApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZWZnbG9pcHJ6bXZzand0a3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTAzNzEsImV4cCI6MjA5OTg4NjM3MX0.Om_5sqI_9iwlE_JukIWe486yOl7nB8ZFWqB4TtvE_I4';
    
    event.waitUntil(
        fetch(supabaseUrl, {
            headers: {
                'apikey': supabaseApiKey,
                'Authorization': `Bearer ${supabaseApiKey}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const payload = JSON.parse(data[0].address);
                const title = payload.title || 'Store by Tayyab 🎉';
                const options = {
                    body: payload.body || 'New arrivals are now available!',
                    icon: payload.image || 'https://img.icons8.com/color/96/bell.png',
                    image: payload.image || null,
                    data: {
                        link: payload.link || '/'
                    },
                    vibrate: [100, 50, 100]
                };
                return self.registration.showNotification(title, options);
            }
        })
        .catch(err => {
            console.error('Error fetching notification payload:', err);
            return self.registration.showNotification('New Arrival 🎉', {
                body: 'Check out the latest products on our store!',
                icon: 'https://img.icons8.com/color/96/bell.png'
            });
        })
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    let urlToOpen = '/';
    if (event.notification.data && event.notification.data.link) {
        urlToOpen = event.notification.data.link;
    }
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then(function(windowClients) {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
