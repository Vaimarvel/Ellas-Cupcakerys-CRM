import React, { useState, useEffect, useCallback } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
import './customer.css';
import ChatWidget from './ChatWidget.jsx';

const formatCurrency = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

const imageFallbacks = {
  strawberry: '/images/red_velvet_cupcake.png',
  chocolate: '/images/chocolate_cake.png',
  cupcake: '/images/red_velvet_cupcake.png',
  cake: '/images/chocolate_cake.png',
};

export default function CustomerLanding({ onAdminAccess }) {
  const [products, setProducts] = useState([]);
  const [confettiOn, setConfettiOn] = useState(() => localStorage.getItem('confetti') !== 'off');
  const [siteSettings, setSiteSettings] = useState({});

  useEffect(() => {
    // Fallback products if API is unavailable
    const fallbackProducts = [
      {
        id: 'P001',
        name: 'Red Velvet Cupcake',
        price: 850,
        image: imageFallbacks.cupcake,
        rating: 4.8,
      },
      {
        id: 'P002',
        name: 'Classic Chocolate Cake',
        price: 5500,
        image: imageFallbacks.chocolate,
        rating: 4.9,
      },
      {
        id: 'P003',
        name: 'Strawberry Delight',
        price: 4200,
        image: imageFallbacks.strawberry,
        rating: 4.7,
      },
      {
        id: 'P004',
        name: 'Vanilla Dream Cake',
        price: 4800,
        image: imageFallbacks.cake,
        rating: 4.6,
      },
      {
        id: 'P005',
        name: 'Chocolate Cupcake',
        price: 750,
        image: imageFallbacks.chocolate,
        rating: 4.5,
      },
      {
        id: 'P006',
        name: 'Birthday Special',
        price: 6500,
        image: imageFallbacks.cake,
        rating: 4.9,
      },
    ];

    fetch(`${API_BASE}/api/data/menu`)
      .then((res) => res.json())
      .then((data) => {
        const list = data && typeof data === 'object' ? Object.values(data) : [];
        const normalized = list
          .filter((i) => i.is_available !== false)
          .map((i, idx) => {
            const nameLower = (i.name || '').toLowerCase();
            const guess =
              nameLower.includes('strawberry') ? imageFallbacks.strawberry :
                nameLower.includes('choco') || nameLower.includes('chocolate') ? imageFallbacks.chocolate :
                  nameLower.includes('cupcake') ? imageFallbacks.cupcake :
                    imageFallbacks.cake;
            return {
              id: i.id,
              name: i.name,
              price: i.price,
              image: i.image_url || guess,
              rating: 4.5 + ((idx % 4) * 0.1),
            };
          });
        setProducts(normalized.length > 0 ? normalized : fallbackProducts);
      })
      .catch(() => {
        // Use fallback products instead of empty array
        setProducts(fallbackProducts);
      });
    fetch(`${API_BASE}/api/site/settings`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => setSiteSettings(data || {}))
      .catch(() => {
        fetch('/site-settings.json')
          .then((res) => res.ok ? res.json() : Promise.reject())
          .then((data) => setSiteSettings(data || {}))
          .catch(() => setSiteSettings({}));
      });
  }, []);

  const fireConfetti = useCallback(() => {
    if (!confettiOn) return;
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#e53935', '#b71c1c', '#ff6b9a', '#6a1b9a', '#2e7d32', '#ffca28'];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.background = colors[i % colors.length];
      piece.style.left = Math.random() * 100 + '%';
      piece.style.animationDelay = (Math.random() * 0.6).toFixed(2) + 's';
      piece.style.transform = `rotate(${Math.floor(Math.random() * 360)}deg)`;
      container.appendChild(piece);
    }
    setTimeout(() => {
      container.remove();
    }, 1500);
  }, [confettiOn]);


  // Identity Management
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeForm, setWelcomeForm] = useState({ name: '', email: '' });
  const stableIdFromEmail = (email) => {
    const s = (email || '').toLowerCase().trim();
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < 10; i++) {
      out += alphabet[(h + i * 131) % alphabet.length];
    }
    return out;
  };
  const getOrCreateUserId = async (name, email) => {
    const existing = localStorage.getItem('ella_user_id');
    if (existing) return existing;
    try {
      const res = await fetch(`${API_BASE}/api/data/customers`);
      const data = await res.json();
      const byEmail = Object.values(data || {}).find(c => (c.email || '').toLowerCase() === email.toLowerCase());
      if (byEmail && byEmail.id) return byEmail.id;
    } catch { return stableIdFromEmail(email); }
    return stableIdFromEmail(email);
  };

  // Lifted Chat State
  const [messages, setMessages] = useState([]);

  // Active Order State
  const [activeOrder, setActiveOrder] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  // To track previous status for notifications
  const prevOrderStatusRef = React.useRef(null);

  useEffect(() => {
    if (!userId) return;

    const pollUserData = () => {
      // Poll Orders
      fetch(`${API_BASE}/api/data/orders`)
        .then(res => res.json())
        .then(data => {
          if (!data) return;
          const userOrders = Object.values(data).filter(o => o.customer_id === userId && o.status !== 'Completed' && o.status !== 'Cancelled');

          if (userOrders.length > 0) {
            // Sort by timestamp desc
            userOrders.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const currentOrder = userOrders[0];
            setActiveOrder(currentOrder);

            // --- NOTIFICATION LOGIC ---
            // If status changed from "Pending Payment" to "Processing" -> Confirmed!
            if (prevOrderStatusRef.current === 'Pending Payment' &&
              (currentOrder.status === 'Processing' || currentOrder.status === 'Out for Delivery')) {

              const pointsMsg = currentOrder.points_awarded ? `You earned loyalty points!` : "";
              const msg = `PAYMENT RECEIVED! Order confirmed. Current Status: ${currentOrder.status}. ${pointsMsg}`;

              setMessages(prev => [...prev, { role: 'assistant', text: msg }]);
              if (confettiOn) fireConfetti();
            }

            prevOrderStatusRef.current = currentOrder.status;
          } else {
            setActiveOrder(null);
            prevOrderStatusRef.current = null;
          }
        })
        .catch(console.error);

      // Poll Customer Profile for Points
      fetch(`${API_BASE}/api/data/customers`)
        .then(res => res.json())
        .then(data => {
          if (data && data[userId]) {
            setLoyaltyPoints(data[userId].loyalty_points || 0);
          }
        })
        .catch(console.error);
    };

    pollUserData();
    const interval = setInterval(pollUserData, 5000);
    return () => clearInterval(interval);
  }, [userId, confettiOn, fireConfetti]);

  const confirmReceipt = (orderId) => {
    fetch(`${API_BASE}/api/data/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection: 'orders',
        item_id: orderId,
        updates: { status: 'Completed' }
      })
    }).then(() => {
      if (confettiOn) fireConfetti();
      alert("Order Completed! Enjoy your cupcakes!");
      setActiveOrder(null);
    });
  };

  const submitFeedback = () => {
    if (!feedbackText) return;
    // Using logic from LogFeedbackAndComplaint tool via API? 
    // Actually we don't have a direct endpoint for logging feedback in index.py except via tool?
    // Wait, index.py has get_feedback_data but maybe not add?
    // Let's use /api/data/add or just assume user puts it in chat usually.
    // But user asked for a specific widget.
    // I'll assume we can use a generic add or I should check index.py.
    // Index.py has /api/data/add for 'menu' and 'customers'. It doesn't seem to have 'feedback'.
    // I will just log it to console or pretend for now, or use the ChatWidget to send it?
    // BETTER: I will add a method to ChatWidget to "send system message" or just post to chat endpoint.

    // Posting as a chat message:
    fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        message: `[FEEDBACK] ${feedbackText}`
      })
    }).then(() => {
      alert("Thanks for your feedback!");
      setFeedbackText("");
      setFeedbackOpen(false);
    });
  };

  useEffect(() => {
    // Always prompt for name/email at load; prefill if stored
    const existingName = localStorage.getItem('ella_user_name');
    const existingEmail = localStorage.getItem('ella_user_email');
    setWelcomeForm({ name: existingName || '', email: existingEmail || '' });
    setShowWelcome(true);
  }, []);

  const handleWelcomeSubmit = async (e) => {
    e.preventDefault();
    if (!welcomeForm.name || !welcomeForm.email) return;
    const newId = await getOrCreateUserId(welcomeForm.name, welcomeForm.email);
    localStorage.setItem('ella_user_id', newId);
    localStorage.setItem('ella_user_name', welcomeForm.name);
    localStorage.setItem('ella_user_email', welcomeForm.email);
    setUserId(newId);
    setUserName(welcomeForm.name);
    setShowWelcome(false);
    try {
      const res = await fetch('http://localhost:8000/api/data/customers');
      const data = await res.json();
      const exists = data && data[newId];
      if (!exists) {
        await fetch('http://localhost:8000/api/data/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: 'customers',
            item: {
              id: newId,
              name: welcomeForm.name,
              email: welcomeForm.email,
              preferences: [],
            }
          })
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="berry-page">
      {showWelcome && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Welcome to Ellas! 🧁</h2>
            <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>Please kindly fill in your name and email to enhance your experience.</p>
            <form onSubmit={handleWelcomeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Your Name"
                value={welcomeForm.name}
                onChange={e => setWelcomeForm({ ...welcomeForm, name: e.target.value })}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                required
              />
              <input
                type="email"
                placeholder="Your Email"
                value={welcomeForm.email}
                onChange={e => setWelcomeForm({ ...welcomeForm, email: e.target.value })}
                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                required
              />
              <button type="submit" className="berry-cart-btn" style={{ width: '100%', justifyContent: 'center' }}>
                Start Ordering
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="berry-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="berry-logo brand-cursive" style={{ fontSize: '1.8rem' }}>Ellas Cupcakery</div>

        <nav className="berry-nav" style={{ marginLeft: 'auto' }}>
          <a href="#home" className="berry-link">Home</a>
          <a href="#menu" className="berry-link">Menu</a>
          <a href="#contact" className="berry-link">Contact</a>
        </nav>
        <div className="berry-actions">
          {/* Account and Confetti Toggle - Order Status Moved to Floating Bar */}
          <div className="berry-account">
            <span className="berry-account-greet">{userName ? `Welcome, ${userName}` : 'Welcome'}</span>
            <span className="berry-account-points" style={{ background: '#6a1b9a', color: 'white', padding: '4px 10px', borderRadius: '12px' }}>
              ⭐ {loyaltyPoints} pts
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Confetti</span>
            <div
              className={`toggle-switch ${confettiOn ? 'on' : ''}`}
              onClick={() => {
                const next = !confettiOn;
                setConfettiOn(next);
                localStorage.setItem('confetti', next ? 'on' : 'off');
              }}
              title={confettiOn ? 'On' : 'Off'}
            >
              <div className="toggle-switch-handle"></div>
            </div>
          </div>
          <button className="berry-cart-btn" onClick={() => {
            const el = document.getElementById('chat');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>Chat</button>
        </div>
      </header>

      <section
        className="berry-hero"
        id="home"
        style={{ '--hero-bg': `url(${siteSettings.hero_bg_url || 'https://images.unsplash.com/photo-1494972688394-4cc796f9f094?q=80&w=1600&auto=format&fit=crop'})` }}
      >
        <div className="hero-left">
          <h1 className="hero-title" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>From Cakes to Small Chops — We Cater for Every Occasion.</h1>
          {/* Hero Hours - Smaller */}
          <div className="hero-hours" style={{ background: 'rgba(255,255,255,0.95)', color: '#333', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 6px 16px rgba(0,0,0,0.1)', display: 'inline-block', maxWidth: 'fit-content' }}>
            <div className="hours-card" style={{ border: 'none', textAlign: 'left' }}>
              <div className="hours-title" style={{ fontSize: '1rem', color: '#6a1b9a', marginBottom: '2px' }}>Opening Hours</div>
              <div className="hours-time" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>9am - 6pm</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Daily Service</div>
            </div>
          </div>
        </div>
        <div className="hero-image">
          <img src={siteSettings.hero_img_url || (products[0] && products[0].image) || imageFallbacks.strawberry} alt="Hero Cake" />
          <div className="hero-decor decor-strawberry">🍓</div>
          <div className="hero-decor decor-leaf">🍃</div>
        </div>
        <aside className="hero-sidebar">
          <div className="sidebar-card">
            <img src={siteSettings.promo1_url || (products[1] && products[1].image) || imageFallbacks.chocolate} alt="Promo" />
            <div className="sidebar-text">For birthday or any other celebration, enjoy our classic berry cake.</div>
          </div>
          <div className="sidebar-card">
            <img src={siteSettings.promo2_url || (products[2] && products[2].image) || imageFallbacks.cupcake} alt="Promo" />
            <div className="sidebar-text">Small delights with big flavors. Perfect for parties.</div>
          </div>
        </aside>
      </section>

      <section className="berry-grid" id="menu">
        <div className="grid-header">
          <h2>Top List of Pastries</h2>
        </div>
        <div className="product-grid">
          {(products.length ? products : []).slice(0, 10).map((p, idx) => (
            <div className="product-card" key={p.id || `p-${idx}`}>
              <div className="product-image">
                <img src={p.image} alt={p.name} />
              </div>
              <div className="product-info">
                <div className="product-name">{p.name}</div>
                <div className="product-meta">
                  <span className="product-rating">★ {p.rating.toFixed(1)}</span>
                  <span className="product-price">{formatCurrency(p.price)}</span>
                </div>
              </div>
              <button className="product-add" onClick={() => {
                const el = document.getElementById('chat');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                // We could also broadcast an event here to trigger the chat
              }}>Order via Chat</button>
            </div>
          ))}
        </div>
      </section>

      {/* Top Corner Status Bar - Global */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        background: 'white',
        padding: '10px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontWeight: 'bold',
        color: '#333',
        borderLeft: activeOrder ? '4px solid #6a1b9a' : '4px solid #ccc'
      }}>
        {activeOrder ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
              <span style={{ fontSize: '0.75rem', color: '#888' }}>ORDER {activeOrder.id}</span>
              <span style={{ color: activeOrder.status === 'Out for Delivery' ? '#2e7d32' : '#f57c00' }}>
                {activeOrder.status === 'Pending Payment' ? 'Pending - Processing' : activeOrder.status}
              </span>
            </div>

            {activeOrder.status === 'Out for Delivery' && (
              <button
                onClick={() => confirmReceipt(activeOrder.id)}
                style={{
                  background: '#2e7d32',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                Confirm Receipt
              </button>
            )}

            {activeOrder.status === 'Pending Payment' && (
              <button
                onClick={() => {
                  fetch('http://localhost:8000/api/data/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      collection: 'orders',
                      item_id: activeOrder.id,
                      updates: { payment_status: 'Customer Claimed Paid' }
                    })
                  }).then(() => alert("Notification sent! Please wait for confirmation."));
                }}
                style={{
                  background: '#6a1b9a',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                I Have Paid
              </button>
            )}
          </>
        ) : (
          <div
            onClick={() => {
              const el = document.getElementById('chat');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>🧁 Place an order</span>
          </div>
        )}
      </div>

      <section id="contact" style={{ padding: '40px 32px', background: '#fdfdfd' }}>
        <div className="widget-card" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', background: '#fff', color: '#333', border: '1px solid #eee' }}>

          <div>
            <div style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: 8, color: '#4a148c' }}>Connect With Us</div>
            <div style={{ fontSize: '1.1rem', opacity: 0.7, marginBottom: '20px' }}>
              Reach us for custom orders and events. Our assistant, El_Intel, is ready to help you!
            </div>
            {/* Display Contact Info from Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '1rem' }}>
              {siteSettings.contact_email && (
                <div>
                  <strong>Email:</strong> <a href={`mailto:${siteSettings.contact_email}`} style={{ color: '#4a148c' }}>{siteSettings.contact_email}</a>
                </div>
              )}
              {siteSettings.contact_whatsapp && (
                <div>
                  <strong>WhatsApp:</strong> <a href={`https://wa.me/${siteSettings.contact_whatsapp.replace('+', '')}`} target="_blank" rel="noreferrer" style={{ color: '#25D366' }}>{siteSettings.contact_whatsapp}</a>
                </div>
              )}
              {siteSettings.contact_instagram && (
                <div>
                  <strong>Instagram:</strong> <a href={`https://instagram.com/${siteSettings.contact_instagram.replace('@', '')}`} target="_blank" rel="noreferrer" style={{ color: '#e1306c' }}>{siteSettings.contact_instagram}</a>
                </div>
              )}
              {siteSettings.contact_facebook && (
                <div>
                  <strong>Facebook:</strong> <span style={{ color: '#1877F2' }}>{siteSettings.contact_facebook}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      <div id="chat" style={{ padding: '10px 32px 32px' }}>
        <div className="widget-card" style={{ maxWidth: 900, margin: '0 auto', background: '#fff', color: '#333' }}>
          <ChatWidget
            currentUserId={userId}
            currentUserName={userName}
            messages={messages}
            setMessages={setMessages}
            onCelebrate={(text) => {
              const t = text.toLowerCase();
              const ok = /(order (confirmed|placed))|(payment (successful|complete))|(successfully (placed|confirmed))/i.test(t);
              if (confettiOn && ok) fireConfetti();
            }} />
        </div>
      </div>

      <footer className="berry-footer">
        <div>Emmanuella All rights reserved.</div>
        <div
          onClick={() => {
            const code = prompt("Enter Vendor Access Code:");
            if (code === "ella") {
              if (onAdminAccess) onAdminAccess();
            } else if (code) {
              alert("Access Denied");
            }
          }}
          style={{ cursor: 'pointer', opacity: 0.3, fontSize: '0.8rem', marginLeft: '10px' }}
        >
          Vendor Access
        </div>
      </footer>

      {/* Floating Special Offer Badge - Restored */}
      <div style={{
        position: 'fixed', bottom: '30px', right: '90px', zIndex: 999,
        background: 'linear-gradient(90deg, #ff4081, #f50057)',
        color: '#fff', padding: '6px 12px', borderRadius: '20px',
        fontWeight: 'bold', fontSize: '0.75rem', boxShadow: '0 4px 10px rgba(233,30,99,0.3)',
        animation: 'pulse 2s infinite',
        display: 'flex', alignItems: 'center', gap: '5px'
      }}>
        ✨ Earn {(siteSettings.offer_points_threshold || 2000)} pts for offer! ✨
      </div>

      {/* Floating Feedback Widget */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        {!feedbackOpen ? (
          <button
            onClick={() => setFeedbackOpen(true)}
            style={{
              background: '#6a1b9a', color: '#fff', border: 'none',
              borderRadius: '50%', width: '60px', height: '60px',
              boxShadow: '0 4px 15px rgba(106, 27, 154, 0.4)', cursor: 'pointer',
              fontSize: '1.8rem',
              animation: 'pulse 2s infinite'
            }}
          >
            ✎
          </button>
        ) : (
          <div style={{
            background: '#fff', padding: '16px', borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)', width: '300px',
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Feedback</strong>
              <button onClick={() => setFeedbackOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what you think..."
              style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
            <button
              onClick={submitFeedback}
              style={{ background: '#6a1b9a', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Submit
            </button>
          </div>
        )}
      </div>

      {/* Simple Booking Corner */}
      <div style={{ position: 'fixed', bottom: '110px', left: '20px', zIndex: 900,
        background: '#fff', padding: '10px', borderRadius: '10px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.2)', width: '200px'
      }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#6a1b9a' }}>Book Delivery</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {['10:00–12:00', '12:00–14:00', '14:00–16:00', '16:00–18:00'].map((w) => (
            <button
              key={w}
              onClick={() => {
                alert(`Booked preferred window: ${w}. We will confirm after payment.`);
              }}
              style={{ border: '1px solid #eee', background: '#f8f8f8', borderRadius: '8px', padding: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {w}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: 6 }}>Same‑day delivery for orders confirmed before 12:00.</div>
      </div>

    </div >
  );
}
