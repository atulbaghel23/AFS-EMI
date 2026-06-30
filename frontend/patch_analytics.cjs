const fs = require('fs');

// 1. Update CustomerManagement.jsx
let cmPath = 'src/components/CustomerManagement.jsx';
let cmCode = fs.readFileSync(cmPath, 'utf8');

// Replace handleViewAnalytics
cmCode = cmCode.replace(
  /const handleViewAnalytics = \(customer\) => \{\s*state\.setState\(\{\s*view: 'customer-analytics',\s*selectedCustomerId: customer\._id\s*\}\);\s*\};/g,
  `const handleViewAnalytics = (customer) => {
    state.setState({
      view: 'customer-analytics',
      selectedCustomerId: customer._id,
      selectedCustomerContext: filterType
    });
  };`
);

// We also need to fix the multi-select toggle we lost during git checkout
cmCode = cmCode.replace(
  /<button\s*key=\{type\} type="button" onClick=\{\(\) => setFormData\(\{ \.\.\.formData, type \}\)\}\s*className=\{`flex-1 text-\[8px\] font-black uppercase tracking-tighter rounded-lg transition-all \$\{formData\.type === type \? 'bg-\[\#f0883e\] text-black shadow-lg' : 'text-text-dim hover:text-text-main'\}`\}\s*>/g,
  `<button
                  key={type} type="button" 
                  onClick={() => {
                    const currentTypes = Array.isArray(formData.type) ? formData.type : (formData.type ? [formData.type] : []);
                    const newTypes = currentTypes.includes(type) ? currentTypes.filter(t => t !== type) : [...currentTypes, type];
                    setFormData({ ...formData, type: newTypes });
                  }}
                  className={\`flex-1 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all \${(Array.isArray(formData.type) ? formData.type.includes(type) : formData.type === type) ? 'bg-[#f0883e] text-black shadow-lg' : 'text-text-dim hover:text-text-main'}\`}
                >`
);

fs.writeFileSync(cmPath, cmCode);
console.log('Patched CustomerManagement.jsx');

// 2. Update CustomerAnalytics.jsx
let caPath = 'src/components/CustomerAnalytics.jsx';
let caCode = fs.readFileSync(caPath, 'utf8');

// Add selectedCustomerContext
caCode = caCode.replace(
  /const \{ loans, machines, selectedCustomerId, customers, payments = \[\] \} = state\.data;/g,
  `const { loans, machines, selectedCustomerId, customers, payments = [], selectedCustomerContext } = state.data;`
);

// Replace if (customer.type === 'FMC')
caCode = caCode.replace(
  /if \(customer\.type === 'FMC'\) return <FMCCustomerAnalytics customer=\{customer\} \/>;/g,
  `const activeContext = selectedCustomerContext || (Array.isArray(customer.type) ? customer.type[0] : customer.type) || 'EMI';

  if (activeContext === 'FMC' || (!customer?.type?.includes('EMI') && customer?.type?.includes('FMC'))) return <FMCCustomerAnalytics customer={customer} />;

  if (activeContext === 'Rental' || (!customer?.type?.includes('EMI') && customer?.type?.includes('Rental'))) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] opacity-30 text-center space-y-4">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
        <Activity size={32} />
      </div>
      <div>
        <p className="text-sm font-black text-white uppercase tracking-widest">Rental Fleet Analytics</p>
        <p className="text-[10px] text-slate-500 font-mono uppercase mt-1">This analytical module is currently under strategic construction.</p>
      </div>
    </div>
  );`
);

fs.writeFileSync(caPath, caCode);
console.log('Patched CustomerAnalytics.jsx');
