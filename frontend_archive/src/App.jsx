import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import WelcomeBanner from './components/WelcomeBanner';
import MessageBubble from './components/MessageBubble';
import QuickActionButtons from './components/QuickActionButtons';
import InputBar from './components/InputBar';

const USER_ID = "9012345678"; // Bola Alade (Returning User)

const App = () => {
  const [messages, setMessages] = useState([
    { sender: 'agent', text: "Hello Bola! How can I make your day sweeter today? 🧁" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const detectProductSuggestion = (text) => {
    // Basic Keyword Mapping for Demo Purposes
    // In a real app, the backend would return structured data (e.g. `suggestion_id: "P001"`)
    if (text.toLowerCase().includes("red velvet")) {
      return {
        name: "Red Velvet Cupcake",
        price: "₦850.00",
        image: "/images/red_velvet_cupcake.png",
        description: "Deep red vanilla cake with a light taste of chocolate, topped with cream cheese frosting."
      };
    }
    if (text.toLowerCase().includes("chocolate cake")) {
      return {
        name: "Classic Chocolate Cake",
        price: "₦5,500.00",
        image: "/images/chocolate_cake.png",
        description: "Rich, moist chocolate cake with dark chocolate ganache."
      };
    }
    if (text.toLowerCase().includes("lemon loaf")) {
      return {
        name: "Vegan Lemon Loaf",
        price: "₦3,200.00",
        image: "/images/lemon_loaf.png",
        description: "Zesty lemon loaf made with plant-based ingredients.",
        is_available: false
      };
    }
    return null;
  };

  const handleSend = async (text) => {
    const newMsg = { sender: 'user', text };
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          message: text
        })
      });

      const data = await response.json();
      const agentText = data.response;

      let responseMsgs = [{ sender: 'agent', text: agentText }];

      // Parse for Heuristics
      const suggestion = detectProductSuggestion(agentText);
      if (suggestion) {
        responseMsgs.push({
          sender: 'agent',
          type: 'suggestion_card',
          data: suggestion
        });
      }

      setMessages(prev => [...prev, ...responseMsgs]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: 'agent', text: "⚠️ Connection Error: Is the backend server running?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '140px', minHeight: '100vh', maxWidth: '600px', margin: '0 auto', background: 'var(--color-bg)', position: 'relative' }}>
      <Header />

      {/* Scrollable Content */}
      <div style={{ paddingTop: '20px' }}>
        <WelcomeBanner customerName="Bola Alade" loyaltyPoints={820} />

        <div style={{ padding: '0 20px' }}>
          {messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              onOrder={(itemName) => handleSend(`I would like to order the ${itemName} please.`)}
            />
          ))}
          {isLoading && (
            <div style={{ padding: '10px 20px', opacity: 0.5, fontStyle: 'italic', fontSize: '0.8rem' }}>
              Ellas is typing...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Fixed Bottom Interface */}
      <div style={{ position: 'fixed', bottom: '80px', left: 0, right: 0, zIndex: 900, maxWidth: '600px', margin: '0 auto' }}>
        <QuickActionButtons onAction={handleSend} />
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <InputBar onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
};

export default App;
