const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.jsx') || dirFile.endsWith('.js')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Fix user?.type?.toUpperCase() === 'FMC'
  content = content.replace(/user\?\.type\?\.toUpperCase\(\)\s*===\s*(['"])FMC\1/g, "(Array.isArray(user?.type) ? user.type.includes('FMC') : user?.type?.toUpperCase() === 'FMC')");
  
  // Fix data.type?.toUpperCase() === 'FMC'
  content = content.replace(/data\.type\?\.toUpperCase\(\)\s*===\s*(['"])FMC\1/g, "(Array.isArray(data.type) ? data.type.includes('FMC') : data.type?.toUpperCase() === 'FMC')");

  // Fix this.data.user?.type?.toUpperCase() === 'FMC'
  content = content.replace(/this\.data\.user\?\.type\?\.toUpperCase\(\)\s*===\s*(['"])FMC\1/g, "(Array.isArray(this.data.user?.type) ? this.data.user.type.includes('FMC') : this.data.user?.type?.toUpperCase() === 'FMC')");

  // Fix c.type === 'FMC'
  content = content.replace(/c\.type\s*===\s*(['"])FMC\1/g, "(Array.isArray(c.type) ? c.type.includes('FMC') : c.type === 'FMC')");

  // Fix c.type === 'EMI'
  content = content.replace(/c\.type\s*===\s*(['"])EMI\1/g, "(Array.isArray(c.type) ? c.type.includes('EMI') : c.type === 'EMI')");

  // Fix c.type === 'Rental'
  content = content.replace(/c\.type\s*===\s*(['"])Rental\1/g, "(Array.isArray(c.type) ? c.type.includes('Rental') : c.type === 'Rental')");

  // Fix c.type === (formData.financingType || 'EMI')
  content = content.replace(/c\.type\s*===\s*\((formData\.financingType \|\| 'EMI')\)/g, "(Array.isArray(c.type) ? c.type.includes($1) : c.type === ($1))");

  // CustomerManagement.jsx specific:
  content = content.replace(/const cType = c\.type \|\| 'EMI';\s*if\s*\(filterType === 'EMI'\) \{\s*typeMatch = cType === 'EMI' \|\| cType === 'EMI\/Rentals';\s*\} else if \(filterType === 'Rental'\) \{\s*typeMatch = cType === 'Rental' \|\| cType === 'Rentals';\s*\} else if \(filterType === 'FMC'\) \{\s*typeMatch = cType === 'FMC';\s*\}/g, 
  `const cTypeArray = Array.isArray(c.type) ? c.type : (c.type ? [c.type] : ['EMI']);
    if (filterType === 'EMI') {
      typeMatch = cTypeArray.includes('EMI') || cTypeArray.includes('EMI/Rentals');
    } else if (filterType === 'Rental') {
      typeMatch = cTypeArray.includes('Rental') || cTypeArray.includes('Rentals');
    } else if (filterType === 'FMC') {
      typeMatch = cTypeArray.includes('FMC');
    }`);

  // CustomerManagement.jsx JSX render `{c.type}`
  content = content.replace(/\{c\.type\}/g, "{Array.isArray(c.type) ? c.type.join(', ') : c.type}");
  
  // App.jsx payload.type === 'FMC'
  content = content.replace(/payload\.type\s*===\s*(['"])FMC\1/g, "(Array.isArray(payload.type) ? payload.type.includes('FMC') : payload.type === 'FMC')");

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
