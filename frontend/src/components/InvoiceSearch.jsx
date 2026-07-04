import React, { useState } from 'react';
import { state } from '../state';
import { Search, Download, FileText, AlertCircle, CheckCircle2, Truck, Calendar, Hash } from 'lucide-react';

const InvoiceSearch = () => {
  const [searchMode, setSearchMode] = useState('invoice');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError(`Please enter a valid ${searchMode === 'invoice' ? 'invoice' : 'serial'} number`);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (searchMode === 'invoice') {
        const response = await fetch(
          "https://lipl.sods.app/api/dmobile/getInvoiceDetails",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              invoice_number: searchQuery.trim()
            })
          }
        );
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        if (!data.status || !data.result) {
          setError(data.check || 'Invoice not found');
        } else {
          setResult(data.result[0]);
        }
      } else {
        // Dispatch Mode
        const q = encodeURIComponent(searchQuery.trim());
        const response = await fetch(`https://lipl.sods.app/api/dmobile/isDispatched?serial_no=${q}&invoice_no=${q}`,
          { method: "POST" });
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        if (!data.status || !data.result) {
          setError('Dispatch status not found for this serial number');
        } else {
          setResult(data.result);

          // Store data locally
          try {
            await fetch(`${state.apiUrl}/dispatch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serialNumber: searchQuery.trim(),
                dispatchData: data.result
              })
            });
          } catch (e) {
            console.error('Failed to store dispatch data locally', e);
          }
        }
      }
    } catch (err) {
      setError('Failed to fetch invoice details. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (fileUrl) => {
    if (fileUrl) {
      const url = `https://lipl.sods.app/${fileUrl}`;
      window.open(url, '_blank');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">System Search</h1>
          <p className="text-slate-400 text-sm mt-1">Search and verify invoices and dispatch status securely</p>
        </div>
      </div>

      <div className="flex bg-[#0d1117] p-1 rounded-xl w-fit border border-[#30363d] mb-4">
        <button
          onClick={() => { setSearchMode('invoice'); setResult(null); setError(''); }}
          className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${searchMode === 'invoice' ? 'bg-[#f0883e] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Invoice Details
        </button>
        <button
          onClick={() => { setSearchMode('dispatch'); setResult(null); setError(''); }}
          className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-all ${searchMode === 'dispatch' ? 'bg-[#f0883e] text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
        >
          Dispatch Status
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 md:p-8 shadow-xl">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#f0883e] focus:border-transparent transition-all"
              placeholder={searchMode === 'invoice' ? "Enter Invoice Number (e.g., LIPLTD2324-6386)" : "Enter Serial Number or Invoice Number"}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#f0883e] hover:bg-[#d97736] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-[0_0_20px_rgba(240,136,62,0.3)]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Search size={20} />
                Search
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Search Failed</h3>
          <p className="text-slate-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4">
          <div className="p-6 border-b border-[#30363d] bg-[#0d1117]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${searchMode === 'invoice' || result.isDispatched ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                {searchMode === 'invoice' || result.isDispatched ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Truck className="w-6 h-6 text-yellow-500" />}
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">{searchMode === 'invoice' ? result.invoiceNumber : searchQuery}</h2>
                <p className={`text-sm font-medium ${searchMode === 'invoice' || result.isDispatched ? 'text-green-400' : 'text-yellow-400'}`}>
                  {searchMode === 'invoice' ? 'Invoice Verified & Active' : (result.isDispatched ? 'Dispatched' : 'Pending Dispatch')}
                </p>
              </div>
            </div>

            {searchMode === 'invoice' && result.invoiceFile && (
              <button
                onClick={() => handleDownload(result.invoiceFile)}
                className="flex items-center gap-2 px-6 py-3 bg-[#1c2128] hover:bg-[#2d333b] border border-[#30363d] text-white font-bold rounded-xl transition-all"
              >
                <Download size={18} className="text-[#f0883e]" />
                Download Invoice
              </button>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchMode === 'invoice' ? (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Calendar size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Invoice Date</span>
                    </div>
                    <p className="text-lg font-medium text-white">{formatDate(result.invoiceDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <FileText size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Order ID</span>
                    </div>
                    <p className="text-lg font-medium text-white">{result.order_id || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <FileText size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Delivery Note</span>
                    </div>
                    <p className="text-lg font-medium text-white">{result.deliveryNote || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Truck size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Vehicle Number</span>
                    </div>
                    <p className="text-lg font-medium text-white">{result.vehicleNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Settings size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Engine Number</span>
                    </div>
                    <p className="text-lg font-medium text-white">{result.engineNumber || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Hash size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Chassis Number</span>
                    </div>
                    <p className="text-lg font-medium text-white">{result.chassisNumber || 'N/A'}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <Calendar size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Dispatch Date</span>
                    </div>
                    <p className="text-lg font-medium text-white">{formatDate(result.dispatchDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <FileText size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">LR No</span>
                    </div>
                    <p className="text-lg font-medium text-white">{result.lrNo || 'N/A'}</p>
                  </div>
                  {result.lrFile && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Download size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">LR Document</span>
                      </div>
                      <button onClick={() => handleDownload(result.lrFile)} className="text-[#f0883e] hover:underline font-bold text-sm">Download LR</button>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <FileText size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">E-Way Bill No</span>
                    </div>
                    <p className="text-lg font-medium text-white">{result.eWayBillNo || 'N/A'}</p>
                  </div>
                  {result.ddFile && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Download size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">DD Document</span>
                      </div>
                      <button onClick={() => handleDownload(result.ddFile)} className="text-[#f0883e] hover:underline font-bold text-sm">Download DD</button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-[#30363d] flex justify-between items-center text-xs text-slate-500">
              <p>System ID: {searchMode === 'invoice' ? result.id : result.dispatchId}</p>
              {searchMode === 'invoice' && <p>Last Updated: {formatDate(result.updated_at)}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple stub for missing icon to fix build error
function Settings(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
}

export default InvoiceSearch;
