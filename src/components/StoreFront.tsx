import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, CheckCircle, Smartphone, Truck, ShieldCheck, FileCheck, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, ProductVariant } from '../types';

interface StoreFrontProps {
  products: Product[];
  onPlaceOrder: (orderData: {
    productId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    variantLabel: string;
    quantity: number;
  }) => Promise<any>;
}

export default function StoreFront({ products, onPlaceOrder }: StoreFrontProps) {
  // Navigation & UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  
  // Checkout Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Video embed autoplay state in Hero Section
  const [playHeroVideo, setPlayHeroVideo] = useState(false);

  // Categories list
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtered Products list
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Reset checkout state when opening/closing product modal
  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setActiveImageIndex(0);
    setSelectedVariant(product.variants[0] || null);
    setOrderQty(1);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderSuccess(false);
    setErrorMsg('');
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedVariant) return;

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
      setErrorMsg('⚠️ Please fill in all fields to complete your order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onPlaceOrder({
        productId: selectedProduct.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        variantLabel: selectedVariant.label,
        quantity: orderQty
      });
      setOrderSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('❌ Failed to submit order. Please try again or contact us.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const heroVideoId = "TVvoIgLx1jM"; // Hardcoded default from previous code

  return (
    <>
      <div className="relative min-h-screen">
      <div className="fade-in">
        {/* 1. HERO SECTION */}
      <section id="home" className="relative overflow-hidden bg-gradient-to-b from-[#0b0b14] via-[#1a0a0a] to-[#0c0c12] py-14 px-4 sm:px-6 lg:px-8 border-b border-[#1e1e2d] scroll-mt-20">
        {/* Glow Element */}
        <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Premium Components</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Genuine Computer Parts & <span className="text-red-500">Power Devices</span>
            </h1>
            
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Tayyab Computers brings you top-tier processors, overclocked RAM modules, high-density SSD storage, and smart WiFi router UPS power banks. Buy with absolute confidence through <strong>Free delivery</strong> and <strong>Cash on Delivery (COD)</strong> across Pakistan.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> 100% Original Products
              </span>
              <span className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Free FedEx Shipping
              </span>
              <span className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Open Box Guarantee
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a 
                href="#products" 
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white px-8 py-3.5 rounded-full font-bold shadow-lg shadow-red-600/30 transition-all text-sm uppercase tracking-wide"
              >
                <ShoppingBag className="w-4 h-4" /> Browse Catalog
              </a>
              <a 
                href="https://wa.me/+923170437066" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25d366]/10 border border-[#25d366]/40 hover:bg-[#25d366]/20 text-[#25d366] px-8 py-3.5 rounded-full font-bold transition-all text-sm uppercase tracking-wide"
              >
                <i className="fa-brands fa-whatsapp text-lg" /> Connect On WhatsApp
              </a>
            </div>
          </div>

          {/* Hero Video Section */}
          <div className="lg:col-span-5">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 shadow-black/80">
              {!playHeroVideo ? (
                <div 
                  className="absolute inset-0 cursor-pointer group"
                  onClick={() => setPlayHeroVideo(true)}
                >
                  <img 
                    src={`https://img.youtube.com/vi/${heroVideoId}/maxresdefault.jpg`} 
                    alt="Introductory Video Thumbnail"
                    className="w-full h-full object-cover opacity-72 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="relative flex items-center justify-center w-20 h-20 bg-red-600 rounded-full shadow-xl shadow-red-600/40 group-hover:scale-110 transition-transform duration-300">
                      <div className="absolute inset-0 bg-red-600 rounded-full pulse-ring" />
                      <i className="fa-solid fa-play text-white text-2xl relative z-10 pl-1" />
                    </div>
                  </div>
                </div>
              ) : (
                <iframe 
                  className="w-full h-full border-none"
                  src={`https://www.youtube.com/embed/${heroVideoId}?autoplay=1&rel=0`} 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Tayyab Computers Video Explainer"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUST MARKETING BANNERS */}
      <section className="bg-[#0b0b0f] py-8 border-b border-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-4 bg-[#14141e]/50 border border-slate-900 p-5 rounded-2xl transition-all hover:border-slate-800">
            <div className="p-3.5 bg-red-500/10 rounded-xl text-red-500">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-[#fff] text-sm leading-snug">FREE Delivery Nationwide</p>
              <p className="text-xs text-slate-400">Zero hidden shipping fees for Pakistan</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#14141e]/50 border border-slate-900 p-5 rounded-2xl transition-all hover:border-slate-800">
            <div className="p-3.5 bg-red-500/10 rounded-xl text-red-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-[#fff] text-sm leading-snug">100% Cash on Delivery</p>
              <p className="text-xs text-slate-400">Pay only when products arrive safely</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#14141e]/50 border border-slate-900 p-5 rounded-2xl transition-all hover:border-slate-800">
            <div className="p-3.5 bg-red-500/10 rounded-xl text-red-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-[#fff] text-sm leading-snug">Open Box & Verify First</p>
              <p className="text-xs text-slate-400">Check physical parcel before handing cash</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#14141e]/50 border border-slate-900 p-5 rounded-2xl transition-all hover:border-slate-800">
            <div className="p-3.5 bg-red-500/10 rounded-xl text-red-500">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-extrabold text-[#fff] text-sm leading-snug">15-Days Return Warranty</p>
              <p className="text-xs text-slate-400">Uncompromising post-purchase security</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRODUCT CATALOG SEARCH & FILTER */}
      <section id="products" className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            <ShoppingBag className="w-7 h-7 text-red-500" /> 🛒 Explore Our Products
          </h2>
          <div className="w-16 h-1 bg-red-600 mx-auto rounded-full" />
          <p className="text-slate-400 max-w-lg mx-auto text-sm">
            Find the best deals on high-speed computer parts. Enter a keyword or filter by hardware component categories!
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#11111b] border border-[#1e1e2d] p-5 rounded-2xl shadow-xl shadow-black/20 mb-8">
          <div className="relative w-full md:w-96 flex-shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search components or router UPS..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[#09090d] border border-[#232333] hover:border-[#2d2d42] focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-full text-slate-200 outline-none transition-all text-sm placeholder:text-slate-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border transition-all ${
                  selectedCategory === cat 
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20' 
                    : 'bg-[#09090d] text-slate-300 border-[#232333] hover:bg-[#1a1a24] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-[#11111b] border border-[#1e1e2d] rounded-2xl space-y-4">
            <Search className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-lg">No computer parts found matching your criteria.</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
              className="text-red-500 font-bold underline text-sm cursor-pointer"
            >
              Reset filters and search query
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              // Get the minimum starting price
              const minPrice = p.variants.reduce((min, current) => current.price < min ? current.price : min, p.variants[0]?.price || 0);
              const maxPrice = p.variants.reduce((max, current) => current.price > max ? current.price : max, p.variants[0]?.price || 0);

              const hasVariants = p.variants.length > 1;
              const displayPrice = hasVariants 
                ? `From ${minPrice.toLocaleString()} PKR`
                : `${minPrice ? minPrice.toLocaleString() + ' PKR' : 'Price N/A'}`;

              const defaultImg = p.images[0] || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=400';

              return (
                <div 
                  key={p.id}
                  onClick={() => openProductModal(p)}
                  className={`group relative bg-[#13131c] border rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01] hover:border-red-500 cursor-pointer flex flex-col justify-between ${
                    p.featured ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-slate-900 hover:shadow-xl hover:shadow-black/40'
                  }`}
                >
                  {/* Badge */}
                  {p.featured && (
                    <div className="absolute top-2.5 left-2.5 bg-amber-500 text-black text-[9px] font-extrabold uppercase px-2 py-1 rounded-md z-10 shadow tracking-wide">
                      ⭐ FEATURED
                    </div>
                  )}

                  {/* Stock tag */}
                  <div className="absolute top-2.5 right-2.5 bg-[#09090d]/80 backdrop-blur text-[10px] font-semibold px-2 py-1 rounded-md z-10 border border-slate-800">
                    {p.stock > 0 ? (
                      <span className="text-emerald-400">✅ {p.stock} In Stock</span>
                    ) : (
                      <span className="text-red-400">❌ Out of Stock</span>
                    )}
                  </div>

                  <div>
                    {/* Media representation */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 mb-4 border border-slate-900/50">
                      <img 
                        src={defaultImg} 
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">{p.category}</p>
                    <h3 className="font-extrabold text-white text-sm sm:text-base line-clamp-1 group-hover:text-red-400 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Price</span>
                      <span className="text-[#fff] font-black text-sm text-red-500">{displayPrice}</span>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); openProductModal(p); }}
                      className="w-full mt-3 py-2 bg-transparent border-2 border-red-600 hover:bg-red-600 text-red-500 hover:text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Order Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. REVIEWS TESTIMONIALS */}
      <section id="reviews" className="bg-[#09090d] py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900 scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">Loved By PC Enthusiasts</h2>
            <p className="text-xs text-slate-400 tracking-wider uppercase">Genuine verified testimonials from our buyers</p>
            <div className="w-12 h-1 bg-red-600 mx-auto rounded-full mt-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#12121b] border border-slate-900 p-6 rounded-2xl relative">
              <div className="flex gap-1 text-amber-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-500" />)}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic mb-6">
                "Absolutely genuine processors! Bought an Intel i7-12700K and received it next day in Lahore. They let me open the parcel with the delivery rider to verify before handing over the cash. Mind-blowing support!"
              </p>
              <div>
                <p className="font-extrabold text-sm text-white">Chaudhary Zubair</p>
                <p className="text-[11px] text-slate-500">Lahore, Pakistan</p>
              </div>
            </div>

            <div className="bg-[#12121b] border border-slate-900 p-6 rounded-2xl relative">
              <div className="flex gap-1 text-amber-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-500" />)}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic mb-6">
                "The mini Router UPS power bank works like a miracle. Keeps my Fiber internet router running for over 5.5 hours during scheduled neighborhood outages. Highly recommend Tayyab Computers for electronics."
              </p>
              <div>
                <p className="font-extrabold text-sm text-white">Syed Kamran Shah</p>
                <p className="text-[11px] text-slate-500">Rawalpindi, Pakistan</p>
              </div>
            </div>

            <div className="bg-[#12121b] border border-slate-900 p-6 rounded-2xl relative">
              <div className="flex gap-1 text-amber-500 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-500" />)}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed italic mb-6">
                "Needed a gaming RAM match for dual channels on Ryzen 5. Their tech support helped me pick the right Corsair kit over WhatsApp. Exceptionally professional, super-fast response time."
              </p>
              <div>
                <p className="font-extrabold text-sm text-white">Muhammad Bilal</p>
                <p className="text-[11px] text-slate-500">Islamabad, Pakistan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BRAND FOOTER */}
      <footer id="contact" className="bg-[#07070b] border-t border-slate-900 py-14 px-4 sm:px-6 lg:px-8 text-slate-400 text-xs text-slate-400 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="font-black text-white text-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full" /> Tayyab Computers
            </div>
            <p className="leading-relaxed text-slate-500">
              Your direct destination for authentic, factory-fresh PC parts, microprocessors, and custom battery backups. Based in Pakistan, serving nationwide.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-extrabold uppercase tracking-wider text-sm">📍 Fast Contacts</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2">
                <i className="fa-brands fa-whatsapp text-[#25d366] text-sm" /> 
                <a href="https://wa.me/+923170437066" target="_blank" rel="noreferrer" className="hover:text-red-400 transition-colors font-bold text-slate-300">
                  0317 0437066
                </a>
              </li>
              <li className="flex items-center gap-2">
                <i className="fa-solid fa-envelope text-red-500" /> 
                <a href="mailto:tayyabvfx@gmail.com" className="hover:text-red-400 transition-colors">
                  tayyabvfx@gmail.com
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-extrabold uppercase tracking-wider text-sm">🌐 Social Platforms</h4>
            <div className="flex gap-2">
              <a href="https://www.instagram.com/Tayyabvfx" target="_blank" rel="noreferrer" className="w-[36px] h-[36px] border border-slate-900 hover:border-red-500 rounded-full flex items-center justify-center text-white hover:text-red-400 transition-all bg-slate-950/40">
                <i className="fa-brands fa-instagram text-xs" />
              </a>
              <a href="https://www.facebook.com/Tayyabvfx1" target="_blank" rel="noreferrer" className="w-[36px] h-[36px] border border-slate-900 hover:border-red-500 rounded-full flex items-center justify-center text-white hover:text-red-400 transition-all bg-slate-950/40">
                <i className="fa-brands fa-facebook-f text-xs" />
              </a>
              <a href="https://www.tiktok.com/@Tayyabvfx1" target="_blank" rel="noreferrer" className="w-[36px] h-[36px] border border-slate-900 hover:border-red-500 rounded-full flex items-center justify-center text-white hover:text-red-400 transition-all bg-slate-950/40">
                <i className="fa-brands fa-tiktok text-xs" />
              </a>
              <a href="https://wa.me/+923170437066" target="_blank" rel="noreferrer" className="w-[36px] h-[36px] border border-slate-900 hover:border-red-500 rounded-full flex items-center justify-center text-white hover:text-[#25d366] transition-all bg-slate-950/40">
                <i className="fa-brands fa-whatsapp text-xs" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-extrabold uppercase tracking-wider text-sm">💳 Accept Payments</h4>
            <div className="flex gap-2 flex-wrap">
              <span className="bg-[#00a550] text-[#fff] px-2 py-1 rounded font-bold text-[10px]">EasyPaisa</span>
              <span className="bg-[#cf0000] text-[#fff] px-2 py-1 rounded font-bold text-[10px]">JazzCash</span>
              <span className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-1 rounded font-bold text-[10px]">COD</span>
            </div>
            <p className="text-[10px] text-slate-600">Open parcel before payout is active safely.</p>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto border-t border-slate-900/60 mt-10 pt-6 text-center text-[10px] text-slate-600">
          <p>© {new Date().getFullYear()} <strong>Tayyab Computers Hub</strong>. Upgraded Management Solution. Pakistan 🇵🇰</p>
        </div>
      </footer>
      </div>

      {/* 6. WHATSAPP STICKY FLOATING */}
      <a 
        href="https://wa.me/+923170437066?text=Salam! I'm interested in computer components from Tayyab Computers." 
        target="_blank" 
        rel="noreferrer" 
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#25d366] text-white hover:scale-110 active:scale-95 transition-all rounded-full flex items-center justify-center shadow-2xl shadow-[#25d366]/40 z-[990] animate-bounce"
        style={{ animationDuration: '3s' }}
        title="WhatsApp Support"
      >
        <i className="fa-brands fa-whatsapp text-2xl" />
      </a>

      {/* 7. POPUP DETAIL & CHECKOUT MODAL */}
      {selectedProduct && (() => {
        // Build list of active slides (Images + YouTube Video)
        const validImages = selectedProduct.images.filter(img => img && img.trim() !== '');
        const slides = [
          ...validImages.map(img => ({ type: 'image' as const, url: img })),
          ...(selectedProduct.videoUrl ? [{ type: 'video' as const, url: selectedProduct.videoUrl }] : [])
        ];
        if (slides.length === 0) {
          slides.push({ type: 'image' as const, url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&q=80&w=600' });
        }

        // Clip active index if it exceeds length
        const currentIndex = activeImageIndex >= slides.length ? 0 : activeImageIndex;
        const currentSlide = slides[currentIndex];

        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] overflow-y-auto px-2 sm:px-4 py-4 sm:py-8 flex justify-center items-start">
            <div className="relative bg-[#11111a] border border-[#1e1e2d] w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl shadow-black/95 my-auto scale-in animate-[fadeIn_0.3s_ease_forwards] flex flex-col">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 bg-black/75 hover:bg-red-650 text-white w-10 h-10 rounded-full flex items-center justify-center z-50 transition-colors border border-slate-800 cursor-pointer shadow-lg active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Contents */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                
                {/* Left Column: Image/YouTube Slider */}
                <div className="bg-[#09090d] flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-900 overflow-hidden">
                  <div className="relative aspect-video sm:aspect-square w-full bg-black flex items-center justify-center p-1 sm:p-2">
                    
                    {/* Slider Control Arrows */}
                    {slides.length > 1 && (
                      <>
                        <button 
                          type="button"
                          onClick={() => {
                            setActiveImageIndex(prev => prev === 0 ? slides.length - 1 : prev - 1);
                          }}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center z-10 hover:scale-105 active:scale-95 transition-all shadow-md border border-slate-800"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setActiveImageIndex(prev => (prev + 1) % slides.length);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/75 hover:bg-red-650 text-white w-10 h-10 rounded-full flex items-center justify-center z-10 hover:scale-105 active:scale-95 transition-all shadow-md border border-slate-800"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}

                    {/* Current Slide Render */}
                    {currentSlide.type === 'video' ? (
                      <div className="w-full h-full aspect-video sm:aspect-square flex items-center justify-center bg-black">
                        {getYouTubeId(currentSlide.url) ? (
                          <iframe 
                            className="w-full h-full aspect-video sm:aspect-square border-none"
                            src={`https://www.youtube.com/embed/${getYouTubeId(currentSlide.url)}?rel=0`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="text-slate-500 font-mono text-[11px]">Invalid YouTube Link</div>
                        )}
                      </div>
                    ) : (
                      <img 
                        src={currentSlide.url} 
                        alt="Selected component slide" 
                        className="w-full h-full object-contain max-h-[300px] sm:max-h-[450px]"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    {/* Counter Badge */}
                    {slides.length > 1 && (
                      <span className="absolute bottom-4 left-4 bg-black/75 px-3 py-1 text-[10px] text-slate-300 font-bold rounded-full border border-slate-800">
                        {currentIndex + 1} / {slides.length}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Previews (Swipable scroll bar optimized for mobile touch screens) */}
                  {slides.length > 1 && (
                    <div className="flex gap-2.5 p-4 overflow-x-auto bg-black/20 border-t border-slate-900 justify-start sm:justify-center scrollbar-none snap-x select-none">
                      {slides.map((slide, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveImageIndex(i)}
                          className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all snap-center focus:outline-none ${
                            currentIndex === i ? 'border-red-500 scale-95 shadow-md shadow-red-500/10' : 'border-[#1b1b2a] hover:border-slate-700'
                          }`}
                        >
                          {slide.type === 'video' ? (
                            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-1">
                              <i className="fa-brands fa-youtube text-red-500 text-lg mb-0.5" />
                              <span className="text-[7px] text-red-400 font-bold uppercase tracking-wider leading-none">Video</span>
                            </div>
                          ) : (
                            <img src={slide.url} alt="Thumbnail" className="w-full h-full object-cover" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Descriptions, Variants, and Form */}
                <div className="p-6 sm:p-8 flex flex-col justify-between h-full space-y-6">
                  {!orderSuccess ? (
                    <>
                      <div className="space-y-4">
                        {/* Title & Category */}
                        <div>
                          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{selectedProduct.category}</span>
                          <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mt-1">
                            {selectedProduct.name}
                          </h2>
                        </div>

                        {/* Cost & In-Stock status bar */}
                        <div className="flex flex-wrap gap-3 items-center">
                          <span className="text-2xl font-black text-red-500">
                            {selectedVariant ? (selectedVariant.price * orderQty).toLocaleString() : 'Price N/A'} PKR
                          </span>
                          
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full ${
                            selectedProduct.stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {selectedProduct.stock > 0 ? `✅ In Stock (${selectedProduct.stock})` : '❌ Sold Out'}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto pr-2">
                          {selectedProduct.description}
                        </p>

                        <div className="h-px bg-slate-900 my-4" />

                        {/* Variant Selection Component */}
                        {selectedProduct.variants.length > 1 && (
                          <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Choose Variant
                            </label>
                            <select
                              value={selectedVariant?.label || ''}
                              onChange={(e) => {
                                const found = selectedProduct.variants.find(v => v.label === e.target.value);
                                if (found) setSelectedVariant(found);
                              }}
                              className="w-full px-4 py-2 bg-[#09090d] border border-[#232333] hover:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            >
                              {selectedProduct.variants.map((v) => (
                                <option key={v.label} value={v.label}>
                                  {v.label} — {v.price.toLocaleString()} PKR
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Quantity input */}
                        <div className="flex items-center gap-3 mt-4">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</span>
                          <div className="flex items-center rounded-lg border border-[#232333] bg-[#09090d] overflow-hidden">
                            <button 
                              type="button"
                              onClick={() => setOrderQty(prev => Math.max(1, prev - 1))}
                              className="px-3 py-1 text-slate-400 hover:bg-[#151522] hover:text-white font-bold transition-colors"
                            >
                              -
                            </button>
                            <span className="px-4 text-xs font-bold text-white leading-normal">
                              {orderQty}
                            </span>
                            <button 
                              type="button"
                              onClick={() => setOrderQty(prev => Math.min(selectedProduct.stock > 0 ? selectedProduct.stock : 99, prev + 1))}
                              className="px-3 py-1 text-slate-400 hover:bg-[#151522] hover:text-white font-bold transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Order Delivery Checkout Form */}
                      <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-4 border-t border-slate-900">
                        <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 mb-2 decoration-red-500 underline decoration-2">
                          <i className="fa-solid fa-truck-fast text-red-500" /> Enter Delivery Detail
                        </div>

                        <div className="space-y-2">
                          <input 
                            type="text" 
                            placeholder="Your Full Name (e.g. Chaudhary Ahmed)"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2d] hover:border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-xs sm:text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                            required
                            disabled={selectedProduct.stock <= 0}
                          />
                        </div>

                        <div className="space-y-2">
                          <input 
                            type="tel" 
                            placeholder="WhatsApp / Phone Number (e.g. 0317 0437066)"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2d] hover:border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-xs sm:text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                            required
                            disabled={selectedProduct.stock <= 0}
                          />
                        </div>

                        <div className="space-y-2">
                          <textarea 
                            placeholder="Complete Shipping Address (City, Town, Sector, Street, House)"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#1e1e2d] hover:border-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl text-xs sm:text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600 min-h-[60px] resize-y"
                            required
                            disabled={selectedProduct.stock <= 0}
                          />
                        </div>

                        {/* Display Alert Error */}
                        {errorMsg && (
                          <p className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                            {errorMsg}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmitting || selectedProduct.stock <= 0}
                          className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-extrabold text-white text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 hover:scale-[1.01] active:scale-95 cursor-pointer uppercase tracking-wider h-11"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Placing Order...
                            </>
                          ) : selectedProduct.stock > 0 ? (
                            <>
                              <ShoppingBag className="w-4.5 h-4.5" /> Order Now
                            </>
                          ) : (
                            "Temporarily Out Of Stock"
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    /* Success Screen Overlay */
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 animate-[fadeIn_0.5s_ease_forwards]">
                      <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center text-4xl animate-bounce">
                        ✓
                      </div>
                      
                      <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                        Order Placed Successfully!
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm">
                        Congratulations, <strong>{customerName}</strong>! We've registered your order for <strong>{selectedProduct.name} ({selectedVariant?.label})</strong>. We will contact you over WhatsApp shortly to confirm your delivery address.
                      </p>

                      <div className="bg-[#09090d] border border-slate-900 p-4 rounded-xl w-full text-left font-mono text-[11px] leading-relaxed space-y-1 text-slate-400">
                        <p><span className="text-slate-500">Invoice Num:</span> Pending Confirmation</p>
                        <p><span className="text-slate-500">Contact:</span> {customerPhone}</p>
                        <p><span className="text-slate-500">Subtotal:</span> {((selectedVariant?.price || 0) * orderQty).toLocaleString()} PKR</p>
                        <p><span className="text-slate-500">Delivery:</span> FREE (COD)</p>
                      </div>

                      <button 
                        onClick={() => setSelectedProduct(null)}
                        className="mt-6 px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors text-xs uppercase tracking-widest cursor-pointer"
                      >
                        Close Window
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
    </>
  );
}
