import React, { useState } from 'react';
import { Worker, DailyYield } from '../types';
import { 
  Leaf, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Search,
  ChevronDown,
  ChevronUp,
  Coins,
  DollarSign,
  PlusCircle,
} from 'lucide-react';

interface HarvestYieldProps {
  workers: Worker[];
  yields: DailyYield[];
  onAddYield: (yieldRecord: Omit<DailyYield, 'id'>) => void;
  onUpdateYieldStatus: (id: string, status: 'Paid' | 'Pending') => void;
  onDeleteYield: (id: string) => void;
  canEdit?: boolean;
}

export default function HarvestYieldView({ 
  workers, 
  yields, 
  onAddYield, 
  onUpdateYieldStatus, 
  onDeleteYield,
  canEdit = true
}: HarvestYieldProps) {
  
  // 1. Form States
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workerId, setWorkerId] = useState('');
  const [activity, setActivity] = useState<'Plucking' | 'Pruning' | 'Weeding' | 'Sorting' | 'Irrigation' | 'Fertilizing' | 'Other'>('Plucking');
  const [leavesPlucked, setLeavesPlucked] = useState<string>('25'); // default placeholder
  const [customRate, setCustomRate] = useState<string>(''); // if empty, defaults to worker rate
  const [cashAdvanceTaken, setCashAdvanceTaken] = useState(false);
  const [cashAdvanceAmount, setCashAdvanceAmount] = useState<string>('0');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Pending');
  const [notes, setNotes] = useState('');

  // Flat manual payment (for flat days of weeding/pruning where leaves harvested is 0)
  const [isFlatWages, setIsFlatWages] = useState(false);
  const [flatDayWage, setFlatDayWage] = useState<string>('300'); // ₹300 flat day wage

  // 2. Filter states
  const [filterDate, setFilterDate] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Paid' | 'Pending'>('');

  // 2.5 Validation & Custom Modal states
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<{ id: string; date: string; name: string } | null>(null);

  // 3. Selection auto-fill
  const selectedWorkerDef = workers.find(w => w.id === workerId);
  const activeWorkers = workers.filter(w => w.active);

  // Computed fields during entry
  const pluckingRate = customRate !== '' 
    ? Number(customRate) 
    : (selectedWorkerDef ? selectedWorkerDef.defaultRate : 6);

  const leavesWeightVal = activity === 'Plucking' ? (Number(leavesPlucked) || 0) : 0;
  
  const computedBaseEarnings = activity === 'Plucking' && !isFlatWages
    ? (leavesWeightVal * pluckingRate)
    : (Number(flatDayWage) || 0);

  const advanceVal = cashAdvanceTaken ? (Number(cashAdvanceAmount) || 0) : 0;
  const computedNetPayable = Math.max(0, computedBaseEarnings - advanceVal);

  // Form handle
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) {
      setFormError("Please select an active worker first!");
      return;
    }

    setFormError(null);

    const worker = workers.find(w => w.id === workerId);
    if (!worker) {
      setFormError("Selected worker not found or inactive.");
      return;
    }

    onAddYield({
      date,
      workerId,
      workerName: worker.name,
      activity,
      leavesPlucked: activity === 'Plucking' ? Number(leavesPlucked) || 0 : 0,
      wageRate: activity === 'Plucking' && !isFlatWages ? pluckingRate : 0,
      baseWages: computedBaseEarnings,
      cashAdvanceTaken,
      cashAdvanceAmount: advanceVal,
      netPayable: computedNetPayable,
      paymentStatus,
      notes
    });

    // Reset some fields
    setLeavesPlucked('25');
    setCashAdvanceTaken(false);
    setCashAdvanceAmount('0');
    setNotes('');
    setCustomRate('');
  };

  // Filter yields list
  const filteredYields = yields.filter(y => {
    const matchDate = filterDate ? y.date === filterDate : true;
    const matchWorker = filterWorker ? y.workerId === filterWorker : true;
    const matchStatus = filterStatus ? y.paymentStatus === filterStatus : true;
    return matchDate && matchWorker && matchStatus;
  });

  // Calculate yield statistics for the active page filter
  const sumHarvestWeight = filteredYields.reduce((sum, y) => sum + y.leavesPlucked, 0).toFixed(1);
  const sumBaseEarnings = filteredYields.reduce((sum, y) => sum + y.baseWages, 0);
  const sumAdvancesTaken = filteredYields.reduce((sum, y) => sum + y.cashAdvanceAmount, 0);
  const sumNetPayable = filteredYields.reduce((sum, y) => sum + y.netPayable, 0);

  return (
    <div className="space-y-8" id="harvest-yield-container">
      {/* Upper Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 border-leaf-200">
        <div>
          <h1 className="text-3xl font-display font-medium text-leaf-900 tracking-tight flex items-center gap-2">
            <Leaf className="w-8 h-8 text-leaf-600 animate-pulse" /> Daily Harvesting Ledger
          </h1>
          <p className="text-gray-500 mt-1 font-sans">
            Log daily pluck statistics (kg), task activity (weeding/pruning), cash advances, and pay commissions.
          </p>
        </div>
      </div>

      {/* Grid Layout: Left is Form Entry, Right is Ledger Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Entry Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-2xs self-start">
          <h2 className="text-lg font-display font-semibold text-gray-900 mb-4 flex items-center gap-1.5 border-b pb-3 border-gray-50">
            <PlusCircle className="w-5 h-5 text-leaf-700" /> New Operations Entry
          </h2>

          {canEdit ? (
            <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date of Work</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-mono"
                />
              </div>
            </div>

            {/* 2. Worker Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Worker</label>
              <select
                required
                value={workerId}
                onChange={(e) => {
                  setWorkerId(e.target.value);
                  setCustomRate(''); // reset custom rate when switching worker
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 bg-white font-sans"
              >
                <option value="">-- Choose registered worker --</option>
                {activeWorkers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.role} • default ₹{w.defaultRate}/kg)
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Activity and Base Wage type switch */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Activity</label>
                <select
                  value={activity}
                  onChange={(e) => {
                    const act = e.target.value as any;
                    setActivity(act);
                    if (act !== 'Plucking') {
                      setIsFlatWages(true);
                    } else {
                      setIsFlatWages(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 bg-white font-sans"
                >
                  <option value="Plucking">Plucking</option>
                  <option value="Pruning">Pruning</option>
                  <option value="Weeding">Weeding</option>
                  <option value="Sorting">Sorting</option>
                  <option value="Irrigation">Irrigation</option>
                  <option value="Fertilizing">Fertilizing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Wage Calculation</label>
                <select
                  value={isFlatWages ? 'flat' : 'by-weight'}
                  disabled={activity !== 'Plucking'}
                  onChange={(e) => {
                    setIsFlatWages(e.target.value === 'flat');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 bg-white font-sans disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="by-weight">By Pluck Weight (kg)</option>
                  <option value="flat">Flat Day Wage Rate</option>
                </select>
              </div>
            </div>

            {/* Variable wage fields depending on selection */}
            {!isFlatWages ? (
              // Case: Hourly/By Kilogram Pluck (Standard)
              <div className="grid grid-cols-2 gap-4 p-3 bg-leaf-50 rounded-lg border border-leaf-100 animate-in slide-in-from-top-1 duration-150">
                <div>
                  <label className="block text-2xs font-semibold text-leaf-900 uppercase tracking-wide mb-1">Pluck Yield (kg)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0.1"
                      max="200"
                      step="0.1"
                      value={leavesPlucked}
                      onChange={(e) => setLeavesPlucked(e.target.value)}
                      className="w-full pr-7 pl-3 py-1.5 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:border-leaf-600 font-mono font-semibold text-leaf-900"
                    />
                    <span className="absolute right-2 top-2 text-xs text-leaf-700 font-medium">kg</span>
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-leaf-900 uppercase tracking-wide mb-1">
                    Rate ₹/{activity === 'Plucking' ? 'kg' : 'unit'}
                  </label>
                  <input
                    type="number"
                    placeholder={`Worker def: ₹${selectedWorkerDef?.defaultRate || 6}`}
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:border-leaf-600 font-mono text-gray-800"
                  />
                </div>
              </div>
            ) : (
              // Case: Flat day rate (e.g. for weeding, pruning, sorting helper chores)
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 animate-in slide-in-from-top-1 duration-150">
                <label className="block text-2xs font-semibold text-harvest-800 uppercase tracking-wide mb-1">Flat Daily Wage (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-harvest-800 font-mono">₹</span>
                  <input
                    type="number"
                    required
                    min="10"
                    max="5000"
                    value={flatDayWage}
                    onChange={(e) => setFlatDayWage(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 border border-gray-200 bg-white rounded text-sm focus:outline-none focus:border-harvest-600 font-mono font-semibold text-gray-900"
                  />
                </div>
                <p className="text-3xs text-gray-400 mt-1">
                  Applies flat day rate (e.g. ₹300-400) regardless of pluck weight.
                </p>
              </div>
            )}

            {/* 4. Cash Advance Section ("workers took money today or not how much money today") */}
            <div className="p-4 bg-orange-50/75 rounded-lg border border-orange-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-orange-950 uppercase tracking-wide flex items-center gap-1">
                  <Coins className="w-4 h-4 text-orange-700" /> Cash Advance Taken Today?
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={cashAdvanceTaken} 
                    onChange={(e) => {
                      setCashAdvanceTaken(e.target.checked);
                      if (!e.target.checked) setCashAdvanceAmount('0');
                    }}
                    className="sr-only peer"
                    id="cash-advance-toggle"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {cashAdvanceTaken && (
                <div className="animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-2xs font-semibold text-orange-900 mb-1">Advance Amount Taken (rupees)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-orange-700 font-mono">₹</span>
                    <input
                      type="number"
                      required
                      min="5"
                      max="2000"
                      step="5"
                      value={cashAdvanceAmount}
                      onChange={(e) => setCashAdvanceAmount(e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-orange-600 font-mono font-semibold"
                      id="cash-advance-input"
                    />
                  </div>
                  <p className="text-3xs text-orange-850 mt-1">
                    Value will be deducted from daily base earnings immediately.
                  </p>
                </div>
              )}
            </div>

            {/* 5. Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Session Notes / Sector</label>
              <textarea
                placeholder="Sector A, special tea leaf variety, helper status, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-leaf-600 font-sans h-16 resize-none"
              />
            </div>

            {/* Net Payout Summary (Real-time calculation box) */}
            <div className="p-4 rounded-lg bg-gray-50/70 border border-gray-150 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Base Wage Earnings:</span>
                <span className="font-mono font-semibold">₹{computedBaseEarnings.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-orange-700 border-b pb-2 mb-2 border-gray-150">
                <span>Advance Deduction:</span>
                <span className="font-mono font-semibold">-₹{advanceVal.toFixed(1)}</span>
              </div>
              <div className="flex justify-between font-semibold text-sm text-gray-900">
                <span>Net Payable for Today:</span>
                <span id="payout-computed-rate" className="font-mono text-leaf-700">₹{computedNetPayable.toFixed(1)}</span>
              </div>
            </div>

            {/* 6. Initial Status Select */}
            <div className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-lg border">
              <span className="text-xs font-semibold text-gray-500">Initial Payout Status:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="status"
                    checked={paymentStatus === 'Pending'}
                    onChange={() => setPaymentStatus('Pending')}
                    className="accent-amber-600"
                  />
                  Pending
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="status"
                    checked={paymentStatus === 'Paid'}
                    onChange={() => setPaymentStatus('Paid')}
                    className="accent-emerald-700"
                  />
                  Paid
                </label>
              </div>
            </div>

            {/* Submit */}
            {formError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg text-xs font-semibold font-sans animate-in fade-in duration-150">
                {formError}
              </div>
            )}

            <button
              id="submit-yield-btn"
              type="submit"
              className="w-full px-4 py-2.5 bg-leaf-700 hover:bg-leaf-600 text-white rounded-lg text-sm font-semibold transition tracking-wider uppercase text-center cursor-pointer"
            >
              Add Ledger Row
            </button>
            </form>
          ) : (
            <div className="py-6 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                🔒
              </div>
              <h3 className="text-xs font-bold text-slate-850 font-sans uppercase tracking-wider">Logging Locked</h3>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans">
                Valley Moss Estates is operating in view-only spectator mode. Only validated estate administrators can log daily plucking yields or register wage entries.
              </p>
              <div className="mt-4 border-t border-slate-200/60 pt-4 text-[10px] font-mono text-slate-500 text-left space-y-1.5">
                <span className="block font-semibold uppercase tracking-wider text-[9px] text-slate-650">Approved Admins:</span>
                <span className="block select-all font-medium text-slate-800">yougrajbora1@gmail.com</span>
                <span className="block select-all font-medium text-slate-800">yougrajbora.developer@gmail.com</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Logged Entries Table */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Statistical mini-cards of active filter view */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
              <div className="text-3xs text-gray-400 font-sans uppercase tracking-wider">Harvest weight</div>
              <div className="text-base font-mono font-bold text-leaf-800 mt-1">{sumHarvestWeight} kg</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
              <div className="text-3xs text-gray-400 font-sans uppercase tracking-wider">Gross Wages</div>
              <div className="text-base font-mono font-bold text-gray-900 mt-1">₹{sumBaseEarnings.toFixed(0)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
              <div className="text-3xs text-gray-400 font-sans uppercase tracking-wider">Advances Issued</div>
              <div className="text-base font-mono font-bold text-orange-700 mt-1">₹{sumAdvancesTaken.toFixed(0)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
              <div className="text-3xs text-gray-400 font-sans uppercase tracking-wider">Net Outstanding</div>
              <div className="text-base font-mono font-bold text-amber-600 mt-1">₹{sumNetPayable.toFixed(0)}</div>
            </div>
          </div>

          {/* Interactive Filtering Row Grid */}
          <div className="bg-white p-4 rounded-xl border border-gray-150 flex flex-wrap gap-4 items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
              Filter List:
            </span>
            
            {/* Filter Date */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-md font-mono"
            />

            {/* Filter Worker */}
            <select
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white font-sans"
            >
              <option value="">All Workers</option>
              {workers.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {/* Filter Payout Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded-md bg-white font-sans"
            >
              <option value="">All Payout status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Reset buttons */}
            {(filterDate || filterWorker || filterStatus) && (
              <button
                onClick={() => {
                  setFilterDate('');
                  setFilterWorker('');
                  setFilterStatus('');
                }}
                className="text-2xs text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Detailed tabular ledger entries list */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-gray-50/55 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold text-gray-800">Operational Daily Logs</h3>
              <span className="text-2xs text-gray-400 font-mono">Row Total: {filteredYields.length} entries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-mono text-3xs uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Worker Name</th>
                    <th className="px-6 py-3.5">Task Description</th>
                    <th className="px-6 py-3.5 text-right">Leaves (kg)</th>
                    <th className="px-6 py-3.5 text-right">Base Wage (₹)</th>
                    <th className="px-6 py-3.5 text-right">Advance (₹)</th>
                    <th className="px-6 py-3.5 text-right">Net Owed (₹)</th>
                    <th className="px-6 py-3.5 text-center">Payment Status</th>
                    {canEdit && <th className="px-6 py-3.5 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredYields.slice().reverse().map((y) => (
                    <tr key={y.id} className="hover:bg-gray-50/30 transition">
                      <td className="px-6 py-4 font-mono text-gray-900 whitespace-nowrap">{y.date}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{y.workerName}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{y.activity}</div>
                        {y.notes && <p className="text-3xs text-gray-400 line-clamp-1 mt-0.5">{y.notes}</p>}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900 font-bold">
                        {y.leavesPlucked > 0 ? `${y.leavesPlucked} kg` : '-'}
                        {y.leavesPlucked > 0 && y.wageRate > 0 && (
                          <div className="text-3xs text-gray-400 font-normal mt-0.5">@ ₹{y.wageRate}/kg</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900">₹{y.baseWages.toFixed(0)}</td>
                      <td className="px-6 py-4 text-right font-mono text-orange-700 whitespace-nowrap">
                        {y.cashAdvanceTaken ? `-₹${y.cashAdvanceAmount.toFixed(0)}` : 'No'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">₹{y.netPayable.toFixed(0)}</td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {canEdit ? (
                          <button
                            onClick={() => {
                              const toggledStatus = y.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
                              onUpdateYieldStatus(y.id, toggledStatus);
                            }}
                            className={`inline-flex items-center gap-1 text-3xs font-semibold px-2 py-1 rounded-full cursor-pointer hover:scale-105 transition ${
                              y.paymentStatus === 'Paid' 
                                ? 'bg-[#e8f5e9] text-[#1b5e20] border border-[#a5d6a7]' 
                                : 'bg-[#fff3e0] text-[#e65100] border border-[#ffcc80]'
                            }`}
                            title="Click to toggle payment authorization status"
                          >
                            {y.paymentStatus === 'Paid' ? (
                              <>
                                <CheckCircle className="w-2.5 h-2.5" /> Paid
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-2.5 h-2.5" /> Pending/Pay
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-3xs font-semibold px-2 py-1 rounded-full border ${
                              y.paymentStatus === 'Paid' 
                                ? 'bg-[#e8f5e9] text-[#1b5e20] border-[#a5d6a7]' 
                                : 'bg-[#fff3e0] text-[#e65100] border-[#ffcc80]'
                            }`}
                          >
                            {y.paymentStatus === 'Paid' ? (
                              <><CheckCircle className="w-2.5 h-2.5" /> Paid</>
                            ) : (
                              <><AlertCircle className="w-2.5 h-2.5 text-amber-600" /> Pending</>
                            )}
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setConfirmDeleteRecord({ id: y.id, date: y.date, name: y.workerName });
                            }}
                            className="p-1 px-2 rounded hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete entry row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {filteredYields.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400 font-sans italic">
                        No operational daily logs exist for selected filters. Choose alternate filters or register some harvest records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* State-Based Premium Confirmation Modal */}
      {confirmDeleteRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Confirm Ledger Deletion</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Are you sure you want to delete this daily harvest ledger entry logged on <strong className="text-gray-900">{confirmDeleteRecord.date}</strong> for <strong className="text-gray-900">{confirmDeleteRecord.name}</strong>?
                </p>
                <p className="text-3xs text-rose-600 mt-1.5 font-medium">This action is irreversible and will remove the record instantly from local database.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmDeleteRecord(null)}
                className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs font-semibold font-sans transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteYield(confirmDeleteRecord.id);
                  setConfirmDeleteRecord(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold font-sans transition cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
