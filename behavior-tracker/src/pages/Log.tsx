import { useState } from 'react';
import { Nav } from '../components/Nav';
import { LogForm } from '../components/forms/LogForm';
import { QuickLogForm } from '../components/forms/QuickLogForm';

export function Log() {
  const [mode, setMode] = useState<'quick' | 'full'>('quick');

  return (
    <div className="page-container">
      <Nav />
      <main className="page-content">
        <div className="page-header">
          <div className="page-header-content">
            <div>
              <h1>New Log Entry</h1>
              <p>Record behavior observations and interventions</p>
            </div>
            <div className="mode-toggle">
              <button
                className={`mode-btn ${mode === 'quick' ? 'active' : ''}`}
                onClick={() => setMode('quick')}
              >
                Quick Log
              </button>
              <button
                className={`mode-btn ${mode === 'full' ? 'active' : ''}`}
                onClick={() => setMode('full')}
              >
                Full Form
              </button>
            </div>
          </div>
        </div>

        {mode === 'quick' ? (
          <QuickLogForm onSwitchToFull={() => setMode('full')} />
        ) : (
          <LogForm />
        )}
      </main>
    </div>
  );
}