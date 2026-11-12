import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

try {
  registerSW({
    immediate: true,
    onRegisterError(err) {
      console.warn('Service worker registration skipped:', err);
    },
  });
} catch {
  // Ignore SW registration errors in restricted contexts
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B0E17] text-slate-100 p-6">
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-[#141824] p-6 space-y-3">
            <h1 className="text-base font-semibold">Erro ao iniciar o Roteiro LD</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {this.state.message || 'Ocorreu uma falha inesperada na inicialização.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#2E4EFF] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);
