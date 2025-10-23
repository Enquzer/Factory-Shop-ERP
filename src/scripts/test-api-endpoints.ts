async function testApiEndpoints() {
    console.log('Testing API endpoints...');
    
    try {
        // Test login endpoint
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'factory',
        password: 'factory123'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginResult = await loginResponse.json();
    console.log('Login response:', loginResult);
    
    // Test register endpoint
    console.log('\n2. Testing register endpoint...');
    const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass',
        role: 'shop'
      })
    });
    
    console.log('Register response status:', registerResponse.status);
    const registerResult = await registerResponse.json();
    console.log('Register response:', registerResult);
    
    // Test user endpoint
    console.log('\n3. Testing user endpoint...');
    const userResponse = await fetch('http://localhost:3000/api/auth/user?username=factory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginResult.token}`
      }
    });
    
    console.log('User response status:', userResponse.status);
    const userResult = await userResponse.json();
    console.log('User response:', userResult);
    
  } catch (error) {
    console.error('Error testing API endpoints:', error);
  }
}

testApiEndpoints();