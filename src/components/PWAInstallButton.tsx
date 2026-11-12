import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] dark:hover:bg-[#1E3DF0] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        Instalar App (PC / Android)
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#102EE0]/25 bg-[#102EE0]/5 hover:bg-[#102EE0]/10 dark:border-[#2E4EFF]/30 dark:bg-[#2E4EFF]/10 dark:hover:bg-[#2E4EFF]/20 px-3 py-2.5 text-xs font-semibold text-[#102EE0] dark:text-[#7A92FF] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        {isIOS ? 'Instalar no iPhone / iPad' : 'Instalar no Dispositivo'}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141824] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="./assets/aistudio/LD_LOGO_a27c8238.png"
                  alt="Roteiro LD"
                  className="w-7 h-7 rounded-lg object-contain"
                />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Instalar Roteiro LD
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {isIOS ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.
                <br />
                2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                No Chrome ou Edge (Android ou PC), abra o menu do navegador (⋮) e selecione{' '}
                <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong> para usar o Roteiro LD offline como app nativo.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#102EE0] hover:bg-[#0C24B8] dark:bg-[#2E4EFF] py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
