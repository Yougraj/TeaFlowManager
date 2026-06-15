import React, { useState } from 'react';
import { Worker, DailyYield } from '../types';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Phone, 
  Briefcase, 
  IndianRupee, 
  Trash2, 
  Search, 
  CheckCircle, 
  MinusCircle, 
  Plus, 
  X,
  TrendingUp,
  Coins
} from 'lucide-react';

interface WorkersProps {
  workers: Worker[];
  yields: DailyYield[];
  onAddWorker: (worker: Omit<Worker, 'id' | 'createdAt'>) => void;
  onUpdateWorker: (worker: Worker) => void;
  canEdit?: boolean;
}

export default function WorkersView({ workers, yields, onAddWorker, onUpdateWorker, canEdit = true }: WorkersProps) {
  // Local states
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWorkerForEdit, setSelectedWorkerForEdit] = useState<Worker | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultRate, setDefaultRate] = useState(6);
  const [role, setRole] = useState<'Plucker' | 'Weeder' | 'Pruner' | 'Supervisor' | 'Other'>('Plucker');

  // Search filter
  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.phone.includes(searchTerm) ||
    w.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Math helper for individual workers
  const getWorkerStats = (workerId: string) => {
    const workerLogs = yields.filter(y => y.workerId === workerId);
    const totalPlucked = workerLogs.reduce((acc, y) => acc + y.leavesPlucked, 0);
    const totalEarned = workerLogs.reduce((acc, y) => acc + y.baseWages, 0);
    const totalAdvancesTaken = workerLogs.reduce((acc, y) => acc + y.cashAdvanceAmount, 0);
    const outstandingPayable = workerLogs
      .filter(y => y.paymentStatus === 'Pending')
      .reduce((acc, y) => acc + y.netPayable, 0);

    return {
      totalPlucked: parseFloat(totalPlucked.toFixed(1)),
      totalEarned: Math.round(totalEarned),
      totalAdvancesTaken: Math.round(totalAdvancesTaken),
      outstandingPayable: Math.round(outstandingPayable)
    };
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddWorker({
      name,
      phone: phone || 'N/A',
      defaultRate: Number(defaultRate) || 6,
      role,
      active: true
    });
    // Reset Form
    setName('');
    setPhone('');
    setDefaultRate(6);
    setRole('Plucker');
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForEdit) return;
    onUpdateWorker(selectedWorkerForEdit);
    setSelectedWorkerForEdit(null);
  };

  return (
    <div className="space-y-8" id="workers-container">
      {/* 1. Header and search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 border-leaf-200">
        <div>
          <h1 className="text-3xl font-display font-medium text-leaf-900 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-leaf-600" /> Employee Roster
          </h1>
          <p className="text-gray-500 mt-1 font-sans">
            Add pluckers/staff, set default per-kilogram commission wages (e.g. ₹6/kg), and analyze worker stats.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              id="worker-search-input"
              type="text"
              placeholder="Search by worker name, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 w-full md:w-64 font-sans"
            />
          </div>
          
          {canEdit ? (
            <button
              id="add-worker-btn"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-leaf-700 hover:bg-leaf-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Register Worker
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-400 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 cursor-not-allowed select-none"
              title="Admin access required to register workers"
            >
              🔒 Register Employee
            </button>
          )}
        </div>
      </div>

      {/* 2. Worker Grid / Roster List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="worker-cards-grid">
        {filteredWorkers.map(w => {
          const stats = getWorkerStats(w.id);
          return (
            <div 
              key={w.id} 
              className={`bg-white rounded-xl border p-6 flex flex-col justify-between transition hover:shadow-xs hover:border-leaf-200 ${
                !w.active ? 'opacity-70 saturate-50 border-gray-150 bg-gray-50/20' : 'border-gray-100'
              }`}
              id={`worker-card-${w.id}`}
            >
              <div>
                {/* Header card info */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-display font-semibold text-gray-900 flex items-center gap-1.5">
                      {w.name}
                      {!w.active && (
                        <span className="text-3xs font-sans uppercase font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          Resigned
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 font-sans">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                      <span>{w.role}</span>
                    </div>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded-full text-3xs font-mono font-bold tracking-wider uppercase ${
                    w.active ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    ₹{w.defaultRate}/kg
                  </span>
                </div>

                {/* Contact and Join Date */}
                <div className="space-y-2 mb-6 border-b pb-4 border-gray-50">
                  <div className="flex items-center gap-2 text-xs text-gray-600 font-sans">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{w.phone}</span>
                  </div>
                  <div className="text-2xs text-gray-400 font-mono">
                    Registered: {w.createdAt}
                  </div>
                </div>

                {/* Mini operational ledger info */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <div className="text-gray-400 text-2xs uppercase tracking-wider">Harvested Lefts</div>
                    <div className="font-mono font-bold text-leaf-800 mt-0.5 flex items-center gap-0.5">
                      <TrendingUp className="w-3.5 h-3.5" /> {stats.totalPlucked} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-2xs uppercase tracking-wider">Total Earned</div>
                    <div className="font-mono font-bold text-gray-900 mt-0.5">
                      ₹{stats.totalEarned}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-2xs uppercase tracking-wider">Cash Advances Taken</div>
                    <div className="font-mono font-bold text-orange-700 mt-0.5">
                      ₹{stats.totalAdvancesTaken}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-2xs uppercase tracking-wider">Net Outstanding</div>
                    <div className={`font-mono font-bold mt-0.5 ${stats.outstandingPayable > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                      ₹{stats.outstandingPayable}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Worker card */}
              {canEdit && (
                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setSelectedWorkerForEdit(w);
                    }}
                    className="px-3 py-1.5 rounded bg-gray-50 hover:bg-gray-150 border border-gray-150 text-gray-700 hover:text-gray-900 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Edit className="w-3 h-3" /> Edit Profile
                  </button>
                  
                  <button
                    onClick={() => {
                      onUpdateWorker({
                        ...w,
                        active: !w.active
                      });
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                      w.active 
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-150'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-150'
                    }`}
                  >
                    {w.active ? (
                      <>
                        <MinusCircle className="w-3.5 h-3.5" /> Suspend
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> Re-activate
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredWorkers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-sans">No workers found matching your filter criteria.</p>
            <p className="text-gray-400 text-xs mt-1 font-sans">Register a new worker or refine your search input.</p>
          </div>
        )}
      </div>

      {/* 3. Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-4 border-gray-100 mb-5">
              <h3 className="text-xl font-display font-medium text-gray-900">Register New Team Member</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bahadur Tamang"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Worker Job Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-sans bg-white"
                  >
                    <option value="Plucker">Plucker</option>
                    <option value="Weeder">Weeder</option>
                    <option value="Pruner">Pruner</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Default Plucking Wage Rate (₹ per Kg plucked)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400 font-mono">₹</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    required
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-mono"
                  />
                </div>
                <p className="text-2xs text-gray-400 mt-1">
                  Typically ranges from ₹5 to ₹12 per kg across Darjeeling/Assam tea estates.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-leaf-700 hover:bg-leaf-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Save Worker Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Worker Modal */}
      {selectedWorkerForEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-4 border-gray-100 mb-5">
              <h3 className="text-xl font-display font-medium text-gray-900">Update Employee Details</h3>
              <button 
                onClick={() => setSelectedWorkerForEdit(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={selectedWorkerForEdit.name}
                  onChange={(e) => setSelectedWorkerForEdit({
                    ...selectedWorkerForEdit,
                    name: e.target.value
                  })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={selectedWorkerForEdit.phone}
                    onChange={(e) => setSelectedWorkerForEdit({
                      ...selectedWorkerForEdit,
                      phone: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Role</label>
                  <select
                    value={selectedWorkerForEdit.role}
                    onChange={(e) => setSelectedWorkerForEdit({
                      ...selectedWorkerForEdit,
                      role: e.target.value as any
                    })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-sans bg-white"
                  >
                    <option value="Plucker">Plucker</option>
                    <option value="Weeder">Weeder</option>
                    <option value="Pruner">Pruner</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Default Wage Rate (₹ per Kg plucked)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-gray-400 font-mono">₹</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    required
                    value={selectedWorkerForEdit.defaultRate}
                    onChange={(e) => setSelectedWorkerForEdit({
                      ...selectedWorkerForEdit,
                      defaultRate: Number(e.target.value)
                    })}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedWorkerForEdit(null)}
                  className="px-4 py-2 border rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-leaf-700 hover:bg-leaf-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Update Information
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
