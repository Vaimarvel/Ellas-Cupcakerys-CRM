import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const MenuInventory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        price: '',
        ingredients: '',
    });

    useEffect(() => {
        fetchMenuData();
    }, []);

    const fetchMenuData = () => {
        fetch(`${API_BASE}/api/data/menu`)
            .then(res => res.json())
            .then(data => {
                const list = data && typeof data === 'object' ? Object.values(data) : [];
                setItems(Array.isArray(list) ? list : []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch menu:", err);
                setLoading(false);
            });
    };

    const toggleAvailability = (id, currentStatus) => {
        const newStatus = !currentStatus;
        // Optimistic UI update
        setItems(items.map(i => i.id === id ? { ...i, is_available: newStatus } : i));

        fetch(`${API_BASE}/api/data/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collection: 'menu',
                item_id: id,
                updates: { is_available: newStatus }
            })
        });
    };


    const handleAddProduct = async (e) => {
        e.preventDefault();

        // Generate a new product ID
        const newId = `P${String(items.length + 1).padStart(3, '0')}`;

        const productData = {
            id: newId,
            name: newProduct.name,
            price: parseFloat(newProduct.price),
            ingredients: newProduct.ingredients.split(',').map(i => i.trim()),
            is_available: true
        };

        try {
            const response = await fetch(`${API_BASE}/api/data/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: 'menu',
                    item: productData
                })
            });

            if (response.ok) {
                // Refresh the menu data
                fetchMenuData();
                // Reset form and close modal
                setNewProduct({ name: '', price: '', ingredients: '' });
                setShowAddModal(false);
            }
        } catch (error) {
            console.error("Failed to add product:", error);
        }
    };

    const [editingProduct, setEditingProduct] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const handleEditClick = (product) => {
        setEditingProduct({
            ...product,
            ingredients: Array.isArray(product.ingredients) ? product.ingredients.join(', ') : product.ingredients,
            image_url: product.image_url || '',
            loyalty_points: product.loyalty_points || Math.floor(product.price / 100)
        });
        setShowEditModal(true);
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();

        try {
            await fetch(`${API_BASE}/api/data/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: 'menu',
                    item_id: editingProduct.id,
                    updates: {
                        name: editingProduct.name,
                        price: parseFloat(editingProduct.price),
                        ingredients: editingProduct.ingredients.split(',').map(i => i.trim()),
                        image_url: editingProduct.image_url,
                        loyalty_points: parseInt(editingProduct.loyalty_points)
                    }
                })
            });

            fetchMenuData();
            setShowEditModal(false);
            setEditingProduct(null);
        } catch (error) {
            console.error("Failed to update product:", error);
        }
    };

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settings, setSettings] = useState({
        contact_email: '',
        contact_whatsapp: '',
        contact_instagram: '',
        contact_facebook: ''
    });

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/site/settings`);
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error("Failed to fetch settings:", error);
        }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_BASE}/api/data/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: 'site_settings',
                    item_id: 'settings', // Not used for dictionary update but required by schema maybe? API just iterates updates.
                    updates: settings
                })
            });
            setShowSettingsModal(false);
            alert("Settings updated!");
        } catch (error) {
            console.error("Failed to update settings:", error);
            alert("Failed to update settings");
        }
    };

    // Fetch settings when modal opens
    useEffect(() => {
        if (showSettingsModal) {
            fetchSettings();
        }
    }, [showSettingsModal]);

    if (loading) return <div>Loading Inventory...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Menu & Inventory Management</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="neumorphic-btn"
                        onClick={() => setShowSettingsModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        ⚙️ Settings
                    </button>
                    <button
                        className="neumorphic-btn primary"
                        onClick={() => setShowAddModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
                        Add New Product
                    </button>
                </div>
            </div>

            <div className="widget-card">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Image</th>
                            <th>Item Name</th>
                            <th>Ingredients</th>
                            <th>Price (₦)</th>
                            <th>Points</th>
                            <th>Availability</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td style={{ fontFamily: 'monospace', opacity: 0.6 }}>{item.id}</td>
                                <td>
                                    <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                                        {item.image_url ? (
                                            <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : <span style={{ fontSize: '0.6rem', display: 'block', textAlign: 'center', paddingTop: 12 }}>No Img</span>}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                </td>
                                <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                    {(item.ingredients || []).join(", ")}
                                </td>
                                <td>₦{item.price}</td>
                                <td>{item.loyalty_points || Math.floor(item.price / 100)}</td>
                                <td>
                                    <div
                                        className={`toggle-switch ${item.is_available ? 'on' : ''}`}
                                        onClick={() => toggleAvailability(item.id, item.is_available)}
                                    >
                                        <div className="toggle-switch-handle"></div>
                                    </div>
                                </td>
                                <td style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="icon-btn"
                                        onClick={() => handleEditClick(item)}
                                        title="Edit Item"
                                        style={{ background: 'none', border: '1px solid #ddd', cursor: 'pointer', borderRadius: 4, padding: '4px 8px' }}
                                    >
                                        📝 Edit
                                    </button>
                                    <button
                                        className="icon-btn delete"
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
                                                fetch('http://localhost:8000/api/data/delete', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ collection: 'menu', item_id: item.id })
                                                }).then(() => fetchMenuData());
                                            }
                                        }}
                                        title="Delete Item"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4f', fontSize: '1.2rem' }}
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Product Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="widget-card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
                        <h3 style={{ marginBottom: '20px' }}>Add New Product</h3>
                        <form onSubmit={handleAddProduct}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Product Name *</label>
                                <input type="text" required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Price (₦) *</label>
                                <input type="number" required step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Ingredients (comma-separated) *</label>
                                <input type="text" required value={newProduct.ingredients} onChange={(e) => setNewProduct({ ...newProduct, ingredients: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="neumorphic-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="neumorphic-btn primary">Add Product</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && editingProduct && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="widget-card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
                        <h3 style={{ marginBottom: '20px' }}>Edit Product: {editingProduct.id}</h3>
                        <form onSubmit={handleUpdateProduct}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Product Name</label>
                                <input type="text" required value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ marginBottom: '15px', flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Price (₦)</label>
                                    <input type="number" required step="0.01" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                                </div>
                                <div style={{ marginBottom: '15px', flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Loyalty Points</label>
                                    <input type="number" required value={editingProduct.loyalty_points || Math.floor(editingProduct.price / 100)} onChange={(e) => setEditingProduct({ ...editingProduct, loyalty_points: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Ingredients</label>
                                <input type="text" required value={editingProduct.ingredients} onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Image URL</label>
                                <input type="text" value={editingProduct.image_url || ''} onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="neumorphic-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="neumorphic-btn primary">Update Product</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="widget-card" style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
                        <h3 style={{ marginBottom: '20px' }}>Site Settings</h3>
                        <form onSubmit={handleSaveSettings}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Contact Email</label>
                                <input type="email" value={settings.contact_email || ''} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>WhatsApp Number</label>
                                <input type="text" value={settings.contact_whatsapp || ''} onChange={(e) => setSettings({ ...settings, contact_whatsapp: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Instagram Handle</label>
                                <input type="text" value={settings.contact_instagram || ''} onChange={(e) => setSettings({ ...settings, contact_instagram: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 500 }}>Facebook Page</label>
                                <input type="text" value={settings.contact_facebook || ''} onChange={(e) => setSettings({ ...settings, contact_facebook: e.target.value })} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="neumorphic-btn" onClick={() => setShowSettingsModal(false)}>Cancel</button>
                                <button type="submit" className="neumorphic-btn primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuInventory;
