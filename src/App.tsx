import './index.css';
import { Dashboard } from './components/Dashboard';
import { useSessionEngine } from './hooks/useSessionEngine';

function App() {
  const model = useSessionEngine();
  return <Dashboard model={model} />;
}

export default App;
