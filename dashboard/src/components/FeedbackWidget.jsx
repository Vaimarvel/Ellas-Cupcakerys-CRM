import React, { useState, useEffect } from 'react';

const FeedbackWidget = () => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        fetch('http://localhost:8000/api/data/feedback')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setLogs(data);
                } else {
                    console.error("Feedback data is not an array:", data);
                    setLogs([]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch feedback:", err);
                setLogs([]);
            });
    }, []);

    const crisisLogs = Array.isArray(logs) ? logs.filter(l => ['crisis', 'negative'].includes((l.sentiment || '').toLowerCase())) : [];
    const otherLogs = Array.isArray(logs) ? logs.filter(l => !['crisis', 'negative'].includes((l.sentiment || '').toLowerCase())) : [];

    return (
        <div>
            <h2 style={{ marginBottom: '20px' }}>Feedback & Alerts</h2>

            {/* Crisis Alerts */}
            {crisisLogs.length > 0 && (
                <div style={{ marginBottom: '30px' }}>
                    <h3 className="text-red" style={{ marginBottom: '10px' }}>🚨 CRITICAL ATTENTION REQUIRED</h3>
                    {crisisLogs.map(log => (
                        <div key={log.log_id} className="widget-card" style={{ border: '1px solid var(--color-danger)', background: 'rgba(244, 67, 54, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 700 }}>{log.user_id}</span>
                                <span className="badge badge-danger">{log.sentiment}</span>
                            </div>
                            <p style={{ marginTop: '10px' }}>"{log.message}"</p>
                            <div style={{ marginTop: '10px', fontSize: '0.8rem', opacity: 0.6 }}>Logged at: {log.timestamp}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Recent Feedback */}
            <div className="widget-card">
                <h3>Recent Activity</h3>
                {otherLogs.length === 0 && <p style={{ opacity: 0.5 }}>No feedback logs available.</p>}
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {otherLogs.map(log => (
                        <li key={log.log_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ fontWeight: 500 }}>{log.user_id} <span className="badge" style={{ background: '#444', marginLeft: '10px' }}>{log.sentiment}</span></div>
                            <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>"{log.message}"</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FeedbackWidget;
