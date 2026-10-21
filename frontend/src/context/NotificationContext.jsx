import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 4500) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = (msg, dur) => addToast(msg, 'success', dur);
  const error = (msg, dur) => addToast(msg, 'error', dur);
  const warning = (msg, dur) => addToast(msg, 'warning', dur);
  const info = (msg, dur) => addToast(msg, 'info', dur);

  return (
    <NotificationContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => {
          let Icon = Info;
          let iconColor = 'text-cyan-400';
          if (toast.type === 'success') {
            Icon = CheckCircle2;
            iconColor = '#10b981';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            iconColor = '#f43f5e';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = '#f59e0b';
          }

          return (
            <div key={toast.id} className={`toast-item toast-${toast.type}`}>
              <Icon size={20} color={iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
}
