import { createContext, useContext, useState, useRef, useEffect } from 'react';

const ModalCtx = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);
  const resolveRef = useRef(null);

  const open = (config) =>
    new Promise((resolve) => {
      resolveRef.current = resolve;
      setModal(config);
    });

  const close = (value) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setModal(null);
  };

  const showAlert = (message, opts = {}) =>
    open({ type: 'alert', message, ...opts });

  const showConfirm = (message, opts = {}) =>
    open({ type: 'confirm', message, ...opts });

  const showPrompt = (message, opts = {}) =>
    open({ type: 'prompt', message, placeholder: opts.placeholder || '', ...opts });

  return (
    <ModalCtx.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {modal && <Modal modal={modal} onClose={close} />}
    </ModalCtx.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

// ── Компонент ──────────────────────────────────────────────────────────────────

import { AlertCircle, AlertTriangle, Trash2, X } from 'lucide-react';

function Modal({ modal, onClose }) {
  const { type, message, danger, placeholder } = modal;
  const [inputVal, setInputVal] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (type === 'prompt') inputRef.current?.focus();
  }, [type]);

  // Escape → cancel
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleConfirm = () => {
    if (type === 'prompt') onClose(inputVal.trim() || null);
    else onClose(type === 'confirm' ? true : undefined);
  };

  const handleCancel = () => {
    onClose(type === 'confirm' ? false : null);
  };

  const isDanger = danger;

  const Icon = isDanger ? Trash2 : type === 'alert' ? AlertCircle : AlertTriangle;
  const iconBg  = isDanger ? 'rgba(239,68,68,0.12)'  : 'rgba(99,102,241,0.12)';
  const iconClr = isDanger ? '#ef4444' : 'var(--clr-accent)';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.18s ease',
      }}
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
    >
      <div
        className="glass-card w-full max-w-sm p-6 flex flex-col gap-4"
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(12px)',
          transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Иконка + жабу */}
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: iconBg }}
          >
            <Icon size={19} style={{ color: iconClr }} />
          </div>
          <button
            onClick={handleCancel}
            className="text-muted hover:text-theme smooth p-1 -mt-1 -mr-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Хабарлама */}
        <p className="text-sm text-theme leading-relaxed">{message}</p>

        {/* Prompt инпуті */}
        {type === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={placeholder}
            className="glass-input text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        )}

        {/* Батырмалар */}
        <div className="flex gap-2 mt-1">
          {type !== 'alert' && (
            <button
              onClick={handleCancel}
              className="btn-glass flex-1 py-2.5 text-sm"
            >
              Бас тарту
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 text-sm rounded-2xl font-medium text-white smooth"
            style={{
              background: isDanger
                ? 'linear-gradient(135deg,#ef4444,#dc2626)'
                : 'linear-gradient(135deg,#6366f1,#a78bfa)',
              boxShadow: isDanger
                ? '0 4px 14px rgba(239,68,68,0.35)'
                : '0 4px 14px rgba(99,102,241,0.35)',
            }}
          >
            {type === 'alert' ? 'Жарайды' : type === 'prompt' ? 'Жіберу' : isDanger ? 'Жою' : 'Растаймын'}
          </button>
        </div>
      </div>
    </div>
  );
}
