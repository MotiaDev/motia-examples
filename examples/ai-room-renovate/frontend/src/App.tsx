import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RenovationForm from './pages/RenovationForm';
import Dashboard from './pages/Dashboard';
import RenderingViewer from './pages/RenderingViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/plan" element={<RenovationForm />} />
        <Route path="/dashboard/:sessionId" element={<Dashboard />} />
        <Route path="/rendering/:sessionId" element={<RenderingViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;