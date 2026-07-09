import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, User, Mail, Phone, LogOut, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';

export default function Profile() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (token) {
      fetch('/api/profile/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOrders(data.orders);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingOrders(false));
    }
  }, [token]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getStatusColor = (status) => {
    const s = status.toLowerCase();
    if (s.includes('pending') || s.includes('processing')) return 'bg-amber-50 text-amber-600 border-amber-200';
    if (s.includes('dispatch') || s.includes('shipped')) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (s.includes('delivered') || s.includes('complete')) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    return 'bg-zinc-50 text-zinc-600 border-zinc-200';
  };

  const getStatusIcon = (status) => {
    const s = status.toLowerCase();
    if (s.includes('delivered') || s.includes('complete')) return <CheckCircle2 className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-zinc-50 pt-8 pb-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200">
          <div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-2">My Profile</h1>
            <p className="text-zinc-500 font-medium">Manage your account and view order history</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-700 font-bold rounded-xl border border-zinc-200 hover:bg-zinc-100 transition-colors self-start md:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User Details Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-8">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <User className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-6">Account Details</h2>
              
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Full Name</p>
                    <p className="text-zinc-900 font-medium">{user.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Email Address</p>
                    <p className="text-zinc-900 font-medium">{user.email}</p>
                  </div>
                </div>

                {user.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-50 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Phone Number</p>
                      <p className="text-zinc-900 font-medium">{user.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Orders Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-100 p-8 min-h-[400px]">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-zinc-50 text-zinc-600 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900">Order History</h2>
              </div>

              {loadingOrders ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <div className="w-8 h-8 border-4 border-zinc-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
                  <p className="font-medium">Loading your orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-zinc-50 rounded-2xl border border-zinc-100 border-dashed">
                  <Package className="w-12 h-12 text-zinc-300 mb-4" />
                  <h3 className="text-lg font-bold text-zinc-700 mb-2">No orders yet</h3>
                  <p className="text-zinc-500 max-w-sm">When you make a purchase, your orders will appear here automatically.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-zinc-100 rounded-2xl overflow-hidden hover:border-zinc-200 hover:shadow-md transition-all duration-300">
                      
                      {/* Order Header */}
                      <div className="bg-zinc-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono font-bold text-zinc-900">{order.orderNumber}</span>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 font-medium">
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Total</p>
                          <p className="text-lg font-black text-zinc-900">${order.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="p-6">
                        <div className="space-y-4">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm font-medium">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-600 flex items-center justify-center text-xs">{item.quantity}x</span>
                                <span className="text-zinc-700">{item.name}</span>
                              </div>
                              <span className="text-zinc-900">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Support Action */}
                        <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-end">
                          <a 
                            href={`mailto:support@lumively.com?subject=Support Request for Order ${order.orderNumber}&body=Hello Support Team,%0D%0A%0D%0AI need help with my order ${order.orderNumber}.%0D%0A%0D%0A`}
                            className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors"
                          >
                            <span>Contact Support</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
