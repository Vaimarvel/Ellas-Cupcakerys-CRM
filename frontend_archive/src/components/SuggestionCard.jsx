import React from 'react';

const SuggestionCard = ({ data, onOrder }) => {
    // data expected: { name, price, image, id, description }
    return (
        <div className="neumorphic-card" style={{ maxWidth: '280px', padding: '0', overflow: 'hidden', margin: '4px' }}>
            <div style={{
                height: '160px',
                background: '#f0eeee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
            }}>
                <img
                    src={data.image || "https://placehold.co/400x300?text=Delicious+Cupcake"}
                    alt={data.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {data.is_available === false && (
                    <div style={{
                        position: 'absolute', background: 'rgba(0,0,0,0.6)',
                        color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'
                    }}>Out of Stock</div>
                )}
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{data.name}</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0, lineHeight: '1.3' }}>
                    {data.description || "Freshly baked with premium ingredients."}
                </p>

                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                        {data.price}
                    </span>
                    <button
                        className="neumorphic-btn primary"
                        style={{ fontSize: '0.9rem', padding: '10px 16px' }}
                        onClick={() => onOrder(data.name)}
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuggestionCard;
