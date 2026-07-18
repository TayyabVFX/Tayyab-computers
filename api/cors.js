// Secure serverless CORS proxy for Store By Tayyab Web Push Notifications on Vercel
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, TTL, Urgency'
    );

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);
        
        // Copy headers to forward
        const headers = {};
        const forbiddenHeaders = ['host', 'connection', 'accept-encoding', 'content-length'];
        for (const [key, value] of Object.entries(req.headers)) {
            if (!forbiddenHeaders.includes(key.toLowerCase())) {
                headers[key] = value;
            }
        }

        // Handle body payload safely
        let bodyPayload = undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            bodyPayload = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
        }

        // Fetch target from backend context (no CORS restrictions)
        const response = await fetch(decodedUrl, {
            method: req.method,
            headers: headers,
            body: bodyPayload
        });

        const data = await response.text();
        return res.status(response.status).send(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
