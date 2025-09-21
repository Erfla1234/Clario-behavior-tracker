import { Nav } from '../components/Nav';
import { LogForm } from '../components/forms/LogForm';

export function Log() {
  return (
    <div className="page-container">
      <Nav />
      <main className="page-content">
        <div className="page-header">
          <h1>New Log Entry</h1>
          <p>Record behavior observations and interventions</p>
        </div>
        <LogForm />
      </main>
    </div>
  );
}