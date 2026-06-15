import React, { useState } from 'react';
import { Sale } from '../types';
import { 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  Percent, 
  Search, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpRight,
  PackageCheck
} from 'lucide-react';

interface SalesProps {
  sales: Sale[];
  onAddSale: (sale: Omit<Sale, 'id'>) => void;
  onDeleteSale: (id: string) => void;
  canEdit?: boolean;
}

export default function SalesView({ sales, onAddSale, onDeleteSale, canEdit = true }: SalesProps) {
  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [teaType, setTeaType] = useState('Raw Fresh Leaves');
  const [quantityStr, setQuantityStr] = useState('100');
  const [pricePerKgStr, setPricePerKgStr] = useState('45');
  const [buyerName, setBuyerName] = useState('');
  const [notes, setNotes] = useState('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Safe Deleter State
  const [confirmDeleteSale, setConfirmDeleteSale] = useState<{ id: string; invoiceNo: string; buyer: string } | null>(null);

  // Computed math
  const quantity = Number(quantityStr) || 0;
  const pricePerKg = Number(pricePerKgStr) || 0;
  const computedTotalAmount = quantity * pricePerKg;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim()) return;

    // Generate unique invoice number if not provided
    const finalInvoiceNo = invoiceNo.trim() !== ''
      ? invoiceNo.trim()
      : `INV-${Date.now().toString().slice(-6)}`;

    onAddSale({
      date,
      invoiceNo: finalInvoiceNo,
      teaType,
      quantity,
      pricePerKg,
      totalAmount: computedTotalAmount,
      buyerName,
      notes
    });

    // Reset Form
    setInvoiceNo('');
    setBuyerName('');
    setNotes('');
    setQuantityStr('100');
    setPricePerKgStr('45');
  };

  // Math totals for sales view
  const sumSalesWeight = sales.reduce((sum, s) => sum + s.quantity, 0);
  const sumRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const avgTradeRate = sumSalesWeight > 0 ? (sumRevenue / sumSalesWeight).toFixed(1) : '0';

  // Search filter implementation
  const filteredSales = sales.filter(s => 
    s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.teaType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.buyerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8" id="sales-container">
      {/* Upper Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 border-leaf-200">
        <div>
          <h1 className="text-3xl font-display font-medium text-leaf-900 tracking-tight flex items-center gap-2">
            <PackageCheck className="w-8 h-8 text-leaf-600" /> Tea Trade & Sales Ledger
          </h1>
          <p className="text-gray-500 mt-1 font-sans">
            Record raw tea leave trades and finished value-processed leaf shipments to domestic cooperatives and global wholesalers.
          </p>
        </div>
      </div>

      {/* Stats summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-150 flex items-center gap-4">
          <div className="p-3 bg-leaf-50 text-leaf-700 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Product Traded</div>
            <div className="text-xl font-mono font-bold text-gray-900 mt-0.5" id="sales-weight-total">{sumSalesWeight.toLocaleString()} kg</div>
            <div className="text-3xs text-gray-400 mt-0.5">Accumulated dispatch volume</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-150 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-harvest-800 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Accumulated Sales Value</div>
            <div className="text-xl font-mono font-bold text-gray-900 mt-0.5" id="sales-revenue-total">₹{sumRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="text-3xs text-gray-400 mt-0.5">Rupees processed in estate invoices</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-150 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Dispatch Rate</div>
            <div className="text-xl font-mono font-bold text-gray-900 mt-0.5">₹{avgTradeRate}/kg</div>
            <div className="text-3xs text-gray-400 mt-0.5">Blended average selling rate</div>
          </div>
        </div>
      </div>

      {/* Left panel is trade form, right panel is transaction log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* New Trade Form */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-5xs self-start">
          <h2 className="text-lg font-display font-semibold text-gray-900 mb-4 flex items-center gap-1.5 border-b pb-3 border-gray-50">
            <PlusCircle className="w-5 h-5 text-leaf-700" /> Log Tea Leaf Sale
          </h2>

          {canEdit ? (
            <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* 1. Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Sale Date</label>
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

            {/* 2. Client Buyer Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Buyer / Wholesaler Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Himalayan Premium Blenders"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-sans"
              />
            </div>

            {/* 3. Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Invoice Number <span className="text-3xs text-gray-400 normal-case">(leave blank to auto-generate)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-004"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 font-mono"
              />
            </div>

            {/* 4. Product Tea Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tea Category product</label>
              <select
                value={teaType}
                onChange={(e) => setTeaType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-leaf-600 bg-white font-sans"
              >
                <option value="Raw Fresh Leaves">Raw Fresh Leaves (Unprocessed Plucks)</option>
                <option value="Processed Black CTC">Processed Black CTC (Bulk Bags)</option>
                <option value="Processed Green Tea">Processed Green Tea (Vibrant Leaf)</option>
                <option value="Orthoveda White Leaves">White Organic Leaves (Premium Buds)</option>
                <option value="Assam Orthodox Second Flush">Assam Orthodox Second Flush</option>
              </select>
            </div>

            {/* 5. Quantities (kg and Price/kg) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Product Qty (kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    required
                    value={quantityStr}
                    onChange={(e) => setQuantityStr(e.target.value)}
                    className="w-full pr-7 pl-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-leaf-600 font-mono font-semibold"
                  />
                  <span className="absolute right-2 top-2 text-xs text-gray-400">kg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price per kg (₹)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-mono">₹</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    required
                    value={pricePerKgStr}
                    onChange={(e) => setPricePerKgStr(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-leaf-600 font-mono font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Automated computation summary */}
            <div className="p-4 bg-amber-50/55 rounded-lg border border-harvest-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-harvest-800">Total Invoice Amount:</span>
              <div className="text-right">
                <div className="text-base font-mono font-bold text-gray-900" id="sale-total-computed">
                  ₹{computedTotalAmount.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                </div>
                <div className="text-3xs text-gray-400 font-mono">
                  {quantity} kg x ₹{pricePerKg}/kg
                </div>
              </div>
            </div>

            {/* 6. Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Trade Notes / Shipping Info</label>
              <textarea
                placeholder="Cargo container details, dispatch moisture readings, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-leaf-600 font-sans h-16 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              id="submit-sale-btn"
              type="submit"
              className="w-full px-4 py-2.5 bg-leaf-700 hover:bg-leaf-600 text-white rounded-lg text-sm font-semibold transition tracking-wider uppercase text-center cursor-pointer"
            >
              Sign Invoice Shipment
            </button>
            </form>
          ) : (
            <div className="py-6 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
                🔒
              </div>
              <h3 className="text-xs font-bold text-slate-850 font-sans uppercase tracking-wider">Invoices Locked</h3>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans">
                Valley Moss Estates is operating in view-only spectator mode. Only authorized sales team managers can log dispatch sheets or record wholesale invoices.
              </p>
              <div className="mt-4 border-t border-slate-200/60 pt-4 text-[10px] font-mono text-slate-500 text-left space-y-1.5">
                <span className="block font-semibold uppercase tracking-wider text-[9px] text-slate-650">Approved Admins:</span>
                <span className="block select-all font-medium text-slate-800">yougrajbora1@gmail.com</span>
                <span className="block select-all font-medium text-slate-800">yougrajbora.developer@gmail.com</span>
              </div>
            </div>
          )}
        </div>

        {/* Sales Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filtering & Search Row */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sales transactions by buyer, invoice, tea type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-gray-250 rounded-lg text-sm focus:outline-none focus:border-leaf-600 w-full font-sans"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
            <div className="px-6 py-4 bg-gray-50/55 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-display font-semibold text-gray-800">Invoiced Tea Trades</h3>
              <span className="text-2xs text-gray-400 font-mono">Total Sales: {filteredSales.length} trades</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans text-gray-600 animate-in fade-in duration-200">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-mono text-3xs uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Invoice No.</th>
                    <th className="px-6 py-3.5">Buyer Client</th>
                    <th className="px-6 py-3.5">Tea Category</th>
                    <th className="px-6 py-3.5 text-right">Quantity (kg)</th>
                    <th className="px-6 py-3.5 text-right">Price per kg</th>
                    <th className="px-6 py-3.5 text-right">Total Amount (₹)</th>
                    {canEdit && <th className="px-6 py-3.5 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSales.slice().reverse().map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/20 transition">
                      <td className="px-6 py-4 font-mono text-gray-900 whitespace-nowrap">{s.date}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-leaf-800 whitespace-nowrap">{s.invoiceNo}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{s.buyerName}</div>
                        {s.notes && <p className="text-3xs text-gray-400 line-clamp-1 mt-0.5">{s.notes}</p>}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{s.teaType}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900 font-semibold">{s.quantity.toLocaleString()} kg</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-900">₹{s.pricePerKg.toFixed(0)}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                        ₹{s.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              setConfirmDeleteSale({ id: s.id, invoiceNo: s.invoiceNo, buyer: s.buyerName });
                            }}
                            className="p-1 px-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete sale invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}

                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7} className="text-center py-10 text-gray-400 font-sans italic">
                        No trade invoices logged matching current search keyword.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* State-Based Premium Sales Deletion Confirmation Modal */}
      {confirmDeleteSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Cancel & Delete Trade Invoice</h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  Are you sure you want to cancel and delete the trade ledger row invoice <strong className="text-gray-900">{confirmDeleteSale.invoiceNo}</strong> to buyer <strong className="text-gray-900">{confirmDeleteSale.buyer}</strong>?
                </p>
                <p className="text-3xs text-rose-600 mt-1.5 font-medium font-sans">This transaction will be voided instantly from your estate books.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setConfirmDeleteSale(null)}
                className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs font-semibold font-sans transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSale(confirmDeleteSale.id);
                  setConfirmDeleteSale(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold font-sans transition cursor-pointer"
              >
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
