import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/api/data/customers`)
            .then(res => res.json())
            .then(data => {
                const list = data && typeof data === 'object' ? Object.values(data) : [];
                setCustomers(list);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch customers:", err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div>Loading Customers...</div>;

    return (
        <div>
            <h2>Customers</h2>
            <div className="widget-card">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Loyalty Points</th>
                            <th>Last Order</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map((cust, idx) => (
                            <tr key={cust.id || idx}>
                                <td style={{ fontFamily: 'monospace', opacity: 0.6 }}>{cust.id}</td>
                                <td style={{ fontWeight: 500 }}>{cust.name || 'Anonymous'}</td>
                                <td>{cust.email || '-'}</td>
                                <td>
                                    <span style={{
                                        padding: '4px 8px',
                                        background: 'var(--color-primary-light)',
                                        color: 'var(--color-primary)',
                                        borderRadius: '12px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}>
                                        {cust.loyalty_points || 0} pts
                                    </span>
                                </td>
                                <td style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                                    {cust.last_order_date ? new Date(cust.last_order_date).toLocaleDateString() : 'Never'}
                                </td>
                            </tr>
                        ))}
                        {customers.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No customers found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Customers;
