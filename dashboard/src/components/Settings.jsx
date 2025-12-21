import React, { useState, useEffect } from 'react';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const Settings = () => {
    const [settings, setSettings] = useState({
        payment_bank_name: '',
        payment_account_number: '',
        payment_account_name: '',
        hero_bg_url: '',
        hero_img_url: '',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/api/site/settings`)
            .then(res => res.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch settings", err);
                setLoading(false);
            });
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await fetch(`${API_BASE}/api/data/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collection: 'site_settings',
                    item_id: 'config', // 'item_id' is ignored for settings in our API logic but key is required by UpdateRequest
                    updates: settings
                })
            });
            alert("Settings Saved Successfully!");
        } catch {
            alert("Failed to save settings.");
        }
    };

    if (loading) return <div>Loading Settings...</div>;

    return (
        <div className="widget-card" style={{ maxWidth: '600px' }}>
            <h3>Store Configuration</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '5px' }}>Bank Name</label>
                    <input
                        type="text"
                        name="payment_bank_name"
                        value={settings.payment_bank_name || ''}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '5px' }}>Account Number</label>
                    <input
                        type="text"
                        name="payment_account_number"
                        value={settings.payment_account_number || ''}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <div className="form-group">
                    <label style={{ display: 'block', fontWeight: 500, marginBottom: '5px' }}>Account Name</label>
                    <input
                        type="text"
                        name="payment_account_name"
                        value={settings.payment_account_name || ''}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '8px' }}
                    />
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
                <button type="submit" className="neumorphic-btn primary">Save Changes</button>
            </form>
        </div>
    );
};

export default Settings;
