import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { RxPaperPlane, RxChatBubble, RxPerson, RxGrid, RxCheck } from 'react-icons/rx';

export const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I am your Ethara Assistant. Ask me questions about office layouts, staff seating, or seat bookings in plain English.",
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const samplePrompts = [
    "Where is Admin sitting?",
    "Show vacant seats on Floor 2.",
    "Allocate a seat to EMP1004.",
    "How many seats are available?",
    "Show Engineering employees."
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.post('/api/assistant', { query });
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: res.data.text,
        type: res.data.type,
        data: res.data.data
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Sorry, I encountered an issue querying the database. Please try again.',
        type: 'text'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderBotData = (msg) => {
    if (!msg.data) return null;

    switch (msg.type) {
      case 'seat_info':
        return (
          <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 max-w-sm animate-slide-up text-sm">
            <div className="flex items-center gap-2 text-teal-400 font-bold">
              <RxGrid className="h-5 w-5" />
              <span>Workspace Desk Location</span>
            </div>
            <div className="space-y-1 mt-1 text-slate-300">
              <p>Employee: <span className="font-semibold text-white">{msg.data.employee_name}</span></p>
              <p>Seat Number: <span className="font-mono text-teal-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850 uppercase">{msg.data.seat_number}</span></p>
              <p>Desk coordinates: <span className="font-medium text-slate-400">{msg.data.building}, {msg.data.floor}, {msg.data.zone}</span></p>
            </div>
          </div>
        );

      case 'seat_list':
        return (
          <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-w-md animate-slide-up text-xs">
            <div className="p-2.5 bg-slate-850 font-semibold text-slate-300 border-b border-slate-800">
              Matching Vacant Desks
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-850">
              {msg.data.map((seat) => (
                <div key={seat.id} className="p-2 flex justify-between font-mono text-slate-400">
                  <span className="text-teal-400 font-semibold uppercase">{seat.seat_number}</span>
                  <span>{seat.building} • {seat.floor}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'employee_list':
        return (
          <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden max-w-lg animate-slide-up text-xs">
            <div className="p-2.5 bg-slate-850 font-semibold text-slate-300 border-b border-slate-800 flex justify-between">
              <span>Department Workers List</span>
              <span className="text-[10px] text-slate-500">Showing first {msg.data.length}</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-850">
              {msg.data.map((emp) => (
                <div key={emp.id} className="p-2.5 flex justify-between items-center hover:bg-slate-850/50">
                  <div>
                    <span className="block font-medium text-white text-xs">{emp.name}</span>
                    <span className="block text-[10px] text-slate-500">{emp.designation} ({emp.employee_id})</span>
                  </div>
                  <span className="text-slate-400">{emp.email}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'allocation_success':
        return (
          <div className="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-2 max-w-sm animate-slide-up text-sm">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <RxCheck className="h-5 w-5 bg-emerald-500/20 rounded-full p-0.5" />
              <span>Desk Mapping Completed</span>
            </div>
            <div className="space-y-1 text-slate-300">
              <p>Employee: <span className="font-semibold text-white">{msg.data.employee_name} ({msg.data.employee_code})</span></p>
              <p>Seat Number: <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-850 uppercase">{msg.data.seat_number}</span></p>
              <p>Location: <span className="text-slate-400">{msg.data.building}, {msg.data.floor}</span></p>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 max-w-xs animate-slide-up text-sm">
            <h4 className="font-semibold text-slate-300">Workspace Statistics</h4>
            <div className="space-y-1 text-slate-400">
              <p>Available Desks: <span className="text-emerald-400 font-bold">{msg.data.available}</span></p>
              <p>Total Configured: <span className="text-slate-200 font-bold">{msg.data.total}</span></p>
              <p>Total Occupied: <span className="text-teal-400 font-bold">{msg.data.total - msg.data.available}</span></p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                <span>Occupancy Rate</span>
                <span>{msg.data.utilization}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary-500 h-full rounded-full" style={{ width: `${msg.data.utilization}%` }}></div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-panel border border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-12rem)] overflow-hidden select-none">
      {/* 1. Header widget */}
      <div className="h-14 bg-slate-900/60 border-b border-slate-850 px-6 flex items-center gap-3 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary-500 flex items-center justify-center text-white">
          <RxChatBubble />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">AI Seating Assistant</h3>
          <span className="text-[10px] text-emerald-400 font-medium tracking-wide uppercase">Rule Engine Connected</span>
        </div>
      </div>

      {/* 2. Chat content area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Bubble */}
            <div className={`max-w-md p-3.5 rounded-xl text-sm leading-relaxed ${
              msg.sender === 'user' 
                ? 'bg-primary-600 text-white rounded-br-none shadow-md shadow-primary-950/20' 
                : 'bg-slate-850 text-slate-200 border border-slate-800 rounded-bl-none'
            }`}>
              {msg.text.split('\n').map((line, idx) => (
                <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
              ))}
            </div>

            {/* Custom Structured Component */}
            {msg.sender === 'bot' && renderBotData(msg)}
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div className="bg-slate-850 border border-slate-800 px-4 py-3 rounded-xl rounded-bl-none flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Recommended Prompts Pills */}
      {messages.length === 1 && !loading && (
        <div className="px-6 py-3 border-t border-slate-850 bg-slate-900/10 space-y-2 shrink-0">
          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Try typing or clicking:</span>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map(p => (
              <button
                key={p}
                onClick={() => handleSend(p)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-xs text-slate-400 hover:text-slate-200 rounded-full transition-colors font-medium"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Input footer */}
      <div className="p-4 border-t border-slate-850 bg-slate-900/60 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-3"
        >
          <input
            type="text"
            placeholder="Where is John sitting? Show Finance employees..."
            className="form-input flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit"
            disabled={loading}
            className="btn-primary px-4 flex items-center justify-center disabled:opacity-50"
          >
            <RxPaperPlane className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
