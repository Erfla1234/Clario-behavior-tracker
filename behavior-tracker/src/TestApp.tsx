import React from 'react';

export default function TestApp() {
  return (
    <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
      <h1>Test App is Working!</h1>
      <p>If you can see this, React is rendering correctly.</p>
      <button onClick={() => alert('Button clicked!')}>Click Me</button>
    </div>
  );
}