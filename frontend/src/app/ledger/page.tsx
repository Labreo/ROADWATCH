'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface ContractRecord {
  id: string;
  organisationName: string;
  tenderRefNo: string;
  tenderDescription: string;
  tenderDocument: string;
  tenderType: string;
  bidsReceived: number;
  selectedBidder: string;
  contractValue: number;
  publishedDate: string;
  contractDate: string;
  category: 'NH' | 'SH';
  year: number;
  selectedBidderAddress?: string;
  completionPeriod?: string;
  state: string;
}

const STATES_LIST = [
  'Arunachal Pradesh', 'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
].sort();

function formatINR(value: number): string {
  if (value === 0) return '₹0 Cr';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  return `₹${(value / 100000).toFixed(1)} Lakhs`;
}

function StatCard({ title, value, desc, icon }: { title: string; value: string | number; desc: string; icon: string }) {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-2 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-cyan-500/35 transition duration-300">
      <div className="absolute top-2 right-2 text-2xl opacity-15 group-hover:scale-110 transition duration-300">{icon}</div>
      <div>
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">{title}</span>
        <h4 className="text-3xl font-extrabold tracking-tight mt-1 text-white">{value}</h4>
      </div>
      <p className="text-slate-400 text-[11px] leading-relaxed pt-2 border-t border-slate-800/40">{desc}</p>
    </div>
  );
}

export default function LedgerPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(100);
  const [aggregates, setAggregates] = useState({ totalSpend: 0, totalContracts: 0, activeBidders: 0 });

  const totalPages = Math.ceil(contracts.length / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedContracts = contracts.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/contracts_store.json');
      if (!res.ok) throw new Error('API error');
      const allContracts = await res.json() as ContractRecord[];
      
      // Filter client-side
      let filtered = allContracts;
      if (selectedCategory === 'NH') {
        filtered = filtered.filter(c => c.category === 'NH');
      } else if (selectedCategory === 'SH') {
        filtered = filtered.filter(c => c.category === 'SH');
        if (selectedState !== 'all') {
          filtered = filtered.filter(c => c.state.toLowerCase() === selectedState.toLowerCase());
        }
      }

      if (selectedYear !== 'all') {
        const yearNum = parseInt(selectedYear, 10);
        filtered = filtered.filter(c => c.year === yearNum);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(c =>
          (c.tenderDescription || '').toLowerCase().includes(q) ||
          (c.tenderRefNo || '').toLowerCase().includes(q) ||
          (c.selectedBidder || '').toLowerCase().includes(q) ||
          (c.organisationName || '').toLowerCase().includes(q) ||
          (c.state || '').toLowerCase().includes(q)
        );
      }

      // Calculate aggregates
      const totalSpend = filtered.reduce((sum, c) => sum + (c.contractValue || 0), 0);
      const activeBidders = new Set(filtered.filter(c => c.selectedBidder).map(c => c.selectedBidder)).size;

      setContracts(filtered);
      setAggregates({
        totalSpend,
        totalContracts: filtered.length,
        activeBidders,
      });
    } catch (err) {
      setToast({ message: 'Failed to load contract records.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContracts(); setCurrentPage(1); }, [selectedCategory, selectedYear, selectedState, searchQuery]);
  useEffect(() => { if (selectedCategory !== 'SH') setSelectedState('all'); }, [selectedCategory]);

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020817]/95 backdrop-blur border-b border-slate-800/60 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-sm font-bold text-white tracking-wide">ROAD<span className="text-cyan-400">WATCH</span></span>
        </Link>
        <div className="flex items-center gap-4 text-xs">
          <Link href="/" className="text-slate-400 hover:text-white transition">Dashboard</Link>
          <Link href="/ledger" className="text-cyan-400 font-semibold">Ledger</Link>
        </div>
      </nav>

      <div className="min-h-screen bg-[#020817] text-white px-6 py-8 mt-14">
        <div className="mx-auto max-w-7xl space-y-10">

          {/* HERO */}
          <section className="text-center max-w-4xl mx-auto space-y-4 pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              India National Highway & State Highway Registry
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
              Procurement & <span className="text-cyan-400">Highway Spending</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Open spending ledger and tender accountability tracker mapping National Highway (NH) and State Highway (SH) contracts across India from the Central Public Procurement Portal (CPPP).
            </p>
          </section>

          {/* FILTERS */}
          <div className="bg-[#0f172a]/60 border border-slate-800 p-5 rounded-xl space-y-4 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Category Tabs */}
              <div className={`flex bg-[#020817] border border-slate-800 p-1.5 rounded-lg ${selectedCategory === 'SH' ? 'md:col-span-5' : 'md:col-span-8'}`}>
                {['all', 'NH', 'SH'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-md transition ${
                      selectedCategory === cat ? 'bg-cyan-500 text-[#020817]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'All Highways' : cat === 'NH' ? 'NH Only' : 'SH Only'}
                  </button>
                ))}
              </div>

              {/* State Filter (SH only) */}
              {selectedCategory === 'SH' && (
                <div className="md:col-span-4 relative">
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-[#020817] border border-cyan-500/30 text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-200 appearance-none cursor-pointer"
                  >
                    <option value="all">All States</option>
                    {STATES_LIST.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-cyan-400 text-xs">▼</div>
                </div>
              )}

              {/* Year Filter */}
              <div className={`relative ${selectedCategory === 'SH' ? 'md:col-span-3' : 'md:col-span-4'}`}>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#020817] border border-slate-800 text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {['2026', '2025', '2024', '2023', '2022', '2021'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 text-xs">▼</div>
              </div>

              {/* Search */}
              <div className="md:col-span-12 relative mt-1">
                <input
                  type="text"
                  placeholder='Search by highway (e.g. "NH-44", "SH-3") or contractor name...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#020817] border border-slate-800 text-xs py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-500"
                />
                <span className="absolute left-3.5 top-3.5 text-slate-500 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <StatCard title="Audited Spend Value" value={formatINR(aggregates.totalSpend)} desc="Total budget deployment recorded under selected filters" icon="🪙" />
            <StatCard title="Highway Contracts" value={aggregates.totalContracts.toLocaleString()} desc="Government highway tenders currently in public registry" icon="🛡️" />
            <StatCard title="Active Bidders / Builders" value={aggregates.activeBidders.toLocaleString()} desc="Distinct construction contractors awarded contracts" icon="🏗️" />
          </div>

          {/* CONTRACT TABLE */}
          <section className="max-w-6xl mx-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">Central Highway Contract Registry</h2>
                <p className="text-slate-400 text-xs mt-0.5">Audited contract schedules from CPPP matching active filters</p>
              </div>
              <span className="text-[10px] bg-[#0f172a] text-cyan-400 border border-slate-800 px-3 py-1 rounded-full font-mono uppercase tracking-wider font-semibold">
                {selectedCategory === 'all' ? 'NH & SH Ledger' : `${selectedCategory} Ledger`}
              </span>
            </div>

            {contracts.length > 0 && (
              <div className="text-[10px] text-cyan-400/80 font-medium bg-cyan-950/10 border border-cyan-800/10 px-4 py-2 rounded-lg flex items-center gap-2 max-w-max">
                <span>💡</span>
                <span><b>Interactive Sheet:</b> Click any contract row to inspect its official <b>"Award of Contract Details"</b>.</span>
              </div>
            )}

            {loading ? (
              <div className="bg-[#0f172a]/30 border border-slate-800 rounded-xl p-16 text-center space-y-3">
                <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Querying contract records from CPPP registry...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="bg-[#0f172a]/30 border border-dashed border-slate-800 rounded-xl p-16 text-center space-y-5">
                <div className="text-5xl opacity-40">📭</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">No Contracts Found</h3>
                  <p className="text-slate-500 text-xs max-w-lg mx-auto leading-relaxed">
                    No highway contracts matched your current filters. Try clearing the search or adjusting the category/year filter.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[#0f172a]/60 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/40 border-b border-slate-800 text-slate-400 uppercase text-[9px] tracking-wider font-semibold">
                        <th className="p-4">Organisation Name</th>
                        <th className="p-4">Tender Ref. No.</th>
                        <th className="p-4 text-center">Bids</th>
                        <th className="p-4">Selected Bidder</th>
                        <th className="p-4 text-right">Contract Value</th>
                        <th className="p-4 text-right">Contract Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {paginatedContracts.map((c) => (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedContract(c)}
                          className="hover:bg-slate-800/30 transition duration-150 cursor-pointer group"
                        >
                          <td className="p-4 font-medium text-white max-w-[240px] truncate group-hover:text-cyan-300 transition" title={c.organisationName}>
                            {c.organisationName}
                          </td>
                          <td className="p-4 font-mono font-bold tracking-wide">
                            <span className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${c.category === 'NH' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                                {c.category}
                              </span>
                              {c.tenderRefNo}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono font-semibold text-slate-400">{c.bidsReceived}</td>
                          <td className="p-4 font-medium text-white max-w-[200px] truncate" title={c.selectedBidder}>
                            {c.selectedBidder}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-cyan-400 text-sm">
                            {formatINR(c.contractValue)}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-400">
                            {c.contractDate ? new Date(c.contractDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="bg-[#0f172a]/80 border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <div>
                      Showing <span className="font-semibold text-white">{contracts.length === 0 ? 0 : (activePage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-white">{Math.min(activePage * itemsPerPage, contracts.length)}</span> of <span className="font-semibold text-white">{contracts.length.toLocaleString()}</span> contracts
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Show</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-[#020817] border border-slate-800 rounded px-2 py-1 focus:outline-none text-slate-300 cursor-pointer text-xs"
                      >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                      </select>
                      <span>per page</span>
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={activePage === 1}
                        className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold transition bg-[#020817] hover:bg-slate-800 disabled:opacity-40"
                      >
                        ◀ Prev
                      </button>
                      <span className="px-3 text-xs text-slate-400">
                        {activePage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={activePage === totalPages}
                        className="px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold transition bg-[#020817] hover:bg-slate-800 disabled:opacity-40"
                      >
                        Next ▶
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

        </div>
      </div>

      {/* AWARD OF CONTRACT MODAL */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#020817] border border-slate-800 rounded-xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
            
            <div className="flex justify-between items-center border-b border-slate-800 px-6 py-4 bg-[#0f172a]">
              <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                Verified Procurement Registry Record — CPPP
              </h3>
              <button
                onClick={() => setSelectedContract(null)}
                className="text-slate-400 hover:text-white transition text-sm bg-[#020817] hover:bg-slate-800 p-1 rounded-full h-7 w-7 flex items-center justify-center border border-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-white">Award of Contract Details</h2>

              <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#0a0f1d] shadow-2xl">
                <div className="bg-[#0B256B] px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-800">
                  Award of Contract Details:
                </div>

                <div className="divide-y divide-slate-800 text-xs text-slate-300">
                  {[
                    { label: 'Organisation Name', value: selectedContract.organisationName },
                    { label: 'Tender Ref. No.', value: selectedContract.tenderRefNo, mono: true, cyan: true },
                    { label: 'Tender Description', value: selectedContract.tenderDescription || 'N/A' },
                    { label: 'Tender Type', value: selectedContract.tenderType || 'Works' },
                    { label: 'Number of Bids Received', value: String(selectedContract.bidsReceived) },
                    { label: 'Selected Bidder(s)', value: selectedContract.selectedBidder },
                    { label: 'Contract Value', value: `₹${selectedContract.contractValue.toLocaleString('en-IN')} (${formatINR(selectedContract.contractValue)})`, cyan: true },
                    { label: 'Address of Selected Bidder', value: selectedContract.selectedBidderAddress || 'Not Provided' },
                    { label: 'Published Date', value: selectedContract.publishedDate || 'N/A' },
                    { label: 'Contract Date', value: selectedContract.contractDate || 'N/A' },
                    { label: 'Completion Period', value: selectedContract.completionPeriod || 'Not Specified' },
                    { label: 'State', value: selectedContract.state },
                    { label: 'Category', value: selectedContract.category === 'NH' ? 'National Highway (NH)' : 'State Highway (SH)' },
                  ].map(({ label, value, mono, cyan }) => (
                    <div key={label} className="flex flex-col md:flex-row md:items-stretch">
                      <div className="w-full md:w-[30%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                        {label}
                      </div>
                      <div className={`hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800`}>:</div>
                      <div className={`w-full md:w-[67%] p-3 flex items-center leading-relaxed ${mono ? 'font-mono' : ''} ${cyan ? 'text-cyan-400 font-bold' : 'text-white'}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#0f172a] px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
              {selectedContract.tenderDocument && (
                <a
                  href={selectedContract.tenderDocument}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition"
                >
                  View Tender Document 🔗
                </a>
              )}
              <button
                onClick={() => setSelectedContract(null)}
                className="bg-cyan-500 hover:bg-cyan-400 text-[#020817] px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl ${
          toast.type === 'error' ? 'bg-[#2a080c]/90 border-red-500/40 text-red-400' : 'bg-[#0f172a]/95 border-cyan-500/40 text-cyan-400'
        }`}>
          <span>{toast.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-xs pl-2">✕</button>
        </div>
      )}
    </>
  );
}
