import React from 'react';

const Header = () => {
    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '70px',
            background: 'var(--color-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            boxShadow: 'var(--shadow-neumorphism)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Placeholder Logo Icon */}
                <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%', background: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 'bold', fontFamily: 'var(--font-heading)'
                }}>E</div>
                <h1 style={{ fontSize: '1.4rem', color: 'var(--color-text)', letterSpacing: '0.5px' }}>Ellas Cupcakery</h1>
            </div>
        </header>
    );
};

export default Header;
