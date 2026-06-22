import React, { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, RefreshCw, Plus, Database, Layers, CheckCircle2, AlertCircle, Key, Link as LinkIcon, Clipboard, ArrowUpRight, LogOut, Check, ShoppingBag, Edit, Trash2, Wand2, Image as ImageIcon, PlusCircle, Sparkles, X, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import { getAccessToken, getCJProducts, createCJOrder, getCachedToken, disconnectCJ, getLogs, queryCJProduct, addImportedProduct, getImportedProducts, getStorefrontProducts, updateStorefrontProduct, deleteStorefrontProduct, resetStorefrontProducts, bulkAiRewriteProducts, moveStorefrontProduct } from '../services/cjApi';
import { getSales, fireSaleNotification } from '../services/saleService';
import { generateProductCopy } from '../services/geminiService';
import { isAdminAuthenticated, loginAdmin, logoutAdmin } from '../utils/auth';

const INITIAL_SKUS = [
  {
    id: '1798542129166426112',
    name: 'TheraPulse Clinical LED Mask',
    sku: 'TP-MASK-01',
    supplierSku: 'CJ-1798542129166426112',
    cost: 45.00,
    price: 139.99,
    inventory: 1240,
    provider: 'CJ Dropshipping',
    status: 'Mapped'
  }
];

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(isAdminAuthenticated());
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginAdmin(pinInput)) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid Admin PIN');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-led-red via-led-purple to-led-red"></div>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-8 h-8 text-obsidian" />
            </div>
            <h2 className="text-2xl font-black text-obsidian tracking-tight">Admin Portal</h2>
            <p className="text-xs text-ash-gray font-mono mt-2 uppercase tracking-widest">Restricted Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-obsidian uppercase tracking-wider mb-2">Access PIN</label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none transition-all ${
                  authError ? 'border-red-400 focus:ring-1 focus:ring-red-400' : 'border-slate-200 focus:border-led-purple focus:ring-1 focus:ring-led-purple'
                }`}
                autoFocus
              />
              {authError && <p className="text-xs text-red-500 font-bold mt-2 text-center flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" />{authError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-obsidian text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
            >
              Unlock Dashboard
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-[10px] text-slate-400 font-mono">TheraPulse Control Center v2.1.0</p>
          </div>
        </div>
      </div>
    );
  }

  return <DashboardContent onLogout={handleLogout} />;
}

function DashboardContent({ onLogout }) {
  const [skus, setSkus] = useState(() => {
    let imported = [];
    try {
      const raw = getImportedProducts();
      imported = Array.isArray(raw) ? raw : [];
    } catch(e) {
      console.error(e);
    }
    const mappedImported = imported.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      supplierSku: p.supplierSku,
      cost: p.cost,
      price: p.price,
      inventory: p.inventory,
      provider: 'CJ Dropshipping',
      status: 'Mapped'
    }));
    return [...INITIAL_SKUS, ...mappedImported];
  });
  const [activeTab, setActiveTab] = useState('sales'); // mappings | cjCatalog | sales
  const [logMessages, setLogMessages] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [salesRecords, setSalesRecords] = useState([]);

  // Importer Form State
  const [importVal, setImportVal] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // CJ State
  const [cjToken, setCjToken] = useState(null);
  const [cjTokenExpiry, setCjTokenExpiry] = useState('');
  const [cjAuthMode, setCjAuthMode] = useState('');
  const [isCjLoading, setIsCjLoading] = useState(false);
  const [cjCatalog, setCjCatalog] = useState([]);

  // Generate Link Form Modal state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLanding, setCopiedLanding] = useState(false);
  const [copiedConfirm, setCopiedConfirm] = useState(false);
  const [customerData, setCustomerData] = useState({
    fullName: 'John Doe',
    address: '742 Evergreen Terrace',
    city: 'Springfield',
    zip: '45201',
    quantity: 1
  });

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    pid: '',
    productName: '',
    categoryName: '',
    sellPrice: 0,
    originalPrice: 0,
    costPrice: 0,
    inventory: 0,
    description: '',
    highlights: ['', '', '', ''],
    productImage: '',
    productImages: []
  });
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isBulkRewriting, setIsBulkRewriting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, productName: '' });

  // Pull logs from service
  const updateLogs = () => {
    setLogMessages(getLogs());
  };

  useEffect(() => {
    // Initial token load
    const token = getCachedToken();
    if (token) {
      setCjToken(token);
      const cachedExpiry = localStorage.getItem('cj_access_token_expiry');
      if (cachedExpiry) setCjTokenExpiry(cachedExpiry);
    }
    loadCjCatalog(); // Always fetch storefront database on mount!
    updateLogs();
    
    // Safely load sales records
    try {
      const sales = getSales();
      setSalesRecords(Array.isArray(sales) ? sales : []);
    } catch(e) {
      setSalesRecords([]);
    }
  }, []);

  const handleCjConnect = async () => {
    setIsCjLoading(true);
    try {
      const res = await getAccessToken(true);
      if (res.success) {
        setCjToken(res.accessToken);
        setCjTokenExpiry(res.expiry || '');
        setCjAuthMode(res.mode);
        // Refresh catalog if we are in CJ tab
        if (activeTab === 'cjCatalog') {
          loadCjCatalog();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCjLoading(false);
      updateLogs();
    }
  };

  const handleCjDisconnect = () => {
    disconnectCJ();
    setCjToken(null);
    setCjTokenExpiry('');
    setCjAuthMode('');
    setCjCatalog([]);
    updateLogs();
  };

  const loadCjCatalog = async () => {
    setIsCjLoading(true);
    try {
      const res = await getCJProducts();
      if (res.success) {
        setCjCatalog(res.list);
        setCjAuthMode(res.mode);
        
        // Sync skus state mapping
        const mappedSkus = res.list.map(p => ({
          id: p.pid,
          name: p.productName,
          sku: p.productSku,
          supplierSku: p.productSku || 'CJ-IMPORT-SPU',
          cost: p.costPrice || p.cost || 0,
          price: p.sellPrice || p.price || 0,
          inventory: p.inventory || 0,
          provider: 'CJ Dropshipping',
          status: 'Mapped'


        }));
        setSkus(mappedSkus);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCjLoading(false);
      updateLogs();
    }
  };

  const handleMoveProduct = async (pid, direction) => {
    const success = await moveStorefrontProduct(pid, direction);
    if (success) {
      loadCjCatalog();
    } else {
      alert("Cannot move this product further in that direction.");
    }
  };

  useEffect(() => {
    if (activeTab === 'cjCatalog') {
      loadCjCatalog();
    }
  }, [activeTab]);

  // Synchronizers
  const syncCJDropshippingInventory = () => {
    setIsSyncing(true);
    setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] Initiating CJ Dropshipping inventory check...`, ...prev]);
    
    setTimeout(() => {
      setSkus(prev => prev.map(item => {
        if (item.provider === 'CJ Dropshipping') {
          const newInv = item.inventory + Math.floor(Math.random() * 20) - 10;
          return { ...item, inventory: newInv, status: 'Synced' };
        }
        return item;
      }));
      setIsSyncing(false);
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] CJ Dropshipping synchronization finished successfully.`, ...prev]);
    }, 1500);
  };

  const syncAutoDSStock = () => {
    setIsSyncing(true);
    setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] Calling AutoDS Inventory API endpoints...`, ...prev]);
    
    setTimeout(() => {
      setSkus(prev => prev.map(item => {
        if (item.provider === 'AutoDS') {
          const newInv = item.inventory + Math.floor(Math.random() * 40) - 20;
          return { ...item, inventory: newInv, status: 'Synced' };
        }
        return item;
      }));
      setIsSyncing(false);
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] AutoDS inventory check finalized.`, ...prev]);
    }, 1500);
  };

  // --- CATALOG EDIT / DELETE / RESET HANDLERS ---
  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditForm({
      pid: product.pid,
      productName: product.productName,
      categoryName: product.categoryName || 'LED Devices',
      sellPrice: product.sellPrice || 0,
      originalPrice: product.originalPrice || 0,
      costPrice: product.costPrice || product.cost || 0,
      inventory: product.inventory || 0,
      description: product.description || '',
      highlights: Array.isArray(product.highlights) 
        ? [...product.highlights, '', '', '', ''].slice(0, 4)
        : ['Clinically tested formula', 'Visible results in 4-6 weeks', 'Dermatologist recommended', 'Free express shipping'],
      productImage: product.productImage || '',
      productImages: Array.isArray(product.productImages) 
        ? [...product.productImages] 
        : [product.productImage].filter(Boolean)
    });
    setAiSuccessMessage('');
    setNewImageUrl('');
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleHighlightChange = (index, value) => {
    setEditForm(prev => {
      const updated = [...prev.highlights];
      updated[index] = value;
      return { ...prev, highlights: updated };
    });
  };

  const handleAddImage = (e) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    setEditForm(prev => {
      const updatedImages = [...prev.productImages];
      if (!updatedImages.includes(newImageUrl)) {
        updatedImages.push(newImageUrl);
      }
      return {
        ...prev,
        productImages: updatedImages,
        productImage: prev.productImage || newImageUrl
      };
    });
    setNewImageUrl('');
  };

  const handleDeleteImage = (imgUrl) => {
    setEditForm(prev => {
      const updatedImages = prev.productImages.filter(url => url !== imgUrl);
      let mainImg = prev.productImage;
      if (mainImg === imgUrl) {
        mainImg = updatedImages[0] || '';
      }
      return {
        ...prev,
        productImages: updatedImages,
        productImage: mainImg
      };
    });
  };

  const handleSetMainImage = (imgUrl) => {
    setEditForm(prev => ({
      ...prev,
      productImage: imgUrl
    }));
  };

  const handleEditFormSubmit = (e) => {
    e.preventDefault();
    const updated = {
      pid: editForm.pid,
      productName: editForm.productName,
      categoryName: editForm.categoryName,
      sellPrice: parseFloat(editForm.sellPrice) || 0,
      originalPrice: parseFloat(editForm.originalPrice) || 0,
      costPrice: parseFloat(editForm.costPrice) || 0,
      productPriceMin: parseFloat(editForm.costPrice) || 0,
      productPriceMax: parseFloat(editForm.costPrice) || 0,
      inventory: parseInt(editForm.inventory) || 0,
      description: editForm.description,
      highlights: editForm.highlights.filter(Boolean),
      productImage: editForm.productImage,
      productImages: editForm.productImages
    };

    updateStorefrontProduct(updated);
    setEditingProduct(null);
    loadCjCatalog();
  };

  const handleDeleteClick = (pid, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the storefront?`)) {
      deleteStorefrontProduct(pid);
      loadCjCatalog();
    }
  };

  const handleResetCatalog = () => {
    if (window.confirm('Reset all storefront products back to default configuration? This will clear all edits and custom imports.')) {
      resetStorefrontProducts();
      loadCjCatalog();
    }
  };

  const handleAiRewrite = async () => {
    setIsAiRewriting(true);
    setAiSuccessMessage('');
    try {
      // Pass bypassCache = true to force API call and get the upgraded copy prompt
      const res = await generateProductCopy(editForm.productName, editForm.description, editForm.pid, true);
      if (res && !res.error) {
        setEditForm(prev => ({
          ...prev,
          productName: res.title || prev.productName,
          description: res.description || prev.description,
          highlights: Array.isArray(res.highlights) && res.highlights.length > 0
            ? [...res.highlights, '', '', '', ''].slice(0, 4)
            : prev.highlights
        }));
        setAiSuccessMessage('🪄 AI copywriting applied successfully! Review below and click Save Changes.');
      } else {
        alert(`Gemini AI Rewrite failed: ${res.error || 'Check console or retry.'}`);
      }
    } catch (err) {
      console.error(err);
      alert(`AI copy generation failed: ${err.message}`);
    } finally {
      setIsAiRewriting(false);
    }
  };

  const handleBulkAiRewrite = async () => {
    if (cjCatalog.length === 0) {
      alert('No storefront products found to optimize.');
      return;
    }

    if (!window.confirm(`Are you sure you want to run AI copywriting on all ${cjCatalog.length} listed products? This will query the Gemini API to rewrite titles, descriptions, taglines, and highlights with our high-conversion format.`)) {
      return;
    }
    
    setIsBulkRewriting(true);
    setBulkProgress({ current: 0, total: cjCatalog.length, productName: '' });
    
    try {
      await bulkAiRewriteProducts((name, current, total) => {
        setBulkProgress({ current, total, productName: name });
        setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] AI Bulk Rewrite [${current}/${total}]: Optimizing "${name}"...`, ...prev]);
      });
      
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] Bulk AI rewrite of all storefront products completed successfully!`, ...prev]);
      alert('🪄 Bulk AI optimization completed successfully!');
      loadCjCatalog();
    } catch (err) {
      console.error(err);
      alert(`Bulk AI rewrite failed: ${err.message}`);
    } finally {
      setIsBulkRewriting(false);
    }
  };

  // Submit Order Creation
  const handleGenerateLinkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsGeneratingLink(true);
    try {
      const res = await createCJOrder(selectedProduct, customerData);
      if (res.success && res.cjPayUrl) {
        setGeneratedLink(res.cjPayUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingLink(false);
      updateLogs();
    }
  };

  const handleImportSPUSubmit = async (e) => {
    e.preventDefault();
    if (!importVal) return;

    const getSpuCodes = (text) => {
      if (!text) return [];
      const matches = text.match(/\b(CJ[A-Z0-9]{5,20})\b/gi) || [];
      return [...new Set(matches.map(m => m.toUpperCase()))];
    };

    const detectedSpus = getSpuCodes(importVal);
    if (detectedSpus.length === 0) {
      setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] Import Cancelled: No valid CJ SPU codes detected.`, ...prev]);
      return;
    }

    setIsImporting(true);
    setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] Starting bulk SPU import of ${detectedSpus.length} items...`, ...prev]);

    try {
      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < detectedSpus.length; i++) {
        const spu = detectedSpus[i];
        setLogMessages(prev => [`[${new Date().toLocaleTimeString()}] [${i + 1}/${detectedSpus.length}] Querying CJ for SPU: ${spu}...`, ...prev]);

        try {
          const res = await queryCJProduct(spu);
          if (res.success && res.product) {
            const formatted = await addImportedProduct(res.product);
            
            const mappedNew = {
              id: formatted.pid,
              name: formatted.productName,
              sku: formatted.productSku,
              supplierSku: formatted.productSku,
              cost: formatted.costPrice,
              price: formatted.sellPrice,
              inventory: formatted.inventory,
              provider: 'CJ Dropshipping',
              status: 'Mapped'
            };
            
            setSkus(prev => {
              const filtered = prev.filter(item => item.sku !== mappedNew.sku);
              return [...filtered, mappedNew];
            });

            setLogMessages(prev => [
              `[${new Date().toLocaleTimeString()}] [${i + 1}/${detectedSpus.length}] SPU ${spu} SUCCESS: "${formatted.name}" imported.`, 
              ...prev
            ]);
            successCount++;
          } else {
            setLogMessages(prev => [
              `[${new Date().toLocaleTimeString()}] [${i + 1}/${detectedSpus.length}] SPU ${spu} FAILED: ${res.error || 'Not found'}`, 
              ...prev
            ]);
            failedCount++;
          }
        } catch (err) {
          setLogMessages(prev => [
            `[${new Date().toLocaleTimeString()}] [${i + 1}/${detectedSpus.length}] SPU ${spu} ERROR: ${err.message}`, 
            ...prev
          ]);
          failedCount++;
        }

        // Delay 1.5 seconds between queries to strictly respect QPS limit of 1/second
        if (i < detectedSpus.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setLogMessages(prev => [
        `[${new Date().toLocaleTimeString()}] Bulk import complete! Success: ${successCount}, Failed: ${failedCount}`,
        ...prev
      ]);
      setImportVal('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const copyLandingLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopiedLanding(true);
    setTimeout(() => setCopiedLanding(false), 2000);
  };

  const copyConfirmLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/checkout/success`);
    setCopiedConfirm(true);
    setTimeout(() => setCopiedConfirm(false), 2000);
  };

  return (
    <div className="py-12 px-6 md:px-12 max-w-7xl mx-auto text-left space-y-8 font-sans bg-white">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-led-purple font-black uppercase tracking-wider">
            <Database className="h-4 w-4" />
            Supply Chain Scaffolding
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-obsidian tracking-tight">Dropshipping Admin Panel</h1>
          <div className="flex items-center gap-3">
            <p className="text-xs md:text-sm text-ash-gray font-normal max-w-xl">
              Configure CJ Dropshipping API mapping, manage live catalog queries, and create customer sale links.
            </p>
            <button onClick={onLogout} className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Lock
            </button>
          </div>
        </div>

        {/* Dynamic Sync Controls */}
        <div className="flex flex-wrap gap-2 select-none shrink-0">
          <button 
            onClick={syncAutoDSStock}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-bold font-mono text-obsidian flex items-center gap-1.5 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync AutoDS Stock
          </button>
          <button 
            onClick={syncCJDropshippingInventory}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-led-purple hover:bg-purple-600 text-xs font-bold font-mono text-white flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(139,0,255,0.4)] transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync CJ Inventory
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Tables */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
            
            {/* Table Tabs */}
            <div className="flex border-b border-slate-200 gap-4 select-none">
              <button
                onClick={() => setActiveTab('sales')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all duration-200 ${
                  activeTab === 'sales' 
                    ? 'border-emerald-500 text-obsidian' 
                    : 'border-transparent text-ash-gray hover:text-obsidian'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                Sales Tracking
              </button>

              <button
                onClick={() => setActiveTab('mappings')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all duration-200 ${
                  activeTab === 'mappings' 
                    ? 'border-led-red text-obsidian' 
                    : 'border-transparent text-ash-gray hover:text-obsidian'
                }`}
              >
                <Layers className="h-4 w-4" />
                Store SKU Mappings
              </button>
              
              <button
                onClick={() => setActiveTab('cjCatalog')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all duration-200 ${
                  activeTab === 'cjCatalog' 
                    ? 'border-led-purple text-obsidian' 
                    : 'border-transparent text-ash-gray hover:text-obsidian'
                }`}
              >
                <Database className="h-4 w-4" />
                My Products (CJ)
              </button>
            </div>

            {/* TAB 1: Sales Tracking */}
            {activeTab === 'sales' && (
              <div className="overflow-x-auto no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-ash-gray font-mono font-bold uppercase tracking-wider">
                      <th className="py-3 pr-2">Date</th>
                      <th className="py-3 px-2">Order ID</th>
                      <th className="py-3 px-2">Customer</th>
                      <th className="py-3 px-2">Total</th>
                      <th className="py-3 px-2 text-center">Items</th>
                      <th className="py-3 px-2 text-center">CJ Order ID</th>
                      <th className="py-3 pl-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesRecords.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-500 italic">No sales recorded yet.</td>
                      </tr>
                    )}
                    {salesRecords.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-2 text-slate-500 font-mono">{new Date(sale.timestamp).toLocaleDateString()}</td>
                        <td className="py-4 px-2 font-mono text-obsidian font-bold">{sale.id}</td>
                        <td className="py-4 px-2 text-slate-700">{sale.customer.fullName}</td>
                        <td className="py-4 px-2 font-mono text-emerald-600 font-bold">${sale.total.toFixed(2)}</td>
                        <td className="py-4 px-2 text-center">
                           <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                             {sale.items.length}
                           </span>
                        </td>
                        <td className="py-4 px-2 text-center font-mono text-slate-500">{sale.cjOrderId || 'N/A'}</td>
                        <td className="py-4 pl-2 text-center">
                          <span className="bg-amber-50 text-amber-600 border border-amber-200 font-bold px-2 py-0.5 rounded-full font-mono text-[10px]">
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Local Supplier SKU Mappings */}
            {activeTab === 'mappings' && (
              <div className="overflow-x-auto no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-ash-gray font-mono font-bold uppercase tracking-wider">
                      <th className="py-3 pr-2">Store Product</th>
                      <th className="py-3 px-2">Store SKU</th>
                      <th className="py-3 px-2">Supplier SKU</th>
                      <th className="py-3 px-2 text-right">Cost</th>
                      <th className="py-3 px-2 text-right">Retail</th>
                      <th className="py-3 px-2 text-center">Margin</th>
                      <th className="py-3 px-2 text-right">Inventory</th>
                      <th className="py-3 px-2 text-center">Supplier</th>
                      <th className="py-3 pl-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {skus.map((item) => {
                      const margin = ((item.price - item.cost) / item.price) * 100;
                      return (
                        <tr key={item.sku} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pr-2 font-bold text-obsidian">{item.name}</td>
                          <td className="py-4 px-2 font-mono text-slate-500">{item.sku}</td>
                          <td className="py-4 px-2 font-mono text-slate-400">{item.supplierSku}</td>
                          <td className="py-4 px-2 text-right font-mono text-slate-500">${item.cost.toFixed(2)}</td>
                          <td className="py-4 px-2 text-right font-mono text-obsidian font-bold">${item.price.toFixed(2)}</td>
                          <td className="py-4 px-2 text-center">
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full font-mono">
                              {margin.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right font-mono text-obsidian">{item.inventory.toLocaleString()}</td>
                          <td className="py-4 px-2 text-center font-bold text-ash-gray">{item.provider}</td>
                          <td className="py-4 pl-2 text-center">
                            <span className="flex items-center justify-center gap-1 text-[10px] text-emerald-600 font-bold font-mono">
                              <CheckCircle2 className="h-3 w-3" />
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: Storefront Products Catalog */}
            {activeTab === 'cjCatalog' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 border border-slate-200/60 p-4 rounded-2xl select-none">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="h-4 w-4 text-led-purple" />
                      Active Catalog Database
                    </h4>
                    <p className="text-[10px] text-ash-gray">
                      Currently managing {cjCatalog.length} active storefront product listings.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkAiRewrite}
                      disabled={isBulkRewriting}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-bold uppercase transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      {isBulkRewriting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Rewriting ({bulkProgress.current}/{bulkProgress.total})...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          Bulk AI Rewrite All Listed
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleResetCatalog}
                      disabled={isBulkRewriting}
                      className="px-3.5 py-2 rounded-xl border border-red-200 hover:bg-red-50 disabled:opacity-50 text-red-600 text-xs font-bold uppercase transition-all cursor-pointer shadow-sm"
                    >
                      Reset Catalog to Defaults
                    </button>
                  </div>
                </div>

                {isCjLoading && cjCatalog.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 text-led-purple animate-spin mx-auto" />
                    <p className="text-xs font-mono text-ash-gray">Loading catalog...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-ash-gray font-mono font-bold uppercase tracking-wider">
                          <th className="py-3 px-2 text-center">Order</th>
                          <th className="py-3 pr-2">Product</th>
                          <th className="py-3 px-2">PID</th>
                          <th className="py-3 px-2">SKU</th>
                          <th className="py-3 px-2 text-right">Cost</th>
                          <th className="py-3 px-2 text-right">Retail Price</th>
                          <th className="py-3 px-2 text-right">Strikethrough</th>
                          <th className="py-3 px-2 text-right">Stock</th>
                          <th className="py-3 px-2 text-center">Category</th>
                          <th className="py-3 pl-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cjCatalog.map((product) => {
                          const costVal = product.costPrice || product.cost || 0;
                          const sellVal = product.sellPrice || product.price || 0;
                          const origVal = product.originalPrice || sellVal * 1.4;
                          return (
                            <tr key={product.pid} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-2 text-center">
                                {product.pid !== '1798542129166426112' && (
                                  <div className="flex flex-col items-center gap-1">
                                    <button 
                                      onClick={() => handleMoveProduct(product.pid, 'up')}
                                      className="p-1 rounded text-slate-400 hover:text-led-purple hover:bg-purple-50 transition-colors"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleMoveProduct(product.pid, 'down')}
                                      className="p-1 rounded text-slate-400 hover:text-led-purple hover:bg-purple-50 transition-colors"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-4 pr-2 font-bold text-obsidian flex items-center gap-2">
                                {product.productImage && (
                                  <img 
                                    src={product.productImage} 
                                    alt="" 
                                    className="w-8 h-8 object-contain rounded border border-slate-200 bg-white"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = product.categoryName?.toLowerCase().includes('device') ? '/mask.png' : '/serum.png';
                                    }}
                                  />
                                )}
                                <span className="truncate max-w-[130px] inline-block" title={product.productName}>
                                  {product.productName}
                                </span>
                              </td>
                              <td className="py-4 px-2 font-mono text-slate-400">{product.pid}</td>
                              <td className="py-4 px-2 font-mono text-slate-500">{product.productSku}</td>
                              <td className="py-4 px-2 text-right font-mono text-slate-500">
                                ${Number(costVal).toFixed(2)}
                              </td>
                              <td className="py-4 px-2 text-right font-mono text-obsidian font-bold">
                                ${Number(sellVal).toFixed(2)}
                              </td>
                              <td className="py-4 px-2 text-right font-mono text-slate-400 line-through">
                                ${Number(origVal).toFixed(2)}
                              </td>
                              <td className="py-4 px-2 text-right font-mono text-slate-600">
                                {Number(product.inventory || 0).toLocaleString()}
                              </td>
                              <td className="py-4 px-2 text-center">
                                <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-mono text-[10px] font-medium">
                                  {product.categoryName}
                                </span>
                              </td>
                              <td className="py-4 pl-2 text-center select-none flex items-center justify-center gap-1">
                                <button
                                  onClick={() => window.open(`/product/${product.pid}`, '_blank')}
                                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold uppercase transition-all cursor-pointer"
                                  title="View on Storefront"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => handleEditClick(product)}
                                  className="px-2 py-1 rounded bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Edit Product"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(product.pid, product.productName)}
                                  className="px-2 py-1 rounded border border-red-100 hover:bg-red-50 text-red-600 text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center justify-center"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setGeneratedLink(`${window.location.origin}/product/${product.pid}`);
                                  }}
                                  className="px-2 py-1 rounded bg-led-purple hover:bg-purple-600 text-white text-[10px] font-bold uppercase transition-all shadow-sm cursor-pointer"
                                  title="Get Campaign Link"
                                >
                                  Link
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Side Panels: Authentication status & Logs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CJ API Connector */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-led-purple"></div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5">
                <Key className="h-4.5 w-4.5 text-led-purple" />
                CJ API Authentication
              </h3>
              <p className="text-[10px] text-ash-gray">Configure environment variables and token handshakes.</p>
            </div>

            {/* Config details */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 text-xs space-y-2 text-left">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Environment Key:</span>
                <span className="font-mono text-obsidian font-bold">
                  {process.env.CJ_DROP ? `Detected (Ends: ...${process.env.CJ_DROP.slice(-6)})` : 'Missing'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">API Connection:</span>
                <span className={`inline-flex items-center gap-1 font-bold ${cjToken ? 'text-emerald-600' : 'text-red-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cjToken ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                  {cjToken ? 'Authorized' : 'Disconnected'}
                </span>
              </div>
              {cjToken && (
                <>
                  <div className="flex justify-between items-start border-t border-slate-200/50 pt-2 flex-col gap-1">
                    <span className="text-slate-400">Access Token:</span>
                    <span className="font-mono text-[9px] break-all bg-white px-2 py-1 rounded border border-slate-200 text-slate-600 w-full block">
                      {cjToken}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Token Mode:</span>
                    <span className="text-slate-700 font-bold font-mono">{cjAuthMode}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Expiry (180 days):</span>
                    <span className="text-slate-500 font-mono">{new Date(cjTokenExpiry).toLocaleDateString()}</span>
                  </div>
                </>
              )}
            </div>

            {/* Authenticating trigger */}
            {cjToken ? (
              <button
                onClick={handleCjDisconnect}
                className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect CJ Integration
              </button>
            ) : (
              <button
                onClick={handleCjConnect}
                disabled={isCjLoading}
                className="w-full py-3 rounded-xl bg-led-purple hover:bg-purple-600 text-white text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-purple-500/25"
              >
                {isCjLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Requesting Access Token...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Authorize and Connect CJ
                  </>
                )}
              </button>
            )}
          </div>

          {/* Magic Bulk SPU / Page Importer */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 left-0 h-1 bg-led-red"></div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4.5 w-4.5 text-led-red" />
                Magic Bulk SPU Importer
              </h3>
              <div className="text-[10px] text-ash-gray font-normal leading-normal space-y-1">
                <p>Since the CJ API does not provide a direct endpoint to read your personal "My Products" list, you can sync them in 3 simple steps:</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1 font-medium">
                  <li>Go to your CJ Dashboard <a href="https://cjdropshipping.com/mine/products/myproducts" target="_blank" rel="noreferrer" className="text-led-purple hover:underline font-bold">My Products</a> page.</li>
                  <li>Select the whole page (press <strong>Ctrl + A</strong>) and copy (press <strong>Ctrl + C</strong>).</li>
                  <li>Paste (press <strong>Ctrl + V</strong>) the text below and click <strong>Import to Storefront</strong>. We'll extract and fetch all SPUs!</li>
                </ol>
              </div>
            </div>
            
            <form onSubmit={handleImportSPUSubmit} className="space-y-3">
              <textarea 
                required
                rows={4}
                placeholder="Paste SPU codes or raw page text here..." 
                value={importVal}
                onChange={(e) => setImportVal(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-obsidian placeholder-slate-400 focus:outline-none focus:border-led-red/50 focus:ring-1 focus:ring-led-red/20 transition-all duration-200 shadow-sm font-mono"
              />
              
              {(() => {
                const getSpuCodes = (text) => {
                  if (!text) return [];
                  const matches = text.match(/\b(CJ[A-Z0-9]{5,20})\b/gi) || [];
                  return [...new Set(matches.map(m => m.toUpperCase()))];
                };
                const detectedSpus = getSpuCodes(importVal);
                if (detectedSpus.length > 0) {
                  return (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1 text-left">
                      <div className="font-bold text-emerald-600">Detected {detectedSpus.length} SPU code(s):</div>
                      <div className="font-mono text-slate-500 break-words leading-relaxed max-h-[80px] overflow-y-auto no-scrollbar">
                        {detectedSpus.join(', ')}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <button 
                type="submit"
                disabled={isImporting}
                className="w-full py-3 rounded-xl bg-led-red hover:bg-red-600 text-xs font-black uppercase tracking-wider text-white transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-red-500/25 cursor-pointer disabled:opacity-40"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing Bulk Import...
                  </>
                ) : (
                  'Import to Storefront'
                )}
              </button>
            </form>
          </div>

          {/* Integration Log Terminal */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-obsidian uppercase tracking-wider flex items-center gap-1.5">
              <TerminalIcon className="h-4.5 w-4.5 text-led-purple" />
              API Gateway Log Console
            </h3>

            <div className="h-[200px] overflow-y-auto bg-slate-900 rounded-xl p-3.5 border border-slate-800 text-[10px] font-mono text-slate-300 text-left space-y-2 no-scrollbar shadow-inner">
              {logMessages.map((log, i) => (
                <div key={i} className="leading-relaxed border-b border-slate-800/40 pb-1.5 last:border-b-0">
                  {log}
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 text-[10px] text-ash-gray font-medium leading-normal">
              <AlertCircle className="w-4 h-4 text-led-purple shrink-0" />
              <span>API logging operates client-side inside the dropship sandbox proxy wrapper.</span>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: Generate Sale Confirmation Link Form */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (!isGeneratingLink) setSelectedProduct(null);
            }}
          ></div>

          {/* Dialog Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 max-w-lg w-full shadow-2xl relative z-10 text-left space-y-6 animate-scale-in">
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-obsidian flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-led-purple" />
                Generate Sale Confirmation Link
              </h3>
              <p className="text-xs text-ash-gray">
                Generate a live dropship invoice and fulfillment confirmation URL for the selected item.
              </p>
            </div>

            {/* Product summary in Modal */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <img 
                src={selectedProduct.productImage} 
                alt="" 
                className="w-12 h-12 object-contain bg-white rounded border border-slate-200 shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = selectedProduct.categoryName?.toLowerCase().includes('device') ? '/mask.png' : '/serum.png';
                }}
              />
              <div className="text-xs space-y-0.5">
                <h4 className="font-extrabold text-obsidian truncate max-w-[280px]">{selectedProduct.productName}</h4>
                <p className="font-mono text-slate-400">PID: {selectedProduct.pid}</p>
                <p className="font-bold text-led-purple">Retail Price: ${Number(selectedProduct.sellPrice || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* URL Output */}
            {generatedLink ? (
              <div className="space-y-5">
                {/* Landing page link */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-ash-gray uppercase font-mono font-black">1. Ad Landing Page URL (Product Detail Page)</span>
                    <span className="text-[10px] text-emerald-600 font-mono font-medium">Use as campaign website URL</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedLink}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[10px] font-mono text-slate-600 focus:outline-none"
                    />
                    <button
                      onClick={copyLandingLink}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-obsidian flex items-center justify-center transition-all animate-fade-in"
                      title="Copy to Clipboard"
                    >
                      {copiedLanding ? <Check className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sales confirmation/success page link */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-ash-gray uppercase font-mono font-black">2. Sales Confirmation URL (Thank You Page)</span>
                    <span className="text-[10px] text-led-purple font-mono font-medium">Use to confirm conversions & verify events</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/checkout/success`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[10px] font-mono text-slate-600 focus:outline-none"
                    />
                    <button
                      onClick={copyConfirmLink}
                      className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-obsidian flex items-center justify-center transition-all animate-fade-in"
                      title="Copy to Clipboard"
                    >
                      {copiedConfirm ? <Check className="w-4 h-4 text-emerald-600" /> : <Clipboard className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-[10px] text-ash-gray font-normal leading-relaxed space-y-1">
                  <p className="font-bold text-obsidian flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ad Tracking Event Pipeline Active
                  </p>
                  <p>When a client finishes paying via PayPal or Card, the store triggers a redirect to the <strong>Sales Confirmation URL</strong>, immediately pinging the active Meta Pixel and Google Ads conversion events.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      if (generatedLink.startsWith('http')) {
                        window.open(generatedLink, '_blank');
                      } else {
                        window.open(generatedLink, '_blank');
                      }
                    }}
                    className="flex-1 py-3 rounded-xl bg-led-purple hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-purple-500/10"
                  >
                    Open Product Page
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-obsidian text-xs font-bold uppercase transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* MODAL: Edit Product Form */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 transition-opacity"
            onClick={() => {
              if (!isAiRewriting) setEditingProduct(null);
            }}
          ></div>

          {/* Dialog Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 max-w-2xl w-full shadow-2xl relative z-10 text-left space-y-6 animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-obsidian flex items-center gap-2">
                  <Edit className="h-5.5 w-5.5 text-led-purple" />
                  Edit Catalog Product
                </h3>
                <p className="text-xs text-ash-gray">
                  Modify pricing, inventory stock, images, copy, and apply high-conversion AI enhancements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={isAiRewriting}
                className="p-1 rounded-lg text-ash-gray hover:text-obsidian hover:bg-slate-50 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {aiSuccessMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleEditFormSubmit} className="space-y-6">
              
              {/* Product Info Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Product Title</label>
                  <input
                    type="text"
                    name="productName"
                    required
                    value={editForm.productName}
                    onChange={handleEditFormChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-obsidian font-bold focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select
                    name="categoryName"
                    value={editForm.categoryName}
                    onChange={handleEditFormChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm"
                  >
                    <option value="LED Devices">LED Devices</option>
                    <option value="Serums & Patches">Serums & Patches</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory / Stock</label>
                  <input
                    type="number"
                    name="inventory"
                    required
                    value={editForm.inventory}
                    onChange={handleEditFormChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Retail Sell Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="sellPrice"
                    required
                    value={editForm.sellPrice}
                    onChange={handleEditFormChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Original Price (Strikethrough) ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="originalPrice"
                    required
                    value={editForm.originalPrice}
                    onChange={handleEditFormChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm font-mono text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Wholesale Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="costPrice"
                    required
                    value={editForm.costPrice}
                    onChange={handleEditFormChange}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm font-mono text-slate-500"
                  />
                </div>
              </div>

              {/* Description & AI Rewrite Button */}
              <div className="space-y-2">
                <div className="flex justify-between items-end select-none">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Product Description</label>
                  <button
                    type="button"
                    onClick={handleAiRewrite}
                    disabled={isAiRewriting}
                    className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-100 text-led-purple text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all disabled:opacity-40"
                  >
                    {isAiRewriting ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Generating Suggestion...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" />
                        AI Rewrite Copy
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm leading-relaxed"
                />
              </div>

              {/* Highlights List */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Highlights / Features (Exactly 4)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editForm.highlights.map((h, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-[10px] font-bold text-slate-400 font-mono w-4">{i + 1}.</span>
                      <input
                        type="text"
                        required
                        value={h}
                        onChange={(e) => handleHighlightChange(i, e.target.value)}
                        placeholder={`Feature highlight ${i + 1}`}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Image List Management */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <ImageIcon className="w-4 h-4 text-led-purple" />
                  Product Image Gallery
                </label>

                {/* Add new image */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Enter image URL to append..."
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-obsidian focus:outline-none focus:border-led-purple/50 focus:ring-1 focus:ring-led-purple/20 shadow-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-obsidian text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>

                {/* Thumbnails grid */}
                {editForm.productImages.length === 0 ? (
                  <p className="text-[10px] text-red-500 font-bold italic">No images in gallery. Provide at least one image.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200/60 p-3 rounded-2xl">
                    {editForm.productImages.map((imgUrl, idx) => {
                      const isMain = editForm.productImage === imgUrl;
                      return (
                        <div key={idx} className="relative rounded-xl border border-slate-200 bg-white p-2 flex flex-col items-center justify-between group/img">
                          <div className="w-14 h-14 relative flex items-center justify-center">
                            <img
                              src={imgUrl}
                              alt=""
                              className="w-14 h-14 object-contain rounded"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/mask.png';
                              }}
                            />
                          </div>
                          <div className="flex flex-col gap-1 w-full pt-2 select-none">
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(imgUrl)}
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                                isMain 
                                  ? 'bg-led-purple text-white border-led-purple' 
                                  : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                            >
                              {isMain ? 'Main' : 'Set Main'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(imgUrl)}
                              className="text-[9px] font-bold text-red-600 bg-white hover:bg-red-50 px-1.5 py-0.5 rounded border border-slate-200 hover:border-red-100 transition-all cursor-pointer"
                              title="Delete Image"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 select-none">
                <button
                  type="submit"
                  disabled={isAiRewriting || editForm.productImages.length === 0}
                  className="flex-1 py-3 rounded-xl bg-led-purple hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-purple-500/25 cursor-pointer disabled:opacity-40"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  disabled={isAiRewriting}
                  className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-obsidian text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
