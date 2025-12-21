import React from 'react';
import SuggestionCard from './SuggestionCard';

const MessageBubble = ({ message, onOrder }) => {
    const isAgent = message.sender === 'agent';

    // Style overrides for Agent vs User
    const bubbleStyle = {
        maxWidth: '85%',
        padding: '16px 20px',
        borderRadius: '20px',
        borderTopLeftRadius: isAgent ? '4px' : '20px',
        borderBottomRightRadius: isAgent ? '20px' : '4px',
        // Agent: Neumorphic (white-ish), User: Pink Flat
        background: isAgent ? 'var(--color-bg)' : 'var(--color-primary)',
        color: isAgent ? 'var(--color-text)' : '#FFFFFF',
        boxShadow: isAgent ? 'var(--shadow-neumorphism)' : '4px 4px 10px rgba(233, 168, 182, 0.4)',
        alignSelf: isAgent ? 'flex-start' : 'flex-end',
        marginBottom: '20px',
        fontSize: '1rem',
        lineHeight: '1.5',
        position: 'relative'
    };

    // Handle Card Type
    if (message.type === 'suggestion_card') {
        return (
            <div style={{ alignSelf: 'flex-start', marginBottom: '20px' }}>
                <SuggestionCard data={message.data} onOrder={onOrder} />
            </div>
        );
    }

    return (
        <div style={bubbleStyle}>
            {message.text}
            {/* Time Stamp (Optional) */}
            <div style={{
                fontSize: '0.7rem',
                opacity: 0.6,
                textAlign: isAgent ? 'left' : 'right',
                marginTop: '6px'
            }}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
};

export default MessageBubble;
