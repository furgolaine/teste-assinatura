import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Subscriptions from './pages/Subscriptions';
import Shipments from './pages/Shipments';
import './App.css';

// Placeholder components for other pages
const Properties = () => <div className="p-6"><h1 className="text-2xl font-bold">Imóveis</h1><p>Em desenvolvimento...</p></div>;
const Plans = () => <div className="p-6"><h1 className="text-2xl font-bold">Planos</h1><p>Em desenvolvimento...</p></div>;
const Reports = () => <div className="p-6"><h1 className="text-2xl font-bold">Relatórios</h1><p>Em desenvolvimento...</p></div>;
const Settings = () => <div className="p-6"><h1 className="text-2xl font-bold">Configurações</h1><p>Em desenvolvimento...</p></div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/properties" element={<Properties />} />
                    <Route path="/plans" element={<Plans />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/shipments" element={<Shipments />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

