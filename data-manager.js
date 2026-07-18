// data-manager.js

const SUPABASE_URL = 'https://cqefgloiprzmvsjwtkrr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZWZnbG9pcHJ6bXZzand0a3JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTAzNzEsImV4cCI6MjA5OTg4NjM3MX0.Om_5sqI_9iwlE_JukIWe486yOl7nB8ZFWqB4TtvE_I4';

let supabase = null;

function getSupabaseClient() {
    if (supabase) return supabase;
    const isSupabaseConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY';
    if (window.supabase && isSupabaseConfigured) {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("⚡ Supabase Client initialized successfully.");
            return supabase;
        } catch (err) {
            console.error("❌ Failed to initialize Supabase client:", err);
        }
    }
    return null;
}

function omitUndefined(obj) {
    const cleaned = {};
    Object.keys(obj).forEach((key) => {
        if (obj[key] !== undefined) {
            cleaned[key] = obj[key];
        }
    });
    return cleaned;
}

function normalizeProductId(id) {
    if (id === null || id === undefined || id === '') return id;
    const asNumber = Number(id);
    return Number.isNaN(asNumber) ? id : asNumber;
}

function buildProductInsertRow(product) {
    return {
        name: product.name,
        sku: product.sku,
        cost: parseFloat(product.cost) || 0,
        price: parseFloat(product.price) || 0,
        stock: parseInt(product.stock, 10) || 0,
        category: product.category || 'Other',
        variants: product.variants || '',
        description: product.description || '',
        photos: Array.isArray(product.photos) ? product.photos : [],
        videoUrl: product.videoUrl || '',
        slug: product.slug || '',
        shipping_fee: parseFloat(product.shipping_fee) || 0,
        is_featured: product.is_featured === true || product.is_featured === 'true'
    };
}

function buildProductUpdateRow(updates) {
    const row = {};

    if (updates.name !== undefined) row.name = updates.name;
    if (updates.sku !== undefined) row.sku = updates.sku;
    if (updates.cost !== undefined) row.cost = parseFloat(updates.cost) || 0;
    if (updates.price !== undefined) row.price = parseFloat(updates.price) || 0;
    if (updates.stock !== undefined) row.stock = parseInt(updates.stock, 10) || 0;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.variants !== undefined) row.variants = updates.variants;
    if (updates.description !== undefined) row.description = updates.description;
    if (updates.photos !== undefined) row.photos = Array.isArray(updates.photos) ? updates.photos : [];
    if (updates.videoUrl !== undefined) row.videoUrl = updates.videoUrl;
    if (updates.slug !== undefined) row.slug = updates.slug;
    if (updates.shipping_fee !== undefined) row.shipping_fee = parseFloat(updates.shipping_fee) || 0;
    if (updates.is_featured !== undefined) {
        row.is_featured = updates.is_featured === true || updates.is_featured === 'true';
    }

    return row;
}

function formatSupabaseError(error, action) {
    if (!error) return `Failed to ${action} product.`;
    const message = error.message || error.details || error.hint || `Failed to ${action} product.`;
    console.error(`Error ${action} product in Supabase:`, error);
    return message;
}

class DataManager {
    constructor() {
        this.STORAGE_KEYS = {
            products: 'tayyab_products',
            orders: 'tayyab_orders',
            nextProductId: 'tayyab_next_product_id',
            nextOrderId: 'tayyab_next_order_id'
        };
        this.lastError = null;
        this.initializeStorageIfEmpty();
    }

    clearLastError() {
        this.lastError = null;
    }

    initializeStorageIfEmpty() {
        if (!localStorage.getItem(this.STORAGE_KEYS.products)) {
            localStorage.setItem(this.STORAGE_KEYS.products, JSON.stringify([]));
            localStorage.setItem(this.STORAGE_KEYS.nextProductId, '1');
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.orders)) {
            localStorage.setItem(this.STORAGE_KEYS.orders, JSON.stringify([]));
            localStorage.setItem(this.STORAGE_KEYS.nextOrderId, '1001');
        }
    }

    getProductsSync() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.products) || '[]');
    }

    // ========== PRODUCTS CRUD ==========

    async getProducts() {
        const client = getSupabaseClient();
        if (client) {
            const { data, error } = await client
                .from('products')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.error('Error fetching products from Supabase:', error);
                return this.getProductsSync();
            }
            const productsList = data || [];
            try {
                localStorage.setItem(this.STORAGE_KEYS.products, JSON.stringify(productsList));
            } catch (e) {
                console.error('Error writing products cache:', e);
            }
            return productsList;
        }

        return this.getProductsSync();
    }

    async addProduct(product) {
        this.clearLastError();
        const client = getSupabaseClient();

        if (client) {
            const row = buildProductInsertRow(product);
            const { data, error } = await client
                .from('products')
                .insert([row])
                .select()
                .single();

            if (error) {
                this.lastError = formatSupabaseError(error, 'add');
                return null;
            }

            window.dispatchEvent(new Event('productsUpdated'));
            return data;
        }

        const products = this.getProductsSync();
        const nextId = parseInt(localStorage.getItem(this.STORAGE_KEYS.nextProductId) || '0', 10) + 1;
        product.id = String(nextId);
        product.createdAt = new Date().toISOString();
        product.photos = product.photos || [];
        products.push(product);

        localStorage.setItem(this.STORAGE_KEYS.products, JSON.stringify(products));
        localStorage.setItem(this.STORAGE_KEYS.nextProductId, String(nextId));
        window.dispatchEvent(new Event('productsUpdated'));
        return product;
    }

    async updateProduct(id, updates) {
        this.clearLastError();
        const client = getSupabaseClient();
        const normalizedId = normalizeProductId(id);

        if (client) {
            const row = buildProductUpdateRow(updates);
            if (Object.keys(row).length === 0) {
                this.lastError = 'No product changes to save.';
                return null;
            }

            const { data, error } = await client
                .from('products')
                .update(row)
                .eq('id', normalizedId)
                .select()
                .single();

            if (error) {
                this.lastError = formatSupabaseError(error, 'update');
                return null;
            }

            window.dispatchEvent(new Event('productsUpdated'));
            return data;
        }

        const products = this.getProductsSync();
        const index = products.findIndex(p => String(p.id) === String(id));
        if (index !== -1) {
            products[index] = { ...products[index], ...updates };
            localStorage.setItem(this.STORAGE_KEYS.products, JSON.stringify(products));
            window.dispatchEvent(new Event('productsUpdated'));
            return products[index];
        }

        this.lastError = 'Product not found.';
        return null;
    }

    async deleteProduct(id) {
        this.clearLastError();
        const client = getSupabaseClient();
        const normalizedId = normalizeProductId(id);

        if (client) {
            const { error } = await client
                .from('products')
                .delete()
                .eq('id', normalizedId);

            if (error) {
                this.lastError = formatSupabaseError(error, 'delete');
                return false;
            }

            window.dispatchEvent(new Event('productsUpdated'));
            return true;
        }

        const products = this.getProductsSync();
        const filtered = products.filter(p => String(p.id) !== String(id));
        localStorage.setItem(this.STORAGE_KEYS.products, JSON.stringify(filtered));
        window.dispatchEvent(new Event('productsUpdated'));
        return true;
    }

    // ========== ORDERS CRUD ==========

    getOrdersSync() {
        const raw = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.orders) || '[]');
        return raw.filter(o => o.customerName !== "__notification_settings__" &&
                             o.customerName !== "__notification_subscription__" &&
                             o.customerName !== "__notification_payload__" &&
                             o.customerName !== "__profile__");
    }

    async getOrders() {
        const client = getSupabaseClient();
        if (client) {
            const { data, error } = await client
                .from('orders')
                .select('*')
                .order('id', { ascending: false });

            if (error) {
                console.error('Error fetching orders from Supabase:', error);
                return this.getOrdersSync();
            }
            const ordersList = data || [];
            try {
                localStorage.setItem(this.STORAGE_KEYS.orders, JSON.stringify(ordersList));
            } catch (e) {
                console.error('Error writing orders cache:', e);
            }
            return ordersList.filter(o => o.customerName !== "__notification_settings__" &&
                                         o.customerName !== "__notification_subscription__" &&
                                         o.customerName !== "__notification_payload__" &&
                                         o.customerName !== "__profile__");
        }

        return this.getOrdersSync();
    }

    async addOrder(order) {
        this.clearLastError();
        const client = getSupabaseClient();

        if (client) {
            const { data, error } = await client
                .from('orders')
                .insert([omitUndefined({
                    customerName: order.customerName,
                    whatsapp: order.whatsapp,
                    address: order.address,
                    productId: String(order.productId),
                    productName: order.productName,
                    qty: parseInt(order.qty, 10) || 1,
                    total: parseFloat(order.total) || 0
                })])
                .select()
                .single();

            if (error) {
                this.lastError = formatSupabaseError(error, 'add order for');
                console.error('Error adding order to Supabase:', error);
                return null;
            }

            window.dispatchEvent(new Event('ordersUpdated'));
            return data;
        }

        const orders = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.orders) || '[]');
        const nextId = Math.max(1000, ...orders.map(o => parseInt(o.id, 10) || 1000)) + 1;
        order.id = String(nextId);
        order.createdAt = new Date().toISOString();
        orders.push(order);

        localStorage.setItem(this.STORAGE_KEYS.orders, JSON.stringify(orders));
        window.dispatchEvent(new Event('ordersUpdated'));
        return order;
    }

    async updateOrder(id, updates) {
        this.clearLastError();
        const client = getSupabaseClient();
        const normalizedId = normalizeProductId(id);

        if (client) {
            const { data, error } = await client
                .from('orders')
                .update(omitUndefined({
                    customerName: updates.customerName,
                    whatsapp: updates.whatsapp,
                    address: updates.address,
                    productId: updates.productId !== undefined ? String(updates.productId) : undefined,
                    productName: updates.productName,
                    qty: updates.qty !== undefined ? (parseInt(updates.qty, 10) || 1) : undefined,
                    total: updates.total !== undefined ? (parseFloat(updates.total) || 0) : undefined,
                    status: updates.status
                }))
                .eq('id', normalizedId)
                .select()
                .single();

            if (error) {
                const msg = error.message || '';
                if (msg.includes('column') && msg.includes('status')) {
                    this.lastError = "Database column 'status' is missing in 'orders' table. Please run the SQL command in 'supabase-orders-status.sql' inside your Supabase Dashboard -> SQL Editor to add it.";
                } else {
                    this.lastError = formatSupabaseError(error, 'update order for');
                }
                console.error('Error updating order in Supabase:', error);
                return null;
            }

            window.dispatchEvent(new Event('ordersUpdated'));
            return data;
        }

        const orders = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.orders) || '[]');
        const index = orders.findIndex(o => String(o.id) === String(id));
        if (index === -1) {
            this.lastError = 'Order not found.';
            return null;
        }
        orders[index] = { ...orders[index], ...updates };
        localStorage.setItem(this.STORAGE_KEYS.orders, JSON.stringify(orders));
        window.dispatchEvent(new Event('ordersUpdated'));
        return orders[index];
    }

    async deleteOrder(id) {
        this.clearLastError();
        const client = getSupabaseClient();

        if (client) {
            const { error } = await client
                .from('orders')
                .delete()
                .eq('id', normalizeProductId(id));

            if (error) {
                this.lastError = formatSupabaseError(error, 'delete order for');
                console.error('Error deleting order from Supabase:', error);
                return false;
            }

            window.dispatchEvent(new Event('ordersUpdated'));
            return true;
        }

        const orders = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.orders) || '[]');
        const filtered = orders.filter(o => String(o.id) !== String(id));
        localStorage.setItem(this.STORAGE_KEYS.orders, JSON.stringify(filtered));
        window.dispatchEvent(new Event('ordersUpdated'));
        return true;
    }

    // ========== BANNERS CRUD ==========

    getBannersSync(activeOnly = true) {
        const banners = JSON.parse(localStorage.getItem('tayyab_banners') || '[]');
        return activeOnly ? banners.filter(b => b.active !== false) : banners;
    }

    async getBanners(activeOnly = true) {
        const client = getSupabaseClient();
        if (client) {
            let query = client
                .from('banners')
                .select('*')
                .order('order', { ascending: true });

            if (activeOnly) {
                query = query.eq('active', true);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching banners from Supabase:', error);
                return this.getBannersSync(activeOnly);
            }
            const bannersList = data || [];
            try {
                if (!activeOnly) {
                    localStorage.setItem('tayyab_banners', JSON.stringify(bannersList));
                }
            } catch (e) {
                console.error('Error writing banners cache:', e);
            }
            return bannersList;
        }

        return this.getBannersSync(activeOnly);
    }

    async addBanner(banner) {
        this.clearLastError();
        const client = getSupabaseClient();

        if (client) {
            const { data, error } = await client
                .from('banners')
                .insert([omitUndefined({
                    image_url: banner.image_url,
                    video_url: banner.video_url || null,
                    link: banner.link || null,
                    order: parseInt(banner.order, 10) || 0,
                    active: banner.active !== false
                })])
                .select()
                .single();

            if (error) {
                this.lastError = formatSupabaseError(error, 'add banner');
                return null;
            }

            window.dispatchEvent(new Event('bannersUpdated'));
            return data;
        }

        const banners = JSON.parse(localStorage.getItem('tayyab_banners') || '[]');
        const nextId = Math.max(0, ...banners.map(b => parseInt(b.id, 10) || 0)) + 1;
        const newBanner = {
            id: String(nextId),
            ...banner,
            created_at: new Date().toISOString()
        };
        banners.push(newBanner);
        localStorage.setItem('tayyab_banners', JSON.stringify(banners));
        window.dispatchEvent(new Event('bannersUpdated'));
        return newBanner;
    }

    async updateBanner(id, updates) {
        this.clearLastError();
        const client = getSupabaseClient();
        const normalizedId = normalizeProductId(id);

        if (client) {
            const { data, error } = await client
                .from('banners')
                .update(omitUndefined({
                    image_url: updates.image_url,
                    video_url: updates.video_url || null,
                    link: updates.link || null,
                    order: updates.order !== undefined ? parseInt(updates.order, 10) : undefined,
                    active: updates.active !== undefined ? updates.active : undefined
                }))
                .eq('id', normalizedId)
                .select()
                .single();

            if (error) {
                this.lastError = formatSupabaseError(error, 'update banner');
                return null;
            }

            window.dispatchEvent(new Event('bannersUpdated'));
            return data;
        }

        const banners = JSON.parse(localStorage.getItem('tayyab_banners') || '[]');
        const index = banners.findIndex(b => String(b.id) === String(id));
        if (index === -1) {
            this.lastError = 'Banner not found.';
            return null;
        }
        banners[index] = { ...banners[index], ...updates };
        localStorage.setItem('tayyab_banners', JSON.stringify(banners));
        window.dispatchEvent(new Event('bannersUpdated'));
        return banners[index];
    }

    async deleteBanner(id) {
        this.clearLastError();
        const client = getSupabaseClient();
        const normalizedId = normalizeProductId(id);

        if (client) {
            const { error } = await client
                .from('banners')
                .delete()
                .eq('id', normalizedId);

            if (error) {
                this.lastError = formatSupabaseError(error, 'delete banner');
                return false;
            }

            window.dispatchEvent(new Event('bannersUpdated'));
            return true;
        }

        const banners = JSON.parse(localStorage.getItem('tayyab_banners') || '[]');
        const filtered = banners.filter(b => String(b.id) !== String(id));
        localStorage.setItem('tayyab_banners', JSON.stringify(filtered));
        window.dispatchEvent(new Event('bannersUpdated'));
        return true;
    }

    // ========== NOTIFICATIONS METHODS ==========
    async getNotificationSettings() {
        const client = getSupabaseClient();
        if (client) {
            const { data, error } = await client
                .from('orders')
                .select('*')
                .eq('customerName', '__notification_settings__')
                .limit(1);
            if (error || !data || data.length === 0) return null;
            return JSON.parse(data[0].address);
        }
        return null;
    }

    async saveNotificationSettings(settings) {
        const client = getSupabaseClient();
        if (client) {
            const { data } = await client
                .from('orders')
                .select('id')
                .eq('customerName', '__notification_settings__')
                .limit(1);
            
            const payload = {
                customerName: '__notification_settings__',
                address: JSON.stringify(settings),
                whatsapp: 'settings',
                productId: '0',
                productName: 'settings',
                qty: 1,
                total: 0
            };
            
            if (data && data.length > 0) {
                await client
                    .from('orders')
                    .update(payload)
                    .eq('id', data[0].id);
            } else {
                await client
                    .from('orders')
                    .insert([payload]);
            }
        }
    }

    async getSubscribers() {
        const client = getSupabaseClient();
        if (client) {
            const { data, error } = await client
                .from('orders')
                .select('*')
                .eq('customerName', '__notification_subscription__');
            if (error || !data) return [];
            return data.map(row => {
                try {
                    const sub = JSON.parse(row.address);
                    return { id: row.id, ...sub };
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);
        }
        return [];
    }

    async addSubscriber(subscription) {
        const client = getSupabaseClient();
        if (client) {
            const endpoint = subscription.endpoint;
            const activeUser = this.getCurrentUser();
            let userId = null;
            let email = null;
            if (activeUser) {
                userId = activeUser.id;
                email = activeUser.whatsapp;
            }
            const subPayload = {
                ...subscription,
                userId: userId,
                email: email
            };

            const { data } = await client
                .from('orders')
                .select('id')
                .eq('customerName', '__notification_subscription__')
                .eq('whatsapp', endpoint)
                .limit(1);
                
            if (data && data.length > 0) {
                await client
                    .from('orders')
                    .update({ address: JSON.stringify(subPayload) })
                    .eq('id', data[0].id);
                return data[0];
            }
            
            const { data: inserted, error } = await client
                .from('orders')
                .insert([{
                    customerName: '__notification_subscription__',
                    whatsapp: endpoint,
                    address: JSON.stringify(subPayload),
                    productId: '0',
                    productName: 'subscription',
                    qty: 1,
                    total: 0
                }])
                .select()
                .single();
            return inserted;
        }
        return null;
    }

    async deleteSubscriber(id) {
        const client = getSupabaseClient();
        if (client) {
            const { error } = await client
                .from('orders')
                .delete()
                .eq('id', id);
            return !error;
        }
        return false;
    }

    // ========== CUSTOM AUTH & PROFILES ==========
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('tayyab_user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    async signInOutProfile({ fullName, whatsapp, address }) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (!client) {
            this.lastError = "Database not connected.";
            return null;
        }

        let normalizedPhone = whatsapp.trim();
        if (normalizedPhone.startsWith('03')) {
            normalizedPhone = '+92' + normalizedPhone.substring(1);
        }

        const { data: existing, error: fetchError } = await client
            .from('orders')
            .select('*')
            .eq('customerName', '__profile__')
            .eq('whatsapp', normalizedPhone)
            .limit(1);

        if (fetchError) {
            this.lastError = fetchError.message;
            return null;
        }

        let sessionUser = null;

        if (existing && existing.length > 0) {
            const dbRecord = existing[0];
            const profileData = JSON.parse(dbRecord.address);

            // Keep original details; only save typed address if original address is empty
            let shouldUpdateDb = false;
            if (!profileData.otp) {
                profileData.otp = Math.floor(100000 + Math.random() * 900000).toString();
                profileData.verified = profileData.verified || false;
                shouldUpdateDb = true;
            }
            if ((!profileData.address || !profileData.address.trim()) && address && address.trim()) {
                profileData.address = address;
                shouldUpdateDb = true;
            }

            if (shouldUpdateDb) {
                const updatedAddressField = JSON.stringify(profileData);
                const { error: updateError } = await client
                    .from('orders')
                    .update({ address: updatedAddressField })
                    .eq('id', dbRecord.id);

                if (updateError) {
                    this.lastError = updateError.message;
                    return null;
                }
            }

            sessionUser = {
                id: profileData.id,
                fullName: profileData.fullName,
                whatsapp: normalizedPhone,
                address: profileData.address,
                otp: profileData.otp || '',
                verified: profileData.verified || false
            };
        } else {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const profileId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
            const profileData = {
                id: profileId,
                fullName: fullName,
                whatsapp: normalizedPhone,
                address: address || '',
                otp: otpCode,
                verified: false,
                createdAt: new Date().toISOString()
            };

            const { error: insertError } = await client
                .from('orders')
                .insert([{
                    customerName: '__profile__',
                    whatsapp: normalizedPhone,
                    address: JSON.stringify(profileData),
                    productId: profileId,
                    productName: fullName.toLowerCase(),
                    qty: 1,
                    total: 0
                }]);

            if (insertError) {
                this.lastError = insertError.message;
                return null;
            }

            sessionUser = {
                id: profileId,
                fullName: fullName,
                whatsapp: normalizedPhone,
                address: address || '',
                otp: otpCode,
                verified: false
            };
        }

        localStorage.setItem('tayyab_user', JSON.stringify(sessionUser));

        try {
            if (window.navigator && window.navigator.serviceWorker) {
                window.navigator.serviceWorker.ready.then(async (registration) => {
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        await this.addSubscriber(subscription);
                    }
                }).catch(() => {});
            }
        } catch (e) {
            console.warn('Re-subscribe failed:', e);
        }

        return sessionUser;
    }

    async registerProfile(profile) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (!client) {
            this.lastError = "Database not connected.";
            return null;
        }

        let normalizedPhone = profile.whatsapp.trim();
        if (normalizedPhone.startsWith('03')) {
            normalizedPhone = '+92' + normalizedPhone.substring(1);
        }

        const { data: existing } = await client
            .from('orders')
            .select('id')
            .eq('customerName', '__profile__')
            .eq('whatsapp', normalizedPhone)
            .limit(1);

        if (existing && existing.length > 0) {
            this.lastError = "WhatsApp number is already registered.";
            return null;
        }

        // Hash password using Web Crypto API
        const msgUint8 = new TextEncoder().encode(profile.password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const profileId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

        const profileData = {
            id: profileId,
            fullName: profile.fullName,
            whatsapp: normalizedPhone,
            address: profile.address,
            passwordHash: passwordHash,
            createdAt: new Date().toISOString()
        };

        const { data: inserted, error } = await client
            .from('orders')
            .insert([{
                customerName: '__profile__',
                whatsapp: normalizedPhone,
                address: JSON.stringify(profileData),
                productId: profileId,
                productName: profile.fullName.toLowerCase(),
                qty: 1,
                total: 0
            }])
            .select()
            .single();

        if (error) {
            this.lastError = formatSupabaseError(error, 'register');
            return null;
        }

        const sessionUser = {
            id: profileId,
            fullName: profile.fullName,
            whatsapp: normalizedPhone,
            address: profile.address
        };
        localStorage.setItem('tayyab_user', JSON.stringify(sessionUser));

        try {
            if (window.navigator && window.navigator.serviceWorker) {
                window.navigator.serviceWorker.ready.then(async (registration) => {
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        await this.addSubscriber(subscription);
                    }
                }).catch(() => {});
            }
        } catch (e) {
            console.warn('Re-subscribe failed:', e);
        }

        return sessionUser;
    }

    async loginProfile(usernameOrPhone, password) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (!client) {
            this.lastError = "Database not connected.";
            return null;
        }

        let normalizedInput = usernameOrPhone.trim();
        if (normalizedInput.startsWith('03')) {
            normalizedInput = '+92' + normalizedInput.substring(1);
        }

        let query = client
            .from('orders')
            .select('*')
            .eq('customerName', '__profile__');
            
        if (normalizedInput.startsWith('+92') || /^\d+$/.test(normalizedInput)) {
            query = query.eq('whatsapp', normalizedInput);
        } else {
            query = query.eq('productName', normalizedInput.toLowerCase());
        }

        const { data, error } = await query.limit(1);

        if (error || !data || data.length === 0) {
            this.lastError = "Invalid username/WhatsApp number or password.";
            return null;
        }

        const profileData = JSON.parse(data[0].address);
        
        // Hash password
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (profileData.passwordHash !== inputHash) {
            this.lastError = "Invalid username/WhatsApp number or password.";
            return null;
        }

        const sessionUser = {
            id: profileData.id,
            fullName: profileData.fullName,
            whatsapp: profileData.whatsapp,
            address: profileData.address
        };
        localStorage.setItem('tayyab_user', JSON.stringify(sessionUser));

        try {
            if (window.navigator && window.navigator.serviceWorker) {
                window.navigator.serviceWorker.ready.then(async (registration) => {
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        await this.addSubscriber(subscription);
                    }
                }).catch(() => {});
            }
        } catch (e) {
            console.warn('Re-subscribe failed:', e);
        }

        return sessionUser;
    }

    signOut() {
        localStorage.removeItem('tayyab_user');
        try {
            // Re-subscribe push notifications as guest
            if (window.navigator && window.navigator.serviceWorker) {
                window.navigator.serviceWorker.ready.then(async (registration) => {
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        // This updates the subscriber payload in DB to strip userId
                        const endpoint = subscription.endpoint;
                        const { data } = await getSupabaseClient()
                            .from('orders')
                            .select('id')
                            .eq('customerName', '__notification_subscription__')
                            .eq('whatsapp', endpoint)
                            .limit(1);
                        if (data && data.length > 0) {
                            await getSupabaseClient()
                                .from('orders')
                                .update({ address: JSON.stringify(subscription) })
                                .eq('id', data[0].id);
                        }
                    }
                }).catch(() => {});
            }
        } catch (e) {
            console.warn('Re-subscribe failed:', e);
        }
    }

    async getProfiles() {
        const client = getSupabaseClient();
        if (client) {
            const { data, error } = await client
                .from('orders')
                .select('*')
                .eq('customerName', '__profile__')
                .order('id', { ascending: false });
            if (error || !data) return [];
            
            const parsed = data.map(row => {
                try {
                    return { dbId: row.id, profileData: JSON.parse(row.address) };
                } catch (e) {
                    return null;
                }
            }).filter(Boolean);

            // Automatically heal profiles that do not have an OTP yet
            for (const item of parsed) {
                if (!item.profileData.otp) {
                    item.profileData.otp = Math.floor(100000 + Math.random() * 900000).toString();
                    item.profileData.verified = item.profileData.verified || false;
                    await client
                        .from('orders')
                        .update({ address: JSON.stringify(item.profileData) })
                        .eq('id', item.dbId);
                }
            }

            return parsed.map(item => ({ dbId: item.dbId, ...item.profileData }));
        }
        return [];
    }

    async updateProfile(dbId, updates) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (client) {
            const { data: row } = await client
                .from('orders')
                .select('address')
                .eq('id', dbId)
                .single();

            if (!row) {
                this.lastError = "Profile not found.";
                return false;
            }

            const profileData = JSON.parse(row.address);
            
            if (updates.fullName !== undefined) profileData.fullName = updates.fullName;
            if (updates.whatsapp !== undefined) {
                let norm = updates.whatsapp.trim();
                if (norm.startsWith('03')) norm = '+92' + norm.substring(1);
                profileData.whatsapp = norm;
            }
            if (updates.address !== undefined) profileData.address = updates.address;

            const cur = this.getCurrentUser();
            if (cur && cur.id === profileData.id) {
                const sessionUser = {
                    id: profileData.id,
                    fullName: profileData.fullName,
                    whatsapp: profileData.whatsapp,
                    address: profileData.address
                };
                localStorage.setItem('tayyab_user', JSON.stringify(sessionUser));
            }

            const { error } = await client
                .from('orders')
                .update({
                    whatsapp: profileData.whatsapp,
                    productName: profileData.fullName.toLowerCase(),
                    address: JSON.stringify(profileData)
                })
                .eq('id', dbId);

            if (error) {
                this.lastError = formatSupabaseError(error, 'update profile');
                return false;
            }
            return true;
        }
        return false;
    }

    async deleteProfile(dbId) {
        const client = getSupabaseClient();
        if (client) {
            const { error } = await client
                .from('orders')
                .delete()
                .eq('id', dbId);
            return !error;
        }
        return false;
    }

    async saveNotificationPayload(payload) {
        const client = getSupabaseClient();
        if (client) {
            const dbPayload = {
                customerName: '__notification_payload__',
                address: JSON.stringify(payload),
                whatsapp: 'payload',
                productId: '0',
                productName: 'payload',
                qty: 1,
                total: 0
            };
            const { data } = await client
                .from('orders')
                .select('id')
                .eq('customerName', '__notification_payload__');
                
            if (data && data.length > 0) {
                await client.from('orders').update(dbPayload).eq('id', data[0].id);
                for (let i = 1; i < data.length; i++) {
                    await client.from('orders').delete().eq('id', data[i].id);
                }
            } else {
                await client.from('orders').insert([dbPayload]);
            }
        }
    }

    async verifyUserProfile(dbId, otp) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (!client) return false;

        const { data: row, error } = await client
            .from('orders')
            .select('*')
            .eq('id', dbId)
            .single();

        if (error || !row) {
            this.lastError = error ? error.message : "Profile not found.";
            return false;
        }

        try {
            const profileData = JSON.parse(row.address);
            if (String(profileData.otp) === String(otp)) {
                profileData.verified = true;
                
                const { error: updateError } = await client
                    .from('orders')
                    .update({ address: JSON.stringify(profileData) })
                    .eq('id', dbId);

                if (updateError) {
                    this.lastError = updateError.message;
                    return false;
                }

                // Immediately log in this customer by setting the active user session!
                const sessionUser = {
                    id: profileData.id,
                    fullName: profileData.fullName,
                    whatsapp: profileData.whatsapp,
                    address: profileData.address || '',
                    otp: profileData.otp,
                    verified: true,
                    profilePic: profileData.profilePic || ''
                };
                localStorage.setItem('tayyab_user', JSON.stringify(sessionUser));
                return true;
            }
        } catch (e) {
            this.lastError = e.message;
        }
        return false;
    }

    async updateProfileWithHistory(userId, updates, historyEntry) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (!client) return null;

        // Query the profile row
        const { data: rows, error } = await client
            .from('orders')
            .select('*')
            .eq('customerName', '__profile__')
            .eq('productId', userId);

        if (error || !rows || rows.length === 0) {
            this.lastError = error ? error.message : "Profile not found.";
            return null;
        }

        const dbRecord = rows[0];

        try {
            const profileData = JSON.parse(dbRecord.address);
            
            // Log history
            profileData.history = profileData.history || [];
            profileData.history.push(historyEntry);

            // Apply updates
            if (updates.fullName !== undefined) profileData.fullName = updates.fullName;
            if (updates.address !== undefined) profileData.address = updates.address;

            const { error: updateError } = await client
                .from('orders')
                .update({ 
                    address: JSON.stringify(profileData),
                    productName: profileData.fullName.toLowerCase()
                })
                .eq('id', dbRecord.id);

            if (updateError) {
                this.lastError = updateError.message;
                return null;
            }

            // Sync session local storage
            const activeUser = this.getCurrentUser();
            if (activeUser && activeUser.id === profileData.id) {
                activeUser.fullName = profileData.fullName;
                activeUser.address = profileData.address;
                localStorage.setItem('tayyab_user', JSON.stringify(activeUser));
            }

            return profileData;
        } catch (e) {
            this.lastError = e.message;
            return null;
        }
    }

    async uploadProfilePicture(userId, file) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (!client) return null;

        const { data: rows, error } = await client
            .from('orders')
            .select('*')
            .eq('customerName', '__profile__')
            .eq('productId', userId);

        if (error || !rows || rows.length === 0) {
            this.lastError = error ? error.message : "Profile not found.";
            return null;
        }

        const dbRecord = rows[0];

        try {
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `profile_${userId}_${Date.now()}.${fileExt}`;
            const filePath = `profiles/${fileName}`;

            const { error: uploadError } = await client.storage
                .from('banners')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) {
                this.lastError = uploadError.message;
                return null;
            }

            const { data } = client.storage.from('banners').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            const profileData = JSON.parse(dbRecord.address);
            profileData.profilePic = publicUrl;

            const { error: updateError } = await client
                .from('orders')
                .update({ address: JSON.stringify(profileData) })
                .eq('id', dbRecord.id);

            if (updateError) {
                this.lastError = updateError.message;
                return null;
            }

            const activeUser = this.getCurrentUser();
            if (activeUser && activeUser.id === profileData.id) {
                activeUser.profilePic = publicUrl;
                localStorage.setItem('tayyab_user', JSON.stringify(activeUser));
            }

            return publicUrl;
        } catch (e) {
            this.lastError = e.message;
            return null;
        }
    }

    async removeProfilePicture(userId) {
        this.clearLastError();
        const client = getSupabaseClient();
        if (!client) return false;

        const { data: rows, error } = await client
            .from('orders')
            .select('*')
            .eq('customerName', '__profile__')
            .eq('productId', userId);

        if (error || !rows || rows.length === 0) {
            this.lastError = error ? error.message : "Profile not found.";
            return false;
        }

        const dbRecord = rows[0];

        try {
            const profileData = JSON.parse(dbRecord.address);
            profileData.profilePic = '';

            const { error: updateError } = await client
                .from('orders')
                .update({ address: JSON.stringify(profileData) })
                .eq('id', dbRecord.id);

            if (updateError) {
                this.lastError = updateError.message;
                return false;
            }

            const activeUser = this.getCurrentUser();
            if (activeUser && activeUser.id === profileData.id) {
                activeUser.profilePic = '';
                localStorage.setItem('tayyab_user', JSON.stringify(activeUser));
            }

            return true;
        } catch (e) {
            this.lastError = e.message;
            return false;
        }
    }
}

// Instantiate globally
window.dataManager = new DataManager();
window.getSupabaseClient = getSupabaseClient;