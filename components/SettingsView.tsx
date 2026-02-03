import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Save, X, Settings, Shield, Lock } from 'lucide-react';
import { Button } from './Button';

interface SettingsViewProps {
  uos: string[];
  onAddUO: (name: string) => void;
  onDeleteUO: (name: string) => void;
  onEditUO: (oldName: string, newName: string) => void;

  categories: string[];
  onAddCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;

  onChangePassword: (newPass: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    uos, onAddUO, onDeleteUO, onEditUO,
    categories, onAddCategory, onDeleteCategory, onEditCategory,
    onChangePassword
}) => {
    const [newPassword, setNewPassword] = useState('');
    const [passMsg, setPassMsg] = useState('');

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.trim().length > 3) {
            onChangePassword(newPassword.trim());
            setNewPassword('');
            setPassMsg('Contraseña actualizada correctamente.');
            setTimeout(() => setPassMsg(''), 3000);
        } else {
            setPassMsg('Error: La contraseña debe tener al menos 4 caracteres.');
        }
    };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4 mb-6">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Configuración</h2>
            <p className="text-sm text-slate-500">Gestión de listas y parámetros del sistema</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ListManager 
                title="Unidades Operativas (UO)"
                items={uos}
                onAdd={onAddUO}
                onEdit={onEditUO}
                onDelete={onDeleteUO}
                placeholder="Nombre de nueva Unidad Operativa"
            />
            
            <ListManager 
                title="Categorías de Equipos"
                items={categories}
                onAdd={onAddCategory}
                onEdit={onEditCategory}
                onDelete={onDeleteCategory}
                placeholder="Nueva Categoría (Ej: Rodados)"
            />
        </div>

        {/* Security Section */}
        <div className="mt-8 pt-8 border-t border-slate-200">
             <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700 shrink-0">
                    <Shield size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">Seguridad y Acceso</h3>
                    <p className="text-sm text-slate-500 mb-4">Actualice la contraseña de ingreso al sistema.</p>
                    
                    <form onSubmit={handlePasswordSubmit} className="max-w-md flex items-end gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex-1">
                             <label className="block text-xs font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                             <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="password" 
                                    className="w-full pl-9 pr-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-[#1B4D3E] focus:border-transparent text-sm"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                             </div>
                        </div>
                        <Button type="submit" variant="primary" className="bg-[#1B4D3E] hover:bg-[#113026]">
                            Actualizar
                        </Button>
                    </form>
                    {passMsg && (
                        <p className={`mt-2 text-sm font-medium ${passMsg.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>
                            {passMsg}
                        </p>
                    )}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

// Reusable Sub-component for List Management (CRUD)
interface ListManagerProps {
    title: string;
    items: string[];
    onAdd: (val: string) => void;
    onEdit: (oldVal: string, newVal: string) => void;
    onDelete: (val: string) => void;
    placeholder: string;
}

const ListManager: React.FC<ListManagerProps> = ({ title, items, onAdd, onEdit, onDelete, placeholder }) => {
    const [newItem, setNewItem] = useState('');
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            onAdd(newItem.trim());
            setNewItem('');
        }
    };

    const startEdit = (item: string) => {
        setEditingItem(item);
        setEditValue(item);
    };

    const cancelEdit = () => {
        setEditingItem(null);
        setEditValue('');
    };

    const saveEdit = (oldItem: string) => {
        if (editValue.trim() && editValue !== oldItem) {
            onEdit(oldItem, editValue.trim());
        }
        setEditingItem(null);
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                {title}
            </h3>
            
            <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2 text-sm bg-white text-slate-900"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                />
                <Button type="submit" variant="success" size="sm" disabled={!newItem.trim()}>
                    <Plus size={18} />
                </Button>
            </form>

            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex-1 max-h-[400px] overflow-y-auto">
                <ul className="divide-y divide-slate-200">
                    {items.map((item) => (
                    <li key={item} className="p-3 flex items-center justify-between hover:bg-white transition-colors group">
                        {editingItem === item ? (
                        <div className="flex-1 flex gap-2 items-center mr-2">
                            <input
                            autoFocus
                            type="text"
                            className="flex-1 rounded border-slate-300 border p-1 text-sm bg-white text-slate-900"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            />
                            <button onClick={() => saveEdit(item)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded">
                            <Save size={16} />
                            </button>
                            <button onClick={cancelEdit} className="text-slate-400 hover:bg-slate-100 p-1 rounded">
                            <X size={16} />
                            </button>
                        </div>
                        ) : (
                        <span className="text-slate-700 font-medium text-sm pl-2">{item}</span>
                        )}

                        {editingItem !== item && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                            onClick={() => startEdit(item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                            >
                            <Pencil size={14} />
                            </button>
                            <button 
                            onClick={() => onDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                            >
                            <Trash2 size={14} />
                            </button>
                        </div>
                        )}
                    </li>
                    ))}
                    {items.length === 0 && (
                    <li className="p-4 text-center text-slate-400 text-sm italic">
                        Sin elementos cargados.
                    </li>
                    )}
                </ul>
            </div>
        </div>
    );
}