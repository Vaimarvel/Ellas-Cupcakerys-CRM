import React from 'react';

const WelcomeBanner = ({ customerName, loyaltyPoints }) => {
    return (
        <div className="neumorphic-card" style={{
            margin: '90px 20px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Decorative Circle */}
            <div style={{
                position: 'absolute', top: '-10px', right: '-10px',
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'var(--color-primary)', opacity: '0.2'
            }}></div>

            <h2 style={{ fontSize: '1.4rem' }}>Welcome back, {customerName}!</h2>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>
                You have <span style={{
                    color: 'var(--color-text)',
                    fontWeight: 'bold',
                    borderBottom: '2px solid var(--color-primary)'
                }}>{loyaltyPoints} Loyalty Points</span>.
            </p>
        </div>
    );
};

export default WelcomeBanner;
