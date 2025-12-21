import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const OrdersList = () => {
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, customersRes] = await Promise.all([
                fetch(`${API_BASE}/api/data/orders`),
                fetch(`${API_BASE}/api/data/customers`)
            ]);

            const ordersData = await ordersRes.json();
            const customersData = await customersRes.json();

            setOrders(ordersData ? Object.values(ordersData) : []);
            setCustomers(customersData || {});
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, updates) => {
        // Optimistic update
        setOrders(orders.map(o => o.id === orderId ? { ...o, ...updates } : o));

        try {
            await fetch(`${API_BASE}/api/data/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: 'orders',
                    item_id: orderId,
                    updates: updates
                })
            });
            fetchData(); // Refresh to be sure
        } catch (err) {
            console.error("Failed to update order:", err);
        }
    };

    if (loading) return <div>Loading Orders...</div>;

    // Sort orders by timestamp descending (newest first)
    const sortedOrders = [...orders].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
        <div>
            <style>
                {`
                @keyframes pulse-row {
                    0% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); z-index: 1; }
                    50% { transform: scale(1.02); box-shadow: 0 8px 30px rgba(106, 27, 154, 0.3); z-index: 2; background: #f3e5f5; }
                    100% { transform: scale(1); box-shadow: 0 0 0 rgba(0,0,0,0); z-index: 1; }
                }
                .payment-claim-row {
                    animation: pulse-row 2s infinite;
                    position: relative; 
                    transition: all 0.3s ease;
                }
            `}
            </style>
            <h2>Order Fulfillment Log</h2>
            <div className="widget-card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Order ID</th>
                            <th style={{ padding: '12px' }}>Customer</th>
                            <th style={{ padding: '12px' }}>Items</th>
                            <th style={{ padding: '12px' }}>Total</th>
                            <th style={{ padding: '12px' }}>Status</th>
                            <th style={{ padding: '12px' }}>Timestamp</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedOrders.map((order) => {
                            const customerName = customers[order.customer_id]?.name || order.customer_id;
                            const isPendingPayment = order.status === 'Pending Payment';
                            const isProcessing = order.status === 'Processing';
                            const paymentClaimed = order.payment_status === 'Customer Claimed Paid';

                            return (
                                <tr
                                    key={order.id}
                                    className={paymentClaimed ? 'payment-claim-row' : ''}
                                    style={{ borderBottom: '1px solid var(--color-border)' }}
                                >
                                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                                        {order.id}
                                        {paymentClaimed && <div style={{ fontSize: '0.7em', color: 'purple', fontWeight: 'bold' }}>PAYMENT CLAIMED</div>}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ fontWeight: 500 }}>{customerName}</div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} style={{ fontSize: '0.9rem' }}>
                                                {item.quantity}x {item.name}
                                            </div>
                                        ))}
                                    </td>
                                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(order.total)}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span className={`badge ${order.status === 'Completed' ? 'badge-success' :
                                            order.status === 'Pending Payment' ? 'badge-danger' :
                                                order.status === 'Out for Delivery' ? 'badge-info' : 'badge-warning'
                                            }`} style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px', fontSize: '0.85rem', color: '#666' }}>
                                        {new Date(order.timestamp).toLocaleString()}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {(isPendingPayment || paymentClaimed) && (
                                                <button
                                                    className="btn-action primary"
                                                    style={{ background: 'var(--color-success)' }}
                                                    onClick={() => updateStatus(order.id, { status: 'Processing', payment_status: 'Paid' })}
                                                >
                                                    Confirm Payment
                                                </button>
                                            )}

                                            {isProcessing && (
                                                <button
                                                    className="btn-action"
                                                    style={{ background: 'var(--color-primary)', color: 'white' }}
                                                    onClick={() => updateStatus(order.id, { status: 'Out for Delivery' })}
                                                >
                                                    Mark Out for Delivery
                                                </button>
                                            )}

                                            {/* Fallback Select for other states */}
                                            <select
                                                value={order.status}
                                                onChange={(e) => updateStatus(order.id, {
                                                    status: e.target.value,
                                                    payment_status: ['Processing', 'Out for Delivery', 'Completed'].includes(e.target.value) ? 'Paid' : order.payment_status
                                                })}
                                                style={{
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #ddd',
                                                    fontSize: '0.75rem',
                                                    cursor: 'pointer',
                                                    width: '100%',
                                                    marginTop: '4px'
                                                }}
                                            >
                                                <option value="Pending Payment">Pending Payment</option>
                                                <option value="Processing">Processing</option>
                                                <option value="Out for Delivery">Out for Delivery</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedOrders.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>
                                    No orders found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrdersList;
