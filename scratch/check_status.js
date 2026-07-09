const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('=== Checking Status ===');

// Check processes
exec('tasklist', (err, stdout, stderr) => {
  if (err) {
    console.error('Error running tasklist:', err.message);
  } else {
    const hasPython = stdout.toLowerCase().includes('python');
    console.log('Python running (via tasklist):', hasPython);
  }

  // Check files in the output directory
  const targetDir = path.join(__dirname, '../auction_ocr_poc/outputs/leilao_lavras_2026_07_08_43');
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir);
    console.log(`Total files in leilao_lavras_2026_07_08_43: ${files.length}`);
    const hasJson = files.includes('process_result.json');
    console.log('Has process_result.json:', hasJson);
    
    // Get stats of the latest png file
    const pngs = files.filter(f => f.endsWith('.png')).map(f => {
      const p = path.join(targetDir, f);
      return { name: f, mtime: fs.statSync(p).mtime };
    });
    if (pngs.length > 0) {
      pngs.sort((a, b) => b.mtime - a.mtime);
      console.log('Latest PNG:', pngs[0].name, 'modified at:', pngs[0].mtime);
    }
  } else {
    console.log('Directory leilao_lavras_2026_07_08_43 does not exist.');
  }
});
