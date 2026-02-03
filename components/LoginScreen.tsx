import React, { useState } from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import { Button } from './Button';

interface LoginScreenProps {
  onLogin: () => void;
  validPassword: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, validPassword }) => {
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === validPassword) {
      onLogin();
    } else {
      setError(true);
      setInputPassword('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1B4D3E] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
        
        {/* Header / Logo Area */}
        <div className="bg-[#113026] p-8 text-center flex flex-col items-center justify-center border-b border-emerald-900/30">
            <h1 
                className="text-6xl font-bold text-white tracking-tighter leading-none mb-2"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
                GE<span className="text-5xl italic">y</span>T
            </h1>
            <h2 className="text-xs font-medium text-white/80 uppercase tracking-[0.2em] mt-2">
                Asignación de Equipos
            </h2>
        </div>

        {/* Form Area */}
        <div className="p-8 pt-10">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-slate-800">Bienvenido</h3>
            <p className="text-slate-500 text-sm mt-1">Ingrese su clave de acceso para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide ml-1">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1B4D3E] transition-colors" size={18} />
                <input
                  type="password"
                  autoFocus
                  required
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-200 focus:border-[#1B4D3E] focus:ring-emerald-100'
                  } focus:outline-none focus:ring-4 transition-all bg-slate-50 text-slate-900 placeholder:text-slate-400`}
                  placeholder="••••••••"
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    setError(false);
                  }}
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 font-medium ml-1 animate-in slide-in-from-left-1">
                  Contraseña incorrecta. Intente nuevamente.
                </p>
              )}
            </div>

            <button 
                type="submit"
                className="w-full bg-[#1B4D3E] hover:bg-[#153e32] text-white font-medium py-3 px-4 rounded-lg shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
                <span>Ingresar al Sistema</span>
                <ChevronRight size={18} />
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
             <p className="text-xs text-slate-400">© 2026 Gerencia de Equipos y Transporte</p>
        </div>
      </div>
    </div>
  );
};