const axios = require('axios');

async function run() {
  try {
    console.log('Sending POST to /api/auth/login...');
    // We will use the user test_gmd_user_new@example.com which we saw was successfully logged in in the browser
    // Wait, let's look at the database logs. The test user email is: test_gmd_user_new@example.com
    // Wait, we don't know the password of test_gmd_user_new@example.com.
    // Let's check if we can register a new user, or if we can use an existing user.
    // Let's create a new test user to test this!
    const email = `test_sim_${Date.now()}@example.com`;
    const password = 'Password123!';
    const name = 'Test Sim User';
    const phone = '(51) 9999 9999';
    const city = 'Porto Alegre';
    
    console.log(`Registering test user: ${email}...`);
    const regRes = await axios.post('http://localhost:3000/api/auth/register', {
      email, password, name, phone, city
    });
    
    const cookies = regRes.headers['set-cookie'];
    console.log('Cookies received:', cookies);
    
    const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
    console.log('Cookie header:', cookieHeader);

    // Save a simulation first
    console.log('Saving a GMD simulation for the new user...');
    const saveRes = await axios.post('http://localhost:3000/api/simulations', {
      name: 'Lote Teste GMD 99',
      calculator_type: 'gmd',
      inputs: {
        days: '120',
        animalCount: '30',
        finalWeight: '320',
        dailyCostHead: '2.50',
        initialWeight: '220',
        purchasePriceKg: '14.00',
        expectedSalePriceKg: '15.00'
      }
    }, {
      headers: { Cookie: cookieHeader }
    });
    console.log('Save response:', saveRes.data);

    console.log('Fetching simulations for the new user...');
    const fetchRes = await axios.get('http://localhost:3000/api/simulations?type=gmd', {
      headers: { Cookie: cookieHeader }
    });
    console.log('Fetch response status:', fetchRes.status);
    console.log('Fetch response data:', fetchRes.data);
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

run();
