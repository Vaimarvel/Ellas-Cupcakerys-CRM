import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const STATUSES = ['Pending Payment', 'Processing', 'Out for Delivery', 'Completed', 'Cancelled'];

export default function OrdersKanban() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = () => {
        fetch(`${API_BASE}/api/data/orders`)
            .then(res => res.json())
            .then(data => {
                // Safely handle data if it's null or not object
                const list = data && typeof data === 'object' ? Object.values(data) : [];
                list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                setOrders(list);
                setLoading(false);
            })
            .catch(console.error);
    };

    const updateStatus = (orderId, newStatus, paymentStatus = null) => {
        const updates = { status: newStatus };
        if (paymentStatus) updates.payment_status = paymentStatus;

        fetch(`${API_BASE}/api/data/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collection: 'orders',
                item_id: orderId,
                updates: updates
            })
        }).then(fetchOrders);
    };

    if (loading) return <div>Loading Orders...</div>;

    return (
        <div className="orders-board">
            {STATUSES.map(status => (
                <div key={status} className="kanban-column">
                    <div className="kanban-header">
                        {status}
                        <span className="count">
                            {orders.filter(o => o.status === status).length}
                        </span>
                    </div>
                    <div className="kanban-body">
                        {orders.filter(o => o.status === status).map(order => (
                            <div key={order.id} className="order-card">
                                <div className="order-id">{order.id}</div>
                                <div className="order-customer">
                                    {order.customer_id === "NEW_USER" ? "Guest User" : order.customer_id}
                                </div>
                                <div className="order-items">
                                    {order.items.map((i, idx) => (
                                        <div key={idx}>• {i.quantity}x {i.name}</div>
                                    ))}
                                </div>
                                <div className="order-total">
                                    {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(order.total)}
                                </div>
                                <div className="order-time">
                                    {new Date(order.timestamp).toLocaleTimeString()}
                                </div>

                                <div className="order-actions">
                                    <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Update Status:</label>
                                    <select
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value,
                                            // Auto-flag payment if moving to Processing/Delivery/Completed
                                            ['Processing', 'Out for Delivery', 'Completed'].includes(e.target.value) ? 'Paid' : order.payment_status
                                        )}
                                        className="status-select"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            marginBottom: '8px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="Pending Payment">Pending Payment</option>
                                        <option value="Processing">Processing</option>
                                        <option value="Out for Delivery">Out for Delivery</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>

                                    {/* Quick Actions based on status */}
                                    {order.status === 'Pending Payment' && (
                                        <button className="btn-action primary" onClick={() => updateStatus(order.id, 'Processing', 'Paid')}>
                                            ✓ Confirm Payment
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
