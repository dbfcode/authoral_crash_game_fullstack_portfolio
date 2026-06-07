import { useToast } from '../hooks/useToast';

export function ToastDisplay() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'error'
              ? 'border-casino-danger/50 bg-red-950 text-red-100'
              : toast.type === 'success'
                ? 'border-casino-accent/50 bg-green-950 text-green-100'
                : 'border-white/20 bg-casino-panel text-gray-100'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span>{toast.message}</span>
            <button
              type="button"
              className="text-gray-400 hover:text-white"
              onClick={() => dismissToast(toast.id)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
