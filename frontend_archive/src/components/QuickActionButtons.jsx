import React from 'react';

const QuickActionButtons = ({ onAction }) => {
    const actions = [
        { label: 'My Usual', icon: '⭐', action: 'Order My Usual' },
        { label: 'Deals', icon: '🏷️', action: 'Show Promotions' },
        { label: 'Track', icon: '🚚', action: 'Track my Order' },
        { label: 'Support', icon: '❗', action: 'Report Issue' }
    ];

    return (
        <div style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            padding: '10px 20px',
            marginBottom: '10px',
            /* Hide scrollbar */
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
        }}>
            {actions.map((btn) => (
                <button
                    key={btn.label}
                    className="neumorphic-btn"
                    onClick={() => onAction(btn.action)}
                    style={{
                        flex: '0 0 auto',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '16px 12px',
                        minWidth: '80px',
                        fontSize: '0.8rem',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <span style={{ fontSize: '1.5rem' }}>{btn.icon}</span>
                    {btn.label}
                </button>
            ))}
        </div>
    );
};

export default QuickActionButtons;
