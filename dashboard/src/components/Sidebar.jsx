import React from 'react';

const Sidebar = ({ activeTab, onTabChange }) => {
    const links = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'menu', label: 'Menu & Inventory', icon: '🧁' },
        { id: 'orders', label: 'Order Fulfillment', icon: '📋' },
        { id: 'customers', label: 'Customers', icon: '👥' },
        { id: 'feedback', label: 'Feedback', icon: '💬', hasAlert: true } // Hardcoded alert for demo
    ];

    return (
        <div className="sidebar">
            <div style={{ padding: '0 12px 20px', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>ELLAS DASH</h2>
                <p style={{ fontSize: '0.8rem', opacity: 0.5 }}>v1.0.0 Internal</p>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {links.map((link) => (
                    <div
                        key={link.id}
                        className={`nav-item ${activeTab === link.id ? 'active' : ''}`}
                        onClick={() => onTabChange(link.id)}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="icon">{link.icon}</span> {link.label}
                        </span>
                        {link.hasAlert && <span className="badge badge-danger">!</span>}
                    </div>
                ))}
            </nav>

            <div style={{ marginTop: 'auto' }}>
                <button
                    className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => onTabChange('settings')}
                    style={{ background: 'none', border: 'none', width: '100%' }}
                >
                    <span>⚙️ Settings</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
