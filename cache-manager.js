// cache-manager.js - Smart Client-Side Caching with Supabase Verification

class CacheManager {
    constructor() {
        this.CACHE_KEYS = {
            products: 'tayyab_products',
            lastSync: 'tayyab_cache_last_sync',
            productHashes: 'tayyab_product_hashes', // Store hashes to detect changes
            cacheVersion: 'tayyab_cache_version'
        };
        this.CURRENT_VERSION = '1';
        this.SYNC_INTERVAL = 30000; // Sync every 30 seconds
        this.syncInProgress = false;
        this.initializeCache();
    }

    initializeCache() {
        // Initialize cache version
        const storedVersion = localStorage.getItem(this.CACHE_KEYS.cacheVersion);
        if (storedVersion !== this.CURRENT_VERSION) {
            // Clear old cache on version mismatch
            this.clearCache();
            localStorage.setItem(this.CACHE_KEYS.cacheVersion, this.CURRENT_VERSION);
        }
    }

    /**
     * Get cached products instantly (synchronous)
     * Returns empty array if no cache exists
     */
    getCachedProductsSync() {
        try {
            const cached = localStorage.getItem(this.CACHE_KEYS.products);
            return cached ? JSON.parse(cached) : [];
        } catch (err) {
            console.error('❌ Error reading cache:', err);
            return [];
        }
    }

    /**
     * Generate a hash of product data for change detection
     */
    generateProductHash(product) {
        const data = `${product.id}|${product.name}|${product.price}|${product.stock}|${product.category}|${product.is_featured}|${JSON.stringify(product.photos)}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Store products in cache
     */
    setCachedProducts(products) {
        try {
            localStorage.setItem(this.CACHE_KEYS.products, JSON.stringify(products));
            localStorage.setItem(this.CACHE_KEYS.lastSync, new Date().toISOString());

            // Store product hashes for change detection
            const hashes = {};
            products.forEach(p => {
                hashes[p.id] = this.generateProductHash(p);
            });
            localStorage.setItem(this.CACHE_KEYS.productHashes, JSON.stringify(hashes));

            console.log('✅ Cache updated with', products.length, 'products');
        } catch (err) {
            console.error('❌ Error saving cache:', err);
        }
    }

    /**
     * Compare cached and fresh products to detect changes
     */
    detectChanges(cachedProducts, freshProducts) {
        const changes = {
            added: [],
            updated: [],
            deleted: [],
            hasChanges: false
        };

        const freshMap = new Map(freshProducts.map(p => [p.id, p]));
        const cachedMap = new Map(cachedProducts.map(p => [p.id, p]));

        // Detect added and updated products
        freshProducts.forEach(freshProd => {
            const cachedProd = cachedMap.get(freshProd.id);
            if (!cachedProd) {
                changes.added.push(freshProd);
                changes.hasChanges = true;
                console.log('🆕 New product:', freshProd.name);
            } else {
                const freshHash = this.generateProductHash(freshProd);
                const cachedHash = this.generateProductHash(cachedProd);
                if (freshHash !== cachedHash) {
                    changes.updated.push({
                        id: freshProd.id,
                        oldData: cachedProd,
                        newData: freshProd,
                        changes: this.getDetailedChanges(cachedProd, freshProd)
                    });
                    changes.hasChanges = true;
                    console.log('🔄 Product updated:', freshProd.name, '-', this.getDetailedChanges(cachedProd, freshProd));
                }
            }
        });

        // Detect deleted products
        cachedProducts.forEach(cachedProd => {
            if (!freshMap.has(cachedProd.id)) {
                changes.deleted.push(cachedProd);
                changes.hasChanges = true;
                console.log('🗑️ Product deleted:', cachedProd.name);
            }
        });

        return changes;
    }

    /**
     * Get detailed information about what changed
     */
    getDetailedChanges(oldData, newData) {
        const details = {};
        const fieldsToCheck = ['name', 'price', 'stock', 'category', 'description', 'is_featured', 'photos', 'videoUrl'];
        
        fieldsToCheck.forEach(field => {
            const oldVal = oldData[field];
            const newVal = newData[field];
            
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                details[field] = {
                    old: oldVal,
                    new: newVal
                };
            }
        });

        return details;
    }

    /**
     * Sync with Supabase and detect changes
     * This runs in the background without blocking the UI
     */
    async syncWithSupabase() {
        if (this.syncInProgress) return;
        this.syncInProgress = true;

        try {
            const client = getSupabaseClient();
            if (!client) {
                console.log('⚠️ Supabase client not available');
                this.syncInProgress = false;
                return;
            }

            // Fetch fresh data from Supabase
            const { data: freshProducts, error } = await client
                .from('products')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.error('❌ Supabase sync error:', error);
                window.dispatchEvent(new CustomEvent('syncComplete', {
                    detail: { success: false, count: 0 }
                }));
                this.syncInProgress = false;
                return;
            }

            const cachedProducts = this.getCachedProductsSync();
            const changes = this.detectChanges(cachedProducts, freshProducts || []);

            if (changes.hasChanges) {
                console.log('📊 Changes detected! Added:', changes.added.length, 'Updated:', changes.updated.length, 'Deleted:', changes.deleted.length);
                
                // Update cache with fresh data
                this.setCachedProducts(freshProducts || []);
                
                // Emit event with change details so UI can update
                window.dispatchEvent(new CustomEvent('cacheUpdated', {
                    detail: {
                        products: freshProducts,
                        changes: changes,
                        timestamp: new Date().toISOString()
                    }
                }));
            } else {
                console.log('✓ Cache is up to date');
            }

            window.dispatchEvent(new CustomEvent('syncComplete', {
                detail: { success: true, count: freshProducts ? freshProducts.length : 0 }
            }));

        } catch (err) {
            console.error('❌ Unexpected error during sync:', err);
            window.dispatchEvent(new CustomEvent('syncComplete', {
                detail: { success: false, count: 0 }
            }));
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Start automatic background syncing
     */
    startAutoSync() {
        // Initial sync
        this.syncWithSupabase();
        
        // Periodic syncing
        this.syncInterval = setInterval(() => {
            this.syncWithSupabase();
        }, this.SYNC_INTERVAL);

        console.log('🔄 Auto-sync started (every', this.SYNC_INTERVAL / 1000, 'seconds)');
    }

    /**
     * Stop automatic syncing
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            console.log('⏸️ Auto-sync stopped');
        }
    }

    /**
     * Force immediate sync (useful for manual refresh)
     */
    async forceSyncNow() {
        console.log('🔄 Forcing immediate sync...');
        await this.syncWithSupabase();
    }

    /**
     * Get last sync timestamp
     */
    getLastSyncTime() {
        return localStorage.getItem(this.CACHE_KEYS.lastSync);
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        localStorage.removeItem(this.CACHE_KEYS.products);
        localStorage.removeItem(this.CACHE_KEYS.lastSync);
        localStorage.removeItem(this.CACHE_KEYS.productHashes);
        console.log('🗑️ Cache cleared');
    }

    /**
     * Get cache stats for debugging
     */
    getCacheStats() {
        const cached = this.getCachedProductsSync();
        return {
            cacheSize: cached.length,
            lastSync: this.getLastSyncTime(),
            version: localStorage.getItem(this.CACHE_KEYS.cacheVersion)
        };
    }
}

// Initialize the cache manager globally
const cacheManager = new CacheManager();
