import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './app/providers/AppProvider';
import { router } from './app/routes';
import './styles/globals.css';

function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App
