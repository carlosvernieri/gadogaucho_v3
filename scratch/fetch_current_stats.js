async function fetchStats() {
  try {
    const reportRes = await fetch('http://localhost:3000/api/market-report');
    if (!reportRes.ok) {
      throw new Error(`Report HTTP error: ${reportRes.status}`);
    }
    const reportData = await reportRes.json();
    console.log('=== MARKET REPORT DATA ===');
    console.log(JSON.stringify(reportData, null, 2));

    const quotesRes = await fetch('http://localhost:3000/api/market-quotes');
    if (!quotesRes.ok) {
      throw new Error(`Quotes HTTP error: ${quotesRes.status}`);
    }
    const quotesData = await quotesRes.json();
    console.log('\n=== MARKET QUOTES DATA ===');
    console.log(JSON.stringify(quotesData, null, 2));
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

fetchStats();
