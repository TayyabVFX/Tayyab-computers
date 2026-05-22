import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Package, ShoppingCart, TrendingUp, Plus, Edit, Trash2, CheckCircle, 
  XSquare, Info, Upload, Image, Eye, ListFilter, Trash, Save, EyeOff, X
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Product, ProductVariant, Order, OrderStatus, FinancialStats } from '../types';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  onSaveProduct: (product: Product) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
  onUpdateOrder: (id: string, orderData: Partial<Order>) => Promise<any>;
  onDeleteOrder: (id: string) => Promise<any>;
  onLogout?: () => void;
}

export default function AdminDashboard({
  products,
  orders,
  onSaveProduct,
  onDeleteProduct,
  onUpdateOrder,
  onDeleteOrder,
  onLogout
}: AdminDashboardProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'orders' | 'products'>('analytics');

  // Notification States
  const [actionError, setActionError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ----------------------------------------------------
  // I. ANALYTICS CALCULATION SYSTEM
  // ----------------------------------------------------
  const stats: FinancialStats = orders.reduce((acc, order) => {
    if (order.status === 'Delivered') {
      acc.totalRevenue += order.salePrice * order.quantity;
      acc.totalCost += order.costPrice * order.quantity;
      acc.totalExpenses += order.otherExpenses;
      acc.totalProfit += order.profit;
      acc.deliveredCount += 1;
    } else if (order.status === 'Cancelled') {
      acc.cancelledCount += 1;
    } else if (order.status === 'New') {
      acc.newCount += 1;
    }
    return acc;
  }, {
    totalRevenue: 0,
    totalCost: 0,
    totalExpenses: 0,
    totalProfit: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    newCount: 0
  });

  // Calculate generic profit margins
  const profitMargin = stats.totalRevenue > 0 
    ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1) 
    : '0';

  // Format chart chronological representation
  const chronData = () => {
    // Sort orders by timestamp
    const sorted = [...orders]
      .filter(o => o.status === 'Delivered')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Group by Date key
    const groups: { [key: string]: { revenue: number, cost: number, profit: number } } = {};
    sorted.forEach((o) => {
      const date = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!groups[date]) {
        groups[date] = { revenue: 0, cost: 0, profit: 0 };
      }
      groups[date].revenue += o.salePrice * o.quantity;
      groups[date].cost += o.costPrice * o.quantity;
      groups[date].profit += o.profit;
    });

    return Object.entries(groups).map(([date, vals]) => ({
      date,
      ...vals
    }));
  };

  // Format categories allocation representation
  const categoryData = () => {
    const catsAndVals: { [key: string]: number } = {};
    orders
      .filter(o => o.status === 'Delivered')
      .forEach(o => {
        // Look up category
        const prod = products.find(p => p.id === o.productId);
        const cat = prod?.category || "Uncategorized";
        catsAndVals[cat] = (catsAndVals[cat] || 0) + (o.salePrice * o.quantity);
      });

    return Object.entries(catsAndVals).map(([name, value]) => ({
      name,
      value
    }));
  };

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  // ----------------------------------------------------
  // II. INVENTORY / PRODUCTS FORM SYSTEM
  // ----------------------------------------------------
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  
  // Single Product fields
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodFeatured, setProdFeatured] = useState(false);
  const [prodStock, setProdStock] = useState(10);
  const [prodOtherExpenses, setProdOtherExpenses] = useState(500);
  
  // Custom dynamic variant values
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([{ label: 'Standard', price: 0, costPrice: 0 }]);
  const [tempImageText, setTempImageText] = useState('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodVideoUrl, setProdVideoUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  const resetProductForm = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdCat('Processors');
    setProdFeatured(false);
    setProdStock(10);
    setProdOtherExpenses(500);
    setProdVariants([{ label: 'Standard', price: 0, costPrice: 0 }]);
    setProdImages([]);
    setProdVideoUrl('');
    setTempImageText('');
    setActionError('');
  };

  const handleOpenNewProduct = () => {
    resetProductForm();
    setIsProductFormOpen(true);
  };

  const handleEditProductClick = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description);
    setProdCat(p.category);
    setProdFeatured(p.featured);
    setProdStock(p.stock);
    setProdOtherExpenses(p.otherExpenses);
    setProdVariants(p.variants.length > 0 ? [...p.variants] : [{ label: 'Standard', price: 0, costPrice: 0 }]);
    setProdImages([...p.images]);
    setProdVideoUrl(p.videoUrl || '');
    setTempImageText('');
    setIsProductFormOpen(true);
    setActionError('');
  };

  const handleAddVariantRow = () => {
    setProdVariants([...prodVariants, { label: `Variant ${prodVariants.length + 1}`, price: 0, costPrice: 0 }]);
  };

  const handleRemoveVariantRow = (index: number) => {
    if (prodVariants.length === 1) return; // Keep at least one
    setProdVariants(prodVariants.filter((_, i) => i !== index));
  };

  const updateVariantCell = (index: number, key: keyof ProductVariant, val: string | number) => {
    const list = [...prodVariants];
    if (key === 'label') {
      list[index].label = String(val);
    } else {
      list[index][key] = Number(val) || 0;
    }
    setProdVariants(list);
  };

  // Add image manually or uploaded static asset
  const handleAddImageString = () => {
    if (!tempImageText.trim()) return;
    setProdImages([...prodImages, tempImageText.trim()]);
    setTempImageText('');
  };

  const handleRemoveImage = (idx: number) => {
    setProdImages(prodImages.filter((_, i) => i !== idx));
  };

  // Local File Base64 Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setActionError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Content = reader.result as string;
        
        // Post base64 payload to Express endpoint
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileContent: base64Content
          })
        });

        const data = await res.json();
        if (data.success && data.url) {
          setProdImages(prev => [...prev, data.url]);
          setSuccessMsg("🎉 File uploaded successfully to Server files!");
          setTimeout(() => setSuccessMsg(""), 3000);
        } else {
          setActionError(data.error || "Failed to upload file.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setActionError("Error uploading image code.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      setActionError("Product Name is required.");
      return;
    }

    // Verify variants has at least 1 entry with valid prices
    const invalidVar = prodVariants.some(v => !v.label.trim() || v.price < 0 || v.costPrice < 0);
    if (invalidVar) {
      setActionError("All variants must contain a valid label designation and positive pricing.");
      return;
    }

    try {
      const payload: Product = {
        id: editingProduct?.id || '',
        name: prodName.trim(),
        description: prodDesc.trim(),
        category: prodCat.trim() || 'General',
        featured: prodFeatured,
        images: prodImages.length > 0 ? prodImages : ['https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400'],
        variants: prodVariants,
        stock: Number(prodStock) || 0,
        otherExpenses: Number(prodOtherExpenses) || 0,
        videoUrl: prodVideoUrl.trim() || undefined
      };

      await onSaveProduct(payload);
      setSuccessMsg(`🚀 Product "${prodName}" saved successfully!`);
      setIsProductFormOpen(false);
      resetProductForm();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to upload/save product specs.");
    }
  };

  const handleDeleteProductClick = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete product "${name}"?`)) {
      return;
    }
    try {
      await onDeleteProduct(id);
      setSuccessMsg(`🗑️ Product "${name}" deleted.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Could not delete.");
    }
  };


  // ----------------------------------------------------
  // III. ORDERS MANAGEMENT SYSTEM
  // ----------------------------------------------------
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('All');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Editable order values
  const [editCustName, setEditCustName] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editOrderQty, setEditOrderQty] = useState(1);
  const [editOrderSalePrice, setEditOrderSalePrice] = useState(0);
  const [editOrderCostPrice, setEditOrderCostPrice] = useState(0);
  const [editOrderOtherExpenses, setEditOrderOtherExpenses] = useState(500);
  const [editOrderStatus, setEditOrderStatus] = useState<OrderStatus>('New');
  const [editOrderNotes, setEditOrderNotes] = useState('');

  const filteredOrders = selectedStatusFilter === 'All' 
    ? orders 
    : orders.filter(o => o.status === selectedStatusFilter);

  const startEditOrder = (o: Order) => {
    setEditingOrder(o);
    setEditCustName(o.customerName);
    setEditCustPhone(o.customerPhone);
    setEditCustAddress(o.customerAddress);
    setEditOrderQty(o.quantity);
    setEditOrderSalePrice(o.salePrice);
    setEditOrderCostPrice(o.costPrice);
    setEditOrderOtherExpenses(o.otherExpenses);
    setEditOrderStatus(o.status);
    setEditOrderNotes(o.notes || '');
  };

  const handleInlineStatusChange = async (id: string, status: OrderStatus) => {
    try {
      setActionError('');
      await onUpdateOrder(id, { status });
      setSuccessMsg(`✅ Order #${id} status updated to ${status}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Unable to update order status.');
    }
  };

  const handleUpdateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      const payload: Partial<Order> = {
        customerName: editCustName.trim(),
        customerPhone: editCustPhone.trim(),
        customerAddress: editCustAddress.trim(),
        quantity: Number(editOrderQty) || 1,
        salePrice: Number(editOrderSalePrice) || 0,
        costPrice: Number(editOrderCostPrice) || 0,
        otherExpenses: Number(editOrderOtherExpenses) || 0,
        status: editOrderStatus,
        notes: editOrderNotes.trim()
      };

      await onUpdateOrder(editingOrder.id, payload);
      setSuccessMsg(`📝 Order #${editingOrder.id} metrics saved cleanly!`);
      setEditingOrder(null);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to update customer order.");
    }
  };

  const handleDeleteOrderClick = async (id: string) => {
    if (!window.confirm(`Delete order #${id} record permanently? This resets cost-profit metrics.`)) {
      return;
    }
    try {
      await onDeleteOrder(id);
      setSuccessMsg(`🗑️ Order #${id} deleted.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || "Failed to remove order logs.");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* Dynamic Notifications */}
      {successMsg && (
        <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-2">
          <span className="font-extrabold text-lg">✓</span>
          <p className="text-xs sm:text-sm font-bold">{successMsg}</p>
        </div>
      )}
      {actionError && (
        <div className="bg-red-500/20 text-red-500 border border-red-500/30 p-4 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            <p className="text-xs sm:text-sm font-bold">{actionError}</p>
          </div>
          <button onClick={() => setActionError('')} className="text-xs">Dismiss</button>
        </div>
      )}

      {/* DASHBOARD NAVIGATION RAIL */}
      <div className="flex border-b border-[#232333]">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'analytics' 
              ? 'border-red-600 text-red-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4.5 h-4.5" /> Profit & Sales KPI
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders' 
              ? 'border-red-600 text-red-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4.5 h-4.5" /> Orders Management
          {stats.newCount > 0 && (
            <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {stats.newCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wide border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'products' 
              ? 'border-red-600 text-red-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4.5 h-4.5" /> Inventory Catalog
        </button>
      </div>

      {/* ========================================================
          TAB 1: ANALYTICS & FINANCES
          ======================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-8 fade-in">
          
          {/* Quick Metrics KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Sales Revenue */}
            <div className="bg-[#11111a] border border-[#1e1e2d] px-6 py-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-[-10px] bottom-[-10px] text-slate-800/10 text-8xl font-black font-mono select-none pointer-events-none">₨</div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Total Revenue</span>
                <p className="text-2xl sm:text-3xl font-black text-red-500 font-mono">
                  ₨ {stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 leading-normal flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Derived from {stats.deliveredCount} delivered orders.
              </p>
            </div>

            {/* Total Cost Basis */}
            <div className="bg-[#11111a] border border-[#1e1e2d] px-6 py-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-[-10px] bottom-[-10px] text-slate-800/10 text-8xl font-black font-mono select-none pointer-events-none">₨</div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Cost of Goods (COGS)</span>
                <p className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
                  ₨ {stats.totalCost.toLocaleString()}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 leading-normal flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-yellow-500" /> Procurement values for hardware base.
              </p>
            </div>

            {/* Other Expenses */}
            <div className="bg-[#11111a] border border-[#1e1e2d] px-6 py-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-[-10px] bottom-[-10px] text-slate-800/10 text-8xl font-black font-mono select-none pointer-events-none">₨</div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Delivery & Shipping</span>
                <p className="text-2xl sm:text-3xl font-black text-blue-500 font-mono">
                  ₨ {stats.totalExpenses.toLocaleString()}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 leading-normal flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-500" /> Carrier courier and logistics budget.
              </p>
            </div>

            {/* Net Profits */}
            <div className="bg-[#11111a] border border-[#1e1e2d] px-6 py-5 rounded-2xl relative overflow-hidden flex flex-col justify-between ring-1 ring-emerald-500/20">
              <div className="absolute right-[-10px] bottom-[-10px] text-slate-800/10 text-8xl font-black font-mono select-none pointer-events-none">₨</div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">Net Profit (Take Home)</span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  ₨ {stats.totalProfit.toLocaleString()}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 leading-normal flex items-center gap-1">
                <span className="text-emerald-400 font-bold">{profitMargin}%</span> net profit margin average.
              </p>
            </div>
          </div>

          {/* Graphical Representation (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Profitability Chronological graph block */}
            <div className="bg-[#11111a] border border-[#1e1e2d] p-6 rounded-2xl lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-white text-base">Profitability Timeline</h3>
                  <p className="text-xs text-slate-500">Sales vs Cost of Goods vs Actual Net Profit</p>
                </div>
                <TrendingUp className="w-5 h-5 text-red-500" />
              </div>

              <div className="h-72 w-full pt-4">
                {chronData().length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 border border-dashed border-slate-900 rounded-xl">
                    <Info className="w-8 h-8 text-slate-700" />
                    <p className="text-slate-500 text-xs mt-2">No historical delivered sales records available.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chronData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1d1d2b" />
                      <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: 10 }} />
                      <YAxis stroke="#64748b" style={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#13131c', border: '1px solid #2d2d3a', borderRadius: '12px' }}
                        labelStyle={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}
                      />
                      <Legend style={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="revenue" name="Revenue (PKR)" stroke="#ef4444" fillOpacity={1} fill="url(#colorRevenue)" />
                      <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category split donut chart */}
            <div className="bg-[#11111a] border border-[#1e1e2d] p-6 rounded-2xl lg:col-span-4 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-extrabold text-white text-base">Category Distributions</h3>
                <p className="text-xs text-slate-500">Sales breakdown weight by hardware type</p>
              </div>

              <div className="h-56 w-full flex items-center justify-center relative">
                {categoryData().length === 0 ? (
                  <p className="text-slate-600 text-xs">No records available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#13131c', border: '1px solid #2d2d3a', borderRadius: '10px' }}
                        labelStyle={{ fontSize: 10, color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legends list */}
              <div className="space-y-1.5 mt-2">
                {categoryData().map((val, idx) => (
                  <div key={val.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-300 font-medium">{val.name}</span>
                    </div>
                    <span className="text-white font-mono font-bold">{val.value.toLocaleString()} PKR</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick status report stats */}
          <div className="bg-[#11111a] border border-[#1e1e2d] p-6 rounded-2xl">
            <h3 className="font-extrabold text-white text-base mb-4">Orders Status Analytics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-red-600/5 rounded-2xl border border-red-500/10">
                <p className="text-2xl font-black text-red-500 font-mono">{stats.newCount}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">New Pending Verification</p>
              </div>
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <p className="text-2xl font-black text-emerald-400 font-mono">{stats.deliveredCount}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Delivered & Closed</p>
              </div>
              <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-900">
                <p className="text-2xl font-black text-slate-400 font-mono">{stats.cancelledCount}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Cancelled Orders</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================
          TAB 2: ORDERS LIST & LOGISTICS MODIFICATION
          ======================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6 fade-in">
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div>
              <h3 className="font-extrabold text-white text-lg">Customer Checkout Orders</h3>
              <p className="text-xs text-slate-500">Edit transaction metrics, configure shipping expenses, adjust delivery address and status updates.</p>
            </div>

            {/* Filter buttons */}
            <div className="flex bg-[#11111b] border border-[#1e1e2d] p-1.5 rounded-full select-none">
              {['All', 'New', 'Delivered', 'Cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    selectedStatusFilter === status 
                      ? 'bg-red-600 text-white shadow' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Orders log table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-[#11111a] border border-[#1e1e2d] rounded-2xl">
              <ShoppingCart className="w-12 h-12 text-slate-800 mx-auto" />
              <p className="text-slate-400 mt-3 font-semibold">No orders discovered under static registry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-[#11111a] border border-[#1e1e2d] rounded-2xl shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#14141e] border-b border-[#232333] text-slate-400 font-black uppercase text-[10px]">
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Customer info</th>
                    <th className="p-4">Components selection</th>
                    <th className="p-4 font-mono text-right">Transaction Detail</th>
                    <th className="p-4 text-center">Receipt Date</th>
                    <th className="p-4 text-center">Delivery status</th>
                    <th className="p-4 text-center">Modify</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#232333] text-slate-300">
                  {filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#14141e]/50 transition-colors">
                      {/* ID */}
                      <td className="p-4 whitespace-nowrap font-black text-red-500 font-mono">
                        {o.id}
                      </td>

                      {/* Customer Name, whatsapp, delivery Address */}
                      <td className="p-4 max-w-[200px]">
                        <p className="font-extrabold text-white text-sm">{o.customerName}</p>
                        <p className="font-mono text-emerald-400 font-medium text-[11px] select-all flex items-center gap-1 mt-1">
                          <i className="fa-brands fa-whatsapp" /> {o.customerPhone}
                        </p>
                        <p className="text-slate-400 text-[11px] truncate mt-1.5" title={o.customerAddress}>
                          {o.customerAddress}
                        </p>
                      </td>

                      {/* Items Ordered Product and Variant */}
                      <td className="p-4 max-w-[180px]">
                        <p className="font-bold text-white text-[13px]">{o.productName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-medium italic">{o.variantLabel}</p>
                        <p className="text-[10px] text-slate-500 mt-1">Qty: <span className="text-white font-bold">{o.quantity}</span></p>
                      </td>

                      {/* Math/Finances detail */}
                      <td className="p-4 text-right whitespace-nowrap font-mono space-y-0.5">
                        <p className="text-[#fff]"><span className="text-slate-500 text-[10px] uppercase font-bold">Sales:</span> {o.totalPrice.toLocaleString()} PKR</p>
                        <p className="text-amber-500"><span className="text-slate-500 text-[10px] uppercase font-bold">COGS:</span> {(o.costPrice * o.quantity).toLocaleString()} PKR</p>
                        <p className="text-blue-400"><span className="text-slate-500 text-[10px] uppercase font-bold">Exp:</span> {o.otherExpenses.toLocaleString()} PKR</p>
                        <div className="border-t border-[#2d2d40] pt-1" />
                        <p className={`font-bold ${o.profit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                          <span className="text-slate-500 text-[10px] uppercase font-semibold">Net:</span> {o.profit.toLocaleString()} PKR
                        </p>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-center whitespace-nowrap text-slate-400 text-[11px]">
                        {new Date(o.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <select
                          value={o.status}
                          onChange={(e) => handleInlineStatusChange(o.id, e.target.value as OrderStatus)}
                          className="w-full max-w-[140px] bg-[#0f111a] border border-slate-700 text-slate-200 text-[11px] uppercase tracking-[0.18em] font-semibold rounded-lg px-3 py-2 transition-colors hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="New">New</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEditOrder(o)}
                            title="Edit Order Metrics & Status"
                            className="p-1.5 bg-[#1a1a24] text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-[#2d2d3d]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrderClick(o.id)}
                            title="Remove Permanently"
                            className="p-1.5 bg-red-600/10 text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-colors border border-red-600/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* EDIT ORDER INTERACTIVE DIALOG MODAL */}
          {editingOrder && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2500] flex items-center justify-center p-4">
              <div className="relative bg-[#11111a] border border-[#1e1e2d] w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-[#14141e] px-6 py-4 border-b border-[#232333] flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-sm uppercase tracking-wide">Modify Order Metrics</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">Invoice reference: {editingOrder.id}</p>
                  </div>
                  <button 
                    onClick={() => setEditingOrder(null)} 
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateOrderSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    
                    {/* CUSTOMER NAME */}
                    <div className="col-span-2 space-y-1.5">
                      <label className="block text-slate-400 font-bold">Customer Name</label>
                      <input 
                        type="text" 
                        value={editCustName}
                        onChange={(e) => setEditCustName(e.target.value)}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    {/* CUSTOMER PHONE / WHATSAPP */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">WhatsApp Contact</label>
                      <input 
                        type="text" 
                        value={editCustPhone}
                        onChange={(e) => setEditCustPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none font-mono focus:border-red-500"
                        required
                      />
                    </div>

                    {/* STATUS SELECT */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Order Status</label>
                      <select 
                        value={editOrderStatus}
                        onChange={(e) => setEditOrderStatus(e.target.value as OrderStatus)}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none focus:border-red-500"
                      >
                        <option value="New">🔴 New Order</option>
                        <option value="Delivered">🟢 Delivered & Closed</option>
                        <option value="Cancelled">⚫ Cancelled</option>
                      </select>
                    </div>

                    {/* CUSTOMER ADDRESS */}
                    <div className="col-span-2 space-y-1.5">
                      <label className="block text-slate-400 font-bold">Shipping Delivery Address</label>
                      <textarea 
                        value={editCustAddress}
                        onChange={(e) => setEditCustAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none min-h-[50px] focus:border-red-500"
                        required
                      />
                    </div>

                    {/* QUANTITY */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Quantity</label>
                      <input 
                        type="number" 
                        value={editOrderQty}
                        onChange={(e) => setEditOrderQty(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 font-mono outline-none focus:border-red-500"
                        min="1"
                        required
                      />
                    </div>

                    {/* SALES PRICE */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Sale Unit Price (PKR)</label>
                      <input 
                        type="number" 
                        value={editOrderSalePrice}
                        onChange={(e) => setEditOrderSalePrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-[#ef4444] font-mono font-bold outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    {/* COST PRICE */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Cost Unit Price (PKR)</label>
                      <input 
                        type="number" 
                        value={editOrderCostPrice}
                        onChange={(e) => setEditOrderCostPrice(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-amber-500 font-mono outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    {/* OTHER EXPENSES */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Shipping Courier Fee (PKR)</label>
                      <input 
                        type="number" 
                        value={editOrderOtherExpenses}
                        onChange={(e) => setEditOrderOtherExpenses(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-blue-400 font-mono outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    {/* ADMIN MEMO NOTES */}
                    <div className="col-span-2 space-y-1.5">
                      <label className="block text-slate-400 font-bold">Internal Logistics Notes</label>
                      <input 
                        type="text" 
                        value={editOrderNotes}
                        onChange={(e) => setEditOrderNotes(e.target.value)}
                        placeholder="e.g. Dispatched tracking code via TCS or Leopards"
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none focus:border-red-500"
                      />
                    </div>

                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-[#232333]">
                    <button
                      type="button"
                      onClick={() => setEditingOrder(null)}
                      className="px-4 py-2 bg-slate-900 border border-[#232333] hover:bg-[#1a1a24] text-slate-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Save Transactions
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================
          TAB 3: INVENTORY STOCK MANAGER
          ======================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-6 fade-in">
          
          <div className="flex justify-between items-center bg-[#11111a] border border-[#1e1e2d] p-6 rounded-2xl shadow-lg">
            <div>
              <h3 className="font-extrabold text-white text-base">Store Catalog Management</h3>
              <p className="text-xs text-slate-500">Edit features, upload product display cards, configure multiple pricing variants and costs.</p>
            </div>
            <button
              onClick={handleOpenNewProduct}
              className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-extrabold uppercase px-4 py-2.5 rounded-full transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Component
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const defaultImg = p.images[0] || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400';
              return (
                <div key={p.id} className="bg-[#11111a] border border-[#1e1e2d] rounded-2xl overflow-hidden flex flex-col justify-between">
                  <div className="relative aspect-video w-full bg-slate-950 border-b border-slate-900">
                    <img 
                      src={defaultImg} 
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-2.5 left-2.5 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                      {p.category}
                    </span>
                    <span className="absolute top-2.5 right-2.5 bg-black/80 text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded border border-slate-800">
                      Stock: {p.stock}
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h4 className="font-extrabold text-white text-sm line-clamp-1">{p.name}</h4>
                      <p className="text-slate-400 text-xs line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
                    </div>

                    {/* Sub variants panel */}
                    <div className="space-y-1 bg-black/30 p-3 rounded-lg border border-slate-900">
                      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Pricing Variants Matrix</p>
                      {p.variants.map((v) => (
                        <div key={v.label} className="flex justify-between text-[11px] py-0.5 border-b border-slate-900/40 last:border-0 leading-relaxed font-mono">
                          <span className="text-slate-300 truncate max-w-[120px]">{v.label}</span>
                          <span className="text-[#efe]">
                            Cost: {v.costPrice.toLocaleString()} | Sell: <span className="text-red-500 font-bold">{v.price.toLocaleString()}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#14141e] px-5 py-3 border-t border-slate-900 flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleEditProductClick(p)}
                      className="inline-flex items-center gap-1 bg-slate-900 border border-[#232333] hover:bg-slate-800 hover:text-white text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer font-bold"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Specs
                    </button>
                    <button
                      onClick={() => handleDeleteProductClick(p.id, p.name)}
                      className="inline-flex items-center gap-1 bg-red-600/10 border border-red-600/20 hover:bg-red-600 hover:text-white text-red-400 px-3 py-1.5 rounded-lg cursor-pointer font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ADD / EDIT COMPONENT FULL-FORM MODAL */}
          {isProductFormOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2500] flex items-center justify-center p-4 overflow-y-auto">
              <div className="relative bg-[#11111a] border border-[#1e1e2d] w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl h-[90vh] flex flex-col justify-between">
                
                {/* Header title */}
                <div className="bg-[#14141e] px-6 py-4 border-b border-[#232333] flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-sm uppercase tracking-wide">
                      {editingProduct ? `Edit "${editingProduct.name}" Specs` : "Create New Computer Component Card"}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase">Input exact pricing and variants margins</p>
                  </div>
                  <button 
                    onClick={() => setIsProductFormOpen(false)} 
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body Forms */}
                <form onSubmit={handleSaveProductSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                  
                  {/* Basic rows */}
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* TITLE */}
                    <div className="col-span-2 space-y-1.5">
                      <label className="block text-slate-400 font-bold">Component Name / Title</label>
                      <input 
                        type="text" 
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder="e.g. Intel Core i9-13900K Processor Box product"
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    {/* CATEGORY & FEATURED TOGGLE */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Hardware Category</label>
                      <input 
                        type="text" 
                        value={prodCat}
                        onChange={(e) => setProdCat(e.target.value)}
                        placeholder="e.g. Processors, RAM, SSD, UPS"
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-black/20 border border-slate-950 w-full hover:border-[#1e1e2e]">
                        <input 
                          type="checkbox" 
                          checked={prodFeatured}
                          onChange={(e) => setProdFeatured(e.target.checked)}
                          className="w-4 h-4 text-red-600 border-slate-800 bg-slate-950 rounded select-none cursor-pointer"
                        />
                        <span className="text-slate-300 font-bold text-xs select-none">⭐ Place in Featured Carousel</span>
                      </label>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="col-span-2 space-y-1.5">
                      <label className="block text-slate-400 font-bold">Comprehensive Product Description</label>
                      <textarea 
                        value={prodDesc}
                        onChange={(e) => setProdDesc(e.target.value)}
                        placeholder="Tell clients about micro-architectures, bus speeds, core counts, backup hours, guarantees, dimensions..."
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 outline-none min-h-[70px] resize-y focus:border-red-500"
                        required
                      />
                    </div>

                    {/* BASE STOCK & ESTIMATED OTHER EXPENSES (e.g. packing and standard shipping fee) */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Initial Inventory Stock Units</label>
                      <input 
                        type="number" 
                        value={prodStock}
                        onChange={(e) => setProdStock(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 font-mono outline-none focus:border-red-500"
                        min="0"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold">Estimated Delivery Expenses Per-Unit (₨)</label>
                      <input 
                        type="number" 
                        value={prodOtherExpenses}
                        onChange={(e) => setProdOtherExpenses(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#09090d] border border-[#232333] rounded-lg text-slate-100 font-mono outline-none focus:border-red-500"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="h-px bg-[#232333]" />

                  {/* HIGH-END METRIC: PHOTO & VIDEO MANAGER SYSTEM */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-[#151522] px-3 py-2 rounded-xl border border-[#232333]">
                      <div>
                        <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <Image className="w-4 h-4 text-red-500" /> Media Manager (5 Images + 1 Video)
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">Primary image goes in Slot 1. Video should be a YouTube watch URL.</p>
                      </div>
                    </div>

                    {/* Exactly 5 slots for images */}
                    <div className="grid grid-cols-5 gap-2 px-1">
                      {[0, 1, 2, 3, 4].map((index) => {
                        const imgUrl = prodImages[index] || '';
                        return (
                          <div key={index} className="flex flex-col space-y-1.5">
                            <div className="relative aspect-square w-full rounded-xl bg-black/40 border border-[#232333] flex flex-col items-center justify-center overflow-hidden group">
                              {imgUrl ? (
                                <>
                                  <img src={imgUrl} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...prodImages];
                                      updated[index] = '';
                                      // Remove slot value and clean-up empty items
                                      setProdImages(updated.map((val, i) => i === index ? '' : val));
                                    }}
                                    className="absolute inset-0 bg-red-650/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-extrabold text-[10px] uppercase cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                </>
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center cursor-pointer hover:bg-[#151522] transition-colors relative">
                                  <input 
                                    type="file" 
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      
                                      setUploadLoading(true);
                                      setActionError('');
                                      try {
                                        const reader = new FileReader();
                                        reader.onloadend = async () => {
                                          const base64Content = reader.result as string;
                                          const res = await fetch("/api/upload", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              fileName: file.name,
                                              fileContent: base64Content
                                            })
                                          });
                                          const data = await res.json();
                                          if (data.success && data.url) {
                                            const updated = [...prodImages];
                                            updated[index] = data.url;
                                            setProdImages(updated);
                                          } else {
                                            setActionError(data.error || "Failed file upload.");
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      } catch (err: any) {
                                        setActionError("Error uploading custom image.");
                                      } finally {
                                        setUploadLoading(false);
                                      }
                                    }}
                                  />
                                  <Upload className="w-4 h-4 text-red-500 mb-1" />
                                  <span className="text-[9px] text-slate-500 font-bold block leading-tight">Upload</span>
                                </div>
                              )}
                              
                              {/* Slot Number Indicator */}
                              <div className="absolute bottom-1 right-1 bg-black/75 rounded text-[8px] font-mono px-1 pb-0.5 text-slate-400 border border-slate-900 pointer-events-none select-none">
                                #{index + 1}
                              </div>
                            </div>
                            
                            {/* Manual URL Input for that specific slot */}
                            <input 
                              type="text"
                              value={imgUrl}
                              onChange={(e) => {
                                const updated = [...prodImages];
                                updated[index] = e.target.value;
                                setProdImages(updated);
                              }}
                              placeholder={`URL #${index + 1}`}
                              className="w-full px-1.5 py-1 bg-[#09090d] border border-[#232333] hover:border-slate-800 rounded text-[9px] text-slate-300 outline-none focus:border-red-500 leading-none"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* YouTube Video URL Input */}
                    <div className="bg-[#09090f] border border-[#1e1e2d] p-3 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                        <i className="fa-brands fa-youtube text-red-500 text-sm" />
                        <span>YouTube Product Video Link (Optional)</span>
                      </div>
                      <input 
                        type="url"
                        value={prodVideoUrl}
                        onChange={(e) => setProdVideoUrl(e.target.value)}
                        placeholder="e.g. https://www.youtube.com/watch?v=TVvoIgLx1jM"
                        className="w-full px-3 py-2 bg-black border border-slate-800 focus:border-red-500 rounded-lg outline-none text-[11px] text-slate-200"
                      />
                      <p className="text-[9px] text-slate-600 text-slate-500">The video will be displayed in the product slider alongside your gallery images.</p>
                    </div>
                  </div>

                  <div className="h-px bg-[#232333]" />

                  {/* INTEGRATED SUB-MATRIX SYSTEM: DYNAMIC VARIANT FORM */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">Price Variants Matrix</label>
                        <p className="text-[10px] text-slate-600">Different capacities, pack types or packages. Profit is dynamically evaluated derived from Cost to Price margins.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVariantRow}
                        className="inline-flex items-center gap-1 bg-[#1a1a24] border border-[#2d2d3a] hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-red-500" /> Add Variant Package
                      </button>
                    </div>

                    {/* Variant rows */}
                    <div className="space-y-3 pt-1">
                      {prodVariants.map((v, index) => {
                        const unitProfit = v.price - v.costPrice - prodOtherExpenses;
                        return (
                          <div key={index} className="grid grid-cols-12 gap-2 bg-[#09090d]/50 border border-slate-900 p-3 rounded-xl items-center relative group">
                            
                            {/* Variant designation label */}
                            <div className="col-span-12 sm:col-span-5 space-y-1">
                              <span className="text-[8px] text-slate-600 uppercase font-bold">Variant Label Designation</span>
                              <input 
                                type="text"
                                placeholder="e.g. 16GB DDR4, Tray Pack"
                                value={v.label}
                                onChange={(e) => updateVariantCell(index, 'label', e.target.value)}
                                className="w-full bg-[#0a0a0f] border border-slate-900 p-2 rounded outline-none focus:border-red-500"
                                required
                              />
                            </div>

                            {/* Cost Price */}
                            <div className="col-span-4 sm:col-span-2 space-y-1 font-mono">
                              <span className="text-[8px] text-slate-600 uppercase font-bold">Cost (PKR)</span>
                              <input 
                                type="number"
                                placeholder="Our cost"
                                value={v.costPrice}
                                onChange={(e) => updateVariantCell(index, 'costPrice', e.target.value)}
                                className="w-full bg-[#0a0a0f] border border-slate-900 p-2 rounded outline-none focus:border-red-500 text-amber-500"
                                min="0"
                                required
                              />
                            </div>

                            {/* Selling Price */}
                            <div className="col-span-4 sm:col-span-2 space-y-1 font-mono">
                              <span className="text-[8px] text-slate-600 uppercase font-bold">Selling (PKR)</span>
                              <input 
                                type="number"
                                placeholder="Sale tag"
                                value={v.price}
                                onChange={(e) => updateVariantCell(index, 'price', e.target.value)}
                                className="w-full bg-[#0a0a0f] border border-slate-900 p-2 rounded outline-none focus:border-red-500 text-[#ef4444] font-bold"
                                min="0"
                                required
                              />
                            </div>

                            {/* Evaluated Net Profit column */}
                            <div className="col-span-3 sm:col-span-2 space-y-1 font-mono pl-2">
                              <span className="text-[8px] text-slate-600 uppercase font-bold block">Profit Margin</span>
                              <span className={`text-[11px] font-bold block pt-1.5 ${unitProfit >= 0 ? "text-emerald-400" : "text-slate-500"}`}>
                                ₨ {unitProfit.toLocaleString()}
                              </span>
                            </div>

                            {/* Remove row trigger */}
                            <div className="col-span-12 sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                disabled={prodVariants.length === 1}
                                onClick={() => handleRemoveVariantRow(index)}
                                className="p-1.5 bg-red-600/10 text-red-500 hover:text-white hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-all mt-3 sm:mt-0"
                                title="Remove Variant"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                </form>

                {/* Bottom dialog footers */}
                <div className="bg-[#14141e] px-6 py-4 border-t border-[#232333] flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsProductFormOpen(false)}
                    className="px-4 py-2 bg-slate-900 border border-[#232333] hover:bg-slate-800 text-slate-400 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProductSubmit}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-4.5 h-4.5" /> Save Product & Stock List
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
