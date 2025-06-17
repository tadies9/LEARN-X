import { API_CLIENT } from './client';

export async function testBackendHealth() {
  try {
    console.log('🧪 Testing backend health...');
    const response = await API_CLIENT.get('/');
    console.log('✅ Backend response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Backend error:', error.message);
    throw error;
  }
}

export async function testPersonaGet() {
  try {
    console.log('🧪 Testing GET /persona...');
    const response = await API_CLIENT.get('/persona');
    console.log('✅ Persona GET response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Persona GET error:', error.response?.data || error.message);
    throw error;
  }
}

// Make functions available globally for testing
if (typeof window !== 'undefined') {
  (window as any).testBackendHealth = testBackendHealth;
  (window as any).testPersonaGet = testPersonaGet;
}