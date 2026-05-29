import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-4xl' }) => {
  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300"
    >
      <div className={`bg-[#161b22] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl w-full ${maxWidth} max-h-[90vh] flex flex-col border border-[#30363d] animate-in zoom-in duration-300 overflow-visible relative`}>
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117]/50">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">{title}</h2>
            {subtitle && <p className="text-[10px] font-mono text-[#768390] tracking-[0.3em] uppercase">{subtitle}</p>}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#30363d]/50 text-[#768390] hover:text-white hover:bg-[#30363d] transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6">
           {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
