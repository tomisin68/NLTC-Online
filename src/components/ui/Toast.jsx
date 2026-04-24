import { useToast } from '../../contexts/ToastContext';

const ICONS = { success:'✓', error:'✕', info:'ℹ', default:'💬' };

export default function Toast() {
  const { toasts } = useToast();
  return (
    <div id="toast-ct">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span style={{fontSize:'1rem'}}>{ICONS[t.type] || ICONS.default}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
