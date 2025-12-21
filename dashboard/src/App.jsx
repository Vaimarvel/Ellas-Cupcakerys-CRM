import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
import './App.css';
import MenuInventory from './components/MenuInventory';
import OrdersList from './components/OrdersList';
import Sidebar from './components/Sidebar';
import FeedbackWidget from './components/FeedbackWidget';
import CustomerLanding from './customer/CustomerLanding';
import Customers from './components/Customers';
import Settings from './components/Settings';

function App() {
  // Check URL params for mode
  const urlParams = new URLSearchParams(window.location.search);
  const adminMode = urlParams.get('mode') === 'admin';

  // State to toggle between Admin Dashboard and Customer View
  const [viewMode, setViewMode] = useState(() => {
    if (adminMode) return 'admin';
    // Force customer view by default if no params, ignoring stuck localStorage for now to fix user issue
    return 'customer';
  });

  const [activeTab, setActiveTab] = useState('menu'); // Dashboard active tab
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const toggleView = () => {
    setViewMode(prev => prev === 'admin' ? 'customer' : 'admin');
  };

  // --- Render Customer View ---
  if (viewMode === 'customer') {
    return (
      <CustomerLanding onAdminAccess={toggleView} />
    );
  }

  // --- Render Admin Dashboard ---
  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="content">
        {/* --- VENDOR NOTIFICATION BAR --- */}
        <NotificationBar />

        <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem' }}>
              {activeTab === 'menu' && 'Menu & Inventory'}
              {activeTab === 'orders' && 'Order Fulfillment'}
              {activeTab === 'feedback' && 'Customer Feedback'}
              {activeTab === 'customers' && 'Customer Database'}
              {activeTab === 'dashboard' && 'Overview'}
            </h1>
            <p style={{ opacity: 0.6 }}>Manage your store operations efficiently.</p>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>VIEW MODE</div>
              <button
                onClick={toggleView}
                style={{
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--color-primary)',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  cursor: 'pointer'
                }}
              >
                Switch to Customer
              </button>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>STATUS</div>
              <div style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>● ONLINE</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Theme</div>
              <div
                className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Dark' : 'Light'}
              >
                <div className="toggle-switch-handle"></div>
              </div>
            </div>
          </div>
        </header>



        {activeTab === 'menu' && <MenuInventory />}
        {activeTab === 'orders' && <OrdersList />}
        {activeTab === 'feedback' && <FeedbackWidget />}
        {activeTab === 'customers' && <Customers />}
        {activeTab === 'settings' && <Settings />}

        {/* Simplified Dashboard View for now */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <FeedbackWidget />
            <div className="widget-card">
              <h3>Analytics Placeholder</h3>
              <p style={{ opacity: 0.6, marginTop: '20px' }}>Charts for Top Products and Loyalty Tiers would go here.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Internal Notification Component
function NotificationBar() {
  const [alerts, setAlerts] = useState(0);
  const [prevAlerts, setPrevAlerts] = useState(0);
  const audioRef = React.useRef(null);

  useEffect(() => {
    const check = () => {
      fetch(`${API_BASE}/api/data/orders`)
        .then(res => res.json())
        .then(data => {
          if (!data) return;
          // Alert on: Payment Claims OR New Pending Orders
          const alertsList = Object.values(data).filter(o =>
            o.payment_status === 'Customer Claimed Paid' ||
            (o.status === 'Pending Payment' && o.payment_status !== 'Paid')
          );
          setAlerts(alertsList.length);
        }).catch(() => { });
    };
    const i = setInterval(check, 3000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (alerts > prevAlerts && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setPrevAlerts(alerts);
  }, [alerts, prevAlerts]);

  if (alerts === 0) return null;

  return (
    <div style={{
      background: '#ff4081',
      color: 'white',
      padding: '10px',
      textAlign: 'center',
      fontWeight: 'bold',
      marginBottom: '20px',
      borderRadius: '8px',
      animation: 'pulse 1.5s infinite',
      boxShadow: '0 0 10px #ff4081'
    }}>
      🔔 {alerts} CUSTOMER(S) CLAIMED PAYMENT! CHECK ORDERS!
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=" />
    </div>
  );
}

export default App;
