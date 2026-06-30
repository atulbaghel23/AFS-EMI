const fs = require('fs');

let code = fs.readFileSync('src/state.js', 'utf8');

// 1. Constructor: Add popstate listener and replaceState
code = code.replace(
  /if \(this\.data\.isAuthenticated\) \{\s*this\.init\(\);\s*\}/,
  `if (this.data.isAuthenticated) {
      this.init();
    }
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        this.setState({ 
          view: e.state.view, 
          selectedCustomerId: e.state.selectedCustomerId || null,
          selectedLoanId: e.state.selectedLoanId || null,
          selectedCustomerContext: e.state.selectedCustomerContext || null,
          _isBackNavigation: true 
        });
      }
    });
    if (this.data.view) {
      window.history.replaceState({ 
        view: this.data.view,
        selectedCustomerId: this.data.selectedCustomerId || null,
        selectedLoanId: this.data.selectedLoanId || null
      }, '', window.location.pathname);
    }`
);

// 2. setState: Add pushState
code = code.replace(
  /if \(newData\.view && newData\.view !== this\.data\.view && !newData\._isBackNavigation\) \{\s*const history = this\.data\.viewHistory \|\| \[\];\s*if \(history\[history\.length - 1\] !== this\.data\.view\) \{\s*newData\.viewHistory = \[\.\.\.history, this\.data\.view\];\s*\}\s*\}/g,
  `if (newData.view && newData.view !== this.data.view && !newData._isBackNavigation) {
      const stateToPush = {
        view: newData.view,
        selectedCustomerId: newData.selectedCustomerId !== undefined ? newData.selectedCustomerId : this.data.selectedCustomerId,
        selectedLoanId: newData.selectedLoanId !== undefined ? newData.selectedLoanId : this.data.selectedLoanId,
        selectedCustomerContext: newData.selectedCustomerContext !== undefined ? newData.selectedCustomerContext : this.data.selectedCustomerContext
      };
      window.history.pushState(stateToPush, '', window.location.pathname);
    }`
);

// 3. goBack: Update to use history API
code = code.replace(
  /goBack\(\) \{\s*const history = this\.data\.viewHistory \|\| \[\];\s*if \(history\.length > 0\) \{\s*const newHistory = \[\.\.\.history\];\s*const previousView = newHistory\.pop\(\);\s*this\.setState\(\{ view: previousView, viewHistory: newHistory, _isBackNavigation: true \}\);\s*\} else \{\s*const userTypes = Array\.isArray\(this\.data\.user\?\.type\) \? this\.data\.user\.type : \[this\.data\.user\?\.type\]\.filter\(Boolean\);\s*const isFMC = userTypes\.some\(t => t\?\.toUpperCase\(\) === 'FMC'\);\s*const defaultView = this\.data\.user\?\.role === 'OEM' \? 'oem-dashboard' : \(this\.data\.user\?\.role === 'SUPERVISOR' \? 'fmc-dashboard' : \(isFMC \? 'fmc-dashboard' : 'customer-dashboard'\)\);\s*this\.setState\(\{ view: defaultView \}\);\s*\}\s*\}/,
  `goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      const userTypes = Array.isArray(this.data.user?.type) ? this.data.user.type : [this.data.user?.type].filter(Boolean);
      const isFMC = userTypes.some(t => t?.toUpperCase() === 'FMC');
      const defaultView = this.data.user?.role === 'OEM' ? 'oem-dashboard' : (this.data.user?.role === 'SUPERVISOR' ? 'fmc-dashboard' : (isFMC ? 'fmc-dashboard' : 'customer-dashboard'));
      this.setState({ view: defaultView, selectedCustomerId: null, selectedLoanId: null, _isBackNavigation: true });
      window.history.replaceState({ view: defaultView }, '', window.location.pathname);
    }
  }`
);

fs.writeFileSync('src/state.js', code);
console.log('patched');
