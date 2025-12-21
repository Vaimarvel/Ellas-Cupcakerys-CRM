import React, { useState } from 'react';

const InputBar = ({ onSend, disabled }) => {
    const [text, setText] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
            onSend(text);
            setText("");
        }
    };

    return (
        <div style={{
            padding: '20px',
            background: 'var(--color-bg)',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            boxShadow: '0 -10px 20px -5px rgba(255,255,255, 0.8)' // blend up
        }}>
            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
            }}>
                <input
                    type="text"
                    className="neumorphic-input"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={disabled}
                />
                <button
                    type="submit"
                    className="neumorphic-btn primary"
                    disabled={disabled}
                    style={{
                        borderRadius: '50%',
                        width: '50px',
                        height: '50px',
                        padding: 0,
                        flexShrink: 0,
                        opacity: disabled ? 0.6 : 1
                    }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default InputBar;
