import React, { useState } from 'react';
import { RequestForm } from './components/RequestForm';
import { EquipmentRequest, RequestStatus, ViewMode, OwnDetails, BuyDetails } from './types';
import { AssignOwnModal } from './components/AssignOwnModal';
import { AssignRentModal } from './components/AssignRentModal';
import { ReportView } from './components/ReportView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { LayoutDashboard, ShoppingCart, Key, Search, Calendar, Package, Settings, Filter, CheckSquare, LogOut } from 'lucide-react';
import { Button } from './components/Button';

// Mock Initial Data
const INITIAL_DATA: EquipmentRequest[] = [
  {
    id: '1',
    requestDate: '2026-02-03',
    uo: '332 - Ruta Nacional 19',
    category: 'Equipos',
    description: 'Excavadora',
    capacity: '20 Tn',
    quantity: 3,
    needDate: '2026-03-01',
    comments: '',
    status: RequestStatus.PENDING
  },
  {
    id: '2',
    requestDate: '2026-02-03',
    uo: '332 - Ruta Nacional 19',
    category: 'Equipos',
    description: 'Motoniveladora',
    capacity: '14"',
    quantity: 2,
    needDate: '2026-03-01',
    comments: '',
    status: RequestStatus.PENDING
  },
  {
      id: '3',
      requestDate: '2026-02-03',
      uo: '334 - Tinoco',
      category: 'Equipos',
      description: 'Tractor',
      capacity: '250 HP',
      quantity: 1,
      needDate: '2026-04-01',
      comments: '',
      status: RequestStatus.PENDING
  },
  {
      id: '4',
      requestDate: '2026-02-03',
      uo: '334 - Tinoco',
      category: 'Contenedor/Obrador',
      description: 'Comedor',
      capacity: '12 mts',
      quantity: 1,
      needDate: '2026-04-01',
      comments: '',
      status: RequestStatus.PENDING
  }
];

// Initial Operational Units
const INITIAL_UOS = [
  '332 - Ruta Nacional 19',
  '334 - Tinoco',
  '307 - Ruta Nacional 9, Sgo. del Estero',
  '317 - TECSAN',
  '812 - GEyT'
];

// Initial Categories
const INITIAL_CATEGORIES = [
  'Equipos',
  'Contenedor/Obrador',
  'Miscelaneos'
];

// Corporate Green matching the logo (English Green)
const BRAND_GREEN = "bg-[#1B4D3E]"; 
const BRAND_GREEN_DARK = "bg-[#113026]";

const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [appPassword, setAppPassword] = useState('asignacion2026');

  // App Data State
  const [requests, setRequests] = useState<EquipmentRequest[]>(INITIAL_DATA);
  const [uos, setUos] = useState<string[]>(INITIAL_UOS);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [view, setView] = useState<ViewMode>('DASHBOARD');
  
  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Modal State for "Own" assignment
  const [isOwnModalOpen, setIsOwnModalOpen] = useState(false);
  const [selectedRequestForOwn, setSelectedRequestForOwn] = useState<EquipmentRequest | null>(null);

  // Modal State for "Rent" assignment
  const [isRentModalOpen, setIsRentModalOpen] = useState(false);
  const [selectedRequestForRent, setSelectedRequestForRent] = useState<EquipmentRequest | null>(null);


  // --- Handlers ---

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('DASHBOARD');
  };

  const handleAddRequest = (req: EquipmentRequest) => {
    setRequests(prev => [req, ...prev]);
  };

  const updateStatusSimple = (id: string, status: RequestStatus) => {
      setRequests(prev => prev.map(req => {
        if (req.id === id) {
          return { ...req, status };
        }
        return req;
      }));
  };

  const handleUpdateBuyDetails = (id: string, details: Partial<BuyDetails>) => {
      setRequests(prev => prev.map(req => {
          if (req.id === id) {
              const currentDetails = req.buyDetails || { vendor: '', deliveryDate: '' };
              return { 
                  ...req, 
                  buyDetails: { ...currentDetails, ...details } 
              };
          }
          return req;
      }));
  };

  const handleMarkAsCompleted = (id: string) => {
    setRequests(prev => prev.map(req => {
        if (req.id === id) {
            return {
                ...req,
                status: RequestStatus.COMPLETED,
                fulfillmentType: req.status // Record what state it was in before completing
            };
        }
        return req;
    }));
  };

  // UO Management Handlers
  const handleAddUO = (name: string) => {
    if (!uos.includes(name)) {
      setUos(prev => [...prev, name]);
    }
  };

  const handleDeleteUO = (name: string) => {
    setUos(prev => prev.filter(uo => uo !== name));
  };

  const handleEditUO = (oldName: string, newName: string) => {
     setUos(prev => prev.map(uo => uo === oldName ? newName : uo));
  };

  // Category Management Handlers
  const handleAddCategory = (name: string) => {
    if (!categories.includes(name)) {
      setCategories(prev => [...prev, name]);
    }
  };

  const handleDeleteCategory = (name: string) => {
    setCategories(prev => prev.filter(c => c !== name));
  };

  const handleEditCategory = (oldName: string, newName: string) => {
     setCategories(prev => prev.map(c => c === oldName ? newName : c));
  };

  // Own Assignment Logic (With Splitting)
  const initiateOwnAssignment = (req: EquipmentRequest) => {
    setSelectedRequestForOwn(req);
    setIsOwnModalOpen(true);
  };

  const confirmOwnAssignment = (detailsList: OwnDetails[]) => {
    if (!selectedRequestForOwn) return;
    
    const count = detailsList.length;
    
    // Create new requests for assigned items
    const newAssignedRequests: EquipmentRequest[] = detailsList.map(detail => ({
        ...selectedRequestForOwn,
        id: crypto.randomUUID(),
        quantity: 1,
        status: RequestStatus.OWN,
        ownDetails: detail
    }));

    setRequests(prev => {
        // Remove the original if fully assigned, or decrement quantity if partially assigned
        let updatedRequests = prev.filter(r => r.id !== selectedRequestForOwn.id);
        
        if (count < selectedRequestForOwn.quantity) {
            const remainingRequest = {
                ...selectedRequestForOwn,
                quantity: selectedRequestForOwn.quantity - count
            };
            updatedRequests = [remainingRequest, ...updatedRequests];
        }

        return [...newAssignedRequests, ...updatedRequests];
    });

    setIsOwnModalOpen(false);
    setSelectedRequestForOwn(null);
  };

  // Rent Assignment Logic (With Splitting)
  const initiateRentAssignment = (req: EquipmentRequest) => {
      setSelectedRequestForRent(req);
      setIsRentModalOpen(true);
  };

  const confirmRentAssignment = (durations: number[]) => {
      if (!selectedRequestForRent) return;

      const count = durations.length;

      const newRentRequests: EquipmentRequest[] = durations.map(duration => ({
          ...selectedRequestForRent,
          id: crypto.randomUUID(),
          quantity: 1,
          status: RequestStatus.RENT,
          rentalDuration: duration
      }));

      setRequests(prev => {
          let updatedRequests = prev.filter(r => r.id !== selectedRequestForRent.id);

          if (count < selectedRequestForRent.quantity) {
              const remainingRequest = {
                  ...selectedRequestForRent,
                  quantity: selectedRequestForRent.quantity - count
              };
              updatedRequests = [remainingRequest, ...updatedRequests];
          }

          return [...newRentRequests, ...updatedRequests];
      });

      setIsRentModalOpen(false);
      setSelectedRequestForRent(null);
  };

  const handleReturnToPending = (id: string) => {
    updateStatusSimple(id, RequestStatus.PENDING);
  };

  // --- Filtering ---

  const pendingRequests = requests
    .filter(r => r.status === RequestStatus.PENDING)
    .filter(r => 
      (searchTerm === '' || 
      r.uo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (categoryFilter === '' || r.category === categoryFilter)
    );

  const stats = {
    pending: requests.filter(r => r.status === RequestStatus.PENDING).reduce((acc, curr) => acc + curr.quantity, 0),
    own: requests.filter(r => r.status === RequestStatus.OWN).length, 
    rent: requests.filter(r => r.status === RequestStatus.RENT).length,
    buy: requests.filter(r => r.status === RequestStatus.BUY).length,
    completed: requests.filter(r => r.status === RequestStatus.COMPLETED).length,
  };

  // --- Early Return for Login ---
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} validPassword={appPassword} />;
  }

  // --- Render ---

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className={`w-64 ${BRAND_GREEN} text-white flex-shrink-0 hidden md:flex flex-col`}>
        <div className="p-8 border-b border-white/10 flex flex-col items-center justify-center text-center">
            {/* Isologo */}
            <h1 
                className="text-7xl font-bold text-white tracking-tighter leading-none mb-2"
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
                GE<span className="text-6xl italic">y</span>T
            </h1>
            {/* Title */}
            <h2 className="text-sm font-medium text-white/90 uppercase tracking-wide">
                Asignación de Equipos
            </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <SidebarItem 
            active={view === 'DASHBOARD'} 
            onClick={() => setView('DASHBOARD')} 
            icon={<LayoutDashboard size={20} />} 
            label="Solicitudes" 
            count={stats.pending}
          />
          <div className="pt-6 pb-2 px-3 text-xs font-semibold uppercase text-white/50 tracking-wider">
            Reportes / Asignaciones
          </div>
          <SidebarItem 
            active={view === 'REPORT_OWN'} 
            onClick={() => setView('REPORT_OWN')} 
            icon={<Key size={20} />} 
            label="Asignación Propia" 
            count={stats.own}
          />
          <SidebarItem 
            active={view === 'REPORT_BUY'} 
            onClick={() => setView('REPORT_BUY')} 
            icon={<ShoppingCart size={20} />} 
            label="Compra" 
            count={stats.buy}
          />
          <SidebarItem 
            active={view === 'REPORT_RENT'} 
            onClick={() => setView('REPORT_RENT')} 
            icon={<Calendar size={20} />} 
            label="Alquiler" 
            count={stats.rent}
          />
          
          <div className="pt-4 mt-2 border-t border-white/10">
            <SidebarItem 
                active={view === 'COMPLETED'} 
                onClick={() => setView('COMPLETED')} 
                icon={<CheckSquare size={20} />} 
                label="Completadas" 
                count={stats.completed}
            />
          </div>
          
          <div className="flex-1"></div>
          
          <div className="pt-4 border-t border-white/10 mt-2 space-y-2">
            <SidebarItem 
              active={view === 'SETTINGS'} 
              onClick={() => setView('SETTINGS')} 
              icon={<Settings size={20} />} 
              label="Configuración" 
            />
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all text-white/60 hover:bg-[#113026] hover:text-white"
            >
                <LogOut size={20} />
                <span className="font-medium">Salir</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        
        {/* Mobile Header */}
        <div className={`md:hidden ${BRAND_GREEN} text-white p-4 flex justify-between items-center sticky top-0 z-20 shadow-md`}>
             <div className="flex items-center gap-3">
                 <div className="font-bold text-2xl" style={{ fontFamily: '"Times New Roman", Times, serif' }}>GEyT</div>
                 <div className="text-xs uppercase tracking-wide border-l border-white/30 pl-3">Asignación<br/>de Equipos</div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setView('DASHBOARD')} className={`p-2 rounded ${view === 'DASHBOARD' ? 'bg-white text-[#1B4D3E]' : 'bg-[#113026] text-white'}`}><LayoutDashboard/></button>
                <button onClick={() => setView('SETTINGS')} className={`p-2 rounded ${view === 'SETTINGS' ? 'bg-white text-[#1B4D3E]' : 'bg-[#113026] text-white'}`}><Settings/></button>
                <button onClick={handleLogout} className="p-2 rounded bg-[#113026] text-white/80"><LogOut size={18}/></button>
             </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto">
          
          {view === 'DASHBOARD' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Stats Cards (Mobile/Compact) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <StatCard label="Pendientes (Cant)" value={stats.pending} color="blue" />
                 <StatCard label="Propios" value={stats.own} color="emerald" />
                 <StatCard label="Compra" value={stats.buy} color="red" />
                 <StatCard label="Alquiler" value={stats.rent} color="amber" />
              </div>

              <RequestForm onSubmit={handleAddRequest} uoOptions={uos} categoryOptions={categories} />
              
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Package className="text-slate-500" />
                    Solicitudes Pendientes
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                     {/* Category Filter */}
                     <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select 
                            className="pl-10 pr-4 py-2 border rounded-md text-sm w-full sm:w-48 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 border-slate-300 appearance-none"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                     </div>

                     {/* Search Bar */}
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                        type="text" 
                        placeholder="Buscar por UO o descripción..." 
                        className="pl-10 pr-4 py-2 border rounded-md text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900 border-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-b">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">UO</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3">Detalle</th>
                        <th className="px-4 py-3">Cant.</th>
                        <th className="px-4 py-3">Necesidad</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingRequests.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-400">
                                No se encontraron solicitudes pendientes.
                            </td>
                        </tr>
                      ) : (
                        pendingRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">{req.requestDate}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{req.uo}</td>
                          <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                {req.category}
                              </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{req.description}</div>
                            <div className="text-xs text-slate-500">{req.comments}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{req.capacity}</td>
                          <td className="px-4 py-3 font-semibold">{req.quantity}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-red-600">{req.needDate}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                                <Button 
                                    size="sm" 
                                    variant="success" 
                                    onClick={() => initiateOwnAssignment(req)}
                                    title="Asignar Propio"
                                >
                                    Propio
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="bg-amber-500 hover:bg-amber-600 text-white" 
                                    onClick={() => initiateRentAssignment(req)}
                                    title="Enviar a Alquiler"
                                >
                                    Alquiler
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="danger" 
                                    onClick={() => updateStatusSimple(req.id, RequestStatus.BUY)}
                                    title="Enviar a Compra"
                                >
                                    Compra
                                </Button>
                            </div>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === 'REPORT_OWN' && (
            <ReportView 
                title="Asignación de Equipo Propio" 
                status={RequestStatus.OWN} 
                requests={requests} 
                onReturnToPending={handleReturnToPending}
                onMarkCompleted={handleMarkAsCompleted}
            />
          )}

          {view === 'REPORT_BUY' && (
            <ReportView 
                title="Compra de Equipos" 
                status={RequestStatus.BUY} 
                requests={requests} 
                onReturnToPending={handleReturnToPending}
                onMarkCompleted={handleMarkAsCompleted}
                onUpdateBuyDetails={handleUpdateBuyDetails}
            />
          )}

          {view === 'REPORT_RENT' && (
            <ReportView 
                title="Alquiler de Equipos" 
                status={RequestStatus.RENT} 
                requests={requests} 
                onReturnToPending={handleReturnToPending}
                onMarkCompleted={handleMarkAsCompleted}
            />
          )}

          {view === 'COMPLETED' && (
            <ReportView 
                title="Solicitudes Completadas" 
                status={RequestStatus.COMPLETED} 
                requests={requests} 
            />
          )}
          
          {view === 'SETTINGS' && (
            <SettingsView 
              uos={uos} 
              onAddUO={handleAddUO} 
              onDeleteUO={handleDeleteUO}
              onEditUO={handleEditUO}
              categories={categories}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onEditCategory={handleEditCategory}
              onChangePassword={setAppPassword}
            />
          )}

        </div>
      </main>

      <AssignOwnModal 
        isOpen={isOwnModalOpen}
        onClose={() => setIsOwnModalOpen(false)}
        onConfirm={confirmOwnAssignment}
        request={selectedRequestForOwn}
      />

      <AssignRentModal
        isOpen={isRentModalOpen}
        onClose={() => setIsRentModalOpen(false)}
        onConfirm={confirmRentAssignment}
        request={selectedRequestForRent}
      />
    </div>
  );
};

// Helper Components for Layout

const SidebarItem = ({ active, onClick, icon, label, count }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all ${
      active 
      ? 'bg-white text-[#1B4D3E] shadow-md shadow-black/10' 
      : 'text-white/80 hover:bg-[#113026] hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
    {count > 0 && (
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-[#1B4D3E] text-white' : 'bg-[#113026] text-white/90'}`}>
        {count}
      </span>
    )}
  </button>
);

const StatCard = ({ label, value, color }: any) => {
    const colors: any = {
        blue: "bg-blue-50 border-blue-200 text-blue-700",
        emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
        red: "bg-red-50 border-red-200 text-red-700",
        amber: "bg-amber-50 border-amber-200 text-amber-700"
    }
    return (
        <div className={`p-4 rounded-lg border ${colors[color]} flex flex-col items-center justify-center`}>
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs uppercase tracking-wide opacity-80">{label}</span>
        </div>
    )
}

export default App;