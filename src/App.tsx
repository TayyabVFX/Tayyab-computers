import React, { useState, useEffect } from 'react';
import { ShoppingCart, LayoutDashboard, Monitor, RefreshCw, AlertTriangle, Cpu, Home, Star, Phone } from 'lucide-react';
import StoreFront from './components/StoreFront';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import { Product, Order } from './types';

const ADMIN_PATH = '/tc-portal-2026';

export default function App() {
  // Navigation states initialized from URL path routing
  const [viewPerspective, setViewPerspective] = useState<'shop' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const rawPath = window.location.pathname;
      const hashPath = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
      const path = rawPath === '/' && hashPath ? hashPath : rawPath;
      return (path === ADMIN_PATH || path.startsWith(`${ADMIN_PATH}/`)) ? 'admin' : 'shop';
    }
    return 'shop';
  });

  // Authentication state
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminToken');
    }
    return null;
  });
  const [tokenVerifying, setTokenVerifying] = useState(true);

  useEffect(() => {
    const handleLocationChange = () => {
      const rawPath = window.location.pathname;
      const hashPath = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
      const path = rawPath === '/' && hashPath ? hashPath : rawPath;
      setViewPerspective((path === ADMIN_PATH || path.startsWith(`${ADMIN_PATH}/`)) ? 'admin' : 'shop');
    };
    
    // Listen to native back/forward events
    window.addEventListener('popstate', handleLocationChange);
    
    // Listen to our custom navigation event
    window.addEventListener('locationchange', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('locationchange', handleLocationChange);
    };
  }, []);

  // Verify admin token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!adminToken) {
        setTokenVerifying(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        
        if (!res.ok) {
          // Token is invalid, clear it
          localStorage.removeItem('adminToken');
          setAdminToken(null);
        }
      } catch (err) {
        console.error('Token verification failed:', err);
      } finally {
        setTokenVerifying(false);
      }
    };

    verifyToken();
  }, [adminToken]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('locationchange'));
  };

  const handleLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    navigateTo('/');
  };

  // Core reactive DB data structures
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Loading & Error States
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');

  // Fetch products and orders synchronously from server database on component mount
  const syncServerDB = async () => {
    setGlobalLoading(true);
    setGlobalError('');
    try {
      // Parallelize fetch requests for performance
      const [productsRes, ordersRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders')
      ]);

      if (!productsRes.ok || !ordersRes.ok) {
        throw new Error('Server returned unsuccessful status while pulling database files.');
      }

      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();

      setProducts(productsData);
      setOrders(ordersData);
    } catch (err: any) {
      console.error('Fetch Synch Error:', err);
      setGlobalError(err.message || 'Failure connecting to Express system. Please verify local ports.');
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    syncServerDB();
  }, []);

  // ----------------------------------------------------
  // SERVER MUTATIONS
  // ----------------------------------------------------

  // 1. PLACE BRAND NEW CUSTOMER ORDER (Public Storefront)
  const placeOrderHandler = async (orderData: {
    productId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    variantLabel: string;
    quantity: number;
  }) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Server error while submitting order checkout');
    }

    const result = await res.json();
    
    // Automatically trigger background reload to capture stock decrements & update orders list
    await reloadDataQuietly();
    return result;
  };

  // 2. CREATE or UPDATE PRODUCT DETAILS (Admin Panel)
  const saveProductHandler = async (productData: Product) => {
    if (!adminToken) {
      throw new Error('Not authenticated. Please login first.');
    }
    
    // Immediately update local state for instant UI feedback
    setProducts(prevProducts => {
      const exists = prevProducts.find(p => p.id === productData.id);
      if (exists) {
        // Update existing product
        return prevProducts.map(p => p.id === productData.id ? productData : p);
      } else {
        // Add new product
        return [...prevProducts, productData];
      }
    });

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(productData)
    });

    if (!res.ok) {
      const data = await res.json();
      // Revert the local state if save fails
      await reloadDataQuietly();
      throw new Error(data.error || 'Failed to sync product data changes.');
    }

    const result = await res.json();
    // Ensure state is in sync with server (server might have modified the data)
    await reloadDataQuietly();
    return result;
  };

  // 3. REMOVE PRODUCT FROM INVENTORY (Admin Panel)
  const deleteProductHandler = async (id: string) => {
    if (!adminToken) {
      throw new Error('Not authenticated. Please login first.');
    }
    
    // Immediately update local state for instant UI feedback
    setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
    
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!res.ok) {
      const data = await res.json();
      // Revert the local state if deletion fails
      await reloadDataQuietly();
      throw new Error(data.error || 'Could not complete product deletion request.');
    }

    // Ensure state is in sync with server
    await reloadDataQuietly();
  };

  // 4. CHANGE ORDER METRICS & STATUS (Admin Panel)
  const updateOrderHandler = async (id: string, orderData: Partial<Order>) => {
    if (!adminToken) {
      throw new Error('Not authenticated. Please login first.');
    }
    
    // Immediately update local state for instant UI feedback
    setOrders(prevOrders => 
      prevOrders.map(o => o.id === id ? { ...o, ...orderData } : o)
    );

    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(orderData)
    });

    if (!res.ok) {
      const data = await res.json();
      // Revert the local state if update fails
      await reloadDataQuietly();
      throw new Error(data.error || 'Failed to modify database order.');
    }

    const result = await res.json();
    // Ensure state is in sync with server
    await reloadDataQuietly();
    return result;
  };

  // 5. PURGE ORDER RECORD (Admin Panel)
  const deleteOrderHandler = async (id: string) => {
    if (!adminToken) {
      throw new Error('Not authenticated. Please login first.');
    }
    
    // Immediately update local state for instant UI feedback
    setOrders(prevOrders => prevOrders.filter(o => o.id !== id));

    const res = await fetch(`/api/orders/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!res.ok) {
      const data = await res.json();
      // Revert the local state if deletion fails
      await reloadDataQuietly();
      throw new Error(data.error || 'Delete request unsuccessful.');
    }

    // Ensure state is in sync with server
    await reloadDataQuietly();
  };

  // Helper to sync without triggering global spinner flickering
  const reloadDataQuietly = async () => {
    try {
      const [pRes, oRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/orders')
      ]);
      if (pRes.ok && oRes.ok) {
        setProducts(await pRes.json());
        setOrders(await oRes.json());
      }
    } catch (e) {
      console.error("Quiet reload failed:", e);
    }
  };

  // Smooth scroll handler targeting specific section IDs
  const scrollToSection = (id: string) => {
    if (viewPerspective !== 'shop') {
      navigateTo('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-[#f1f5f9] font-sans selection:bg-red-600 selection:text-white">
      
      {/* GLOBAL PERSISTENT HEADER NAVIGATION COUPLER */}
      <header className="sticky top-0 z-[1900] bg-[#0b0b0f]/95 backdrop-blur-md border-b border-[#11111a] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
          
          {/* Logo Brand with a distinctive red circle as requested */}
          <div 
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.9)] flex-shrink-0" />
            <span className="font-extrabold text-base sm:text-base md:text-lg text-white group-hover:text-red-400 transition-colors uppercase tracking-wider">
              Tayyab Computers
            </span>
          </div>

          {/* Contextual indicators depending on viewPerspective */}
          {viewPerspective === 'admin' ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20">
                📊 Admin Console
              </span>
              <button 
                onClick={syncServerDB} 
                title="Force Synchronize Database"
                className="p-1.5 border border-[#1e1e2d] bg-[#12121c] hover:bg-slate-900 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer text-xs focus:outline-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => navigateTo('/')}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold leading-none tracking-wide transition-all cursor-pointer shadow shadow-red-600/20 focus:outline-none"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> View Client Store
              </button>
              {adminToken && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold leading-none tracking-wide transition-all cursor-pointer focus:outline-none"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            /* Shopper navigation tabs matching Image 2 exactly, stacked uniformly on mobile */
            <div className="flex items-center justify-center gap-5 sm:gap-6 w-full sm:w-auto">
              <button 
                onClick={() => scrollToSection('home')}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none bg-transparent border-none p-0"
              >
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                <span>Home</span>
              </button>
              <button 
                onClick={() => scrollToSection('products')}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none bg-transparent border-none p-0"
              >
                <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                <span>Products</span>
              </button>
              <button 
                onClick={() => scrollToSection('reviews')}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none bg-transparent border-none p-0"
              >
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                <span>Reviews</span>
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all cursor-pointer focus:outline-none bg-transparent border-none p-0"
              >
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                <span>Contact</span>
              </button>
            </div>
          )}
          
        </div>
      </header>

      {/* CORE FRAME OR LOADING GRAPHICS CARRIER */}
      <main className="min-h-[calc(100vh-64px)] pb-10">
        {globalLoading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Syncing Database files...</p>
          </div>
        ) : globalError ? (
          <div className="max-w-xl mx-auto my-20 p-8 border border-red-500/10 bg-red-500/5 rounded-2xl text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-red-500 font-extrabold text-lg uppercase tracking-wider">Local Connection Failure</h3>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Our frontend is unable to reach the file-based express server. Please verify your workspace contains the compiled `./server.ts` running on port 3000.
            </p>
            <p className="text-[10px] text-slate-500 font-mono mt-2">{globalError}</p>
            <button 
              onClick={syncServerDB}
              className="px-6 py-2.5 bg-red-600 font-bold hover:bg-red-700 text-white text-xs uppercase tracking-widest rounded-full cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : viewPerspective === 'shop' ? (
          <StoreFront 
            products={products}
            onPlaceOrder={placeOrderHandler}
          />
        ) : tokenVerifying ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Verifying authentication...</p>
          </div>
        ) : !adminToken ? (
          <AdminLogin onLoginSuccess={(token) => {
            localStorage.setItem('adminToken', token);
            setAdminToken(token);
          }} />
        ) : (
          <AdminDashboard 
            products={products}
            orders={orders}
            onSaveProduct={saveProductHandler}
            onDeleteProduct={deleteProductHandler}
            onUpdateOrder={updateOrderHandler}
            onDeleteOrder={deleteOrderHandler}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}
