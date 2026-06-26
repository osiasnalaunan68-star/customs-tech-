import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import HsCodeLookup from "./pages/HsCodeLookup";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        <nav className="bg-slate-900 text-white p-4 shadow-md">
          <div className="max-w-5xl mx-auto flex items-baseline gap-6">
            <span className="font-bold text-xl tracking-tight">CustomsTech</span>
            <Link to="/lookup" className="text-sm hover:text-slate-300 transition-colors">
              HS Code Lookup
            </Link>
          </div>
        </nav>
        
        <main>
          <Routes>
            <Route path="/lookup" element={<HsCodeLookup />} />
            <Route path="/" element={
              <div className="max-w-5xl mx-auto mt-20 text-center">
                <h2 className="text-3xl font-bold text-slate-800">Welcome to CustomsTech V1.0</h2>
                <p className="mt-4 text-slate-600">
                  Your Enterprise Customs Operations Platform. 
                  <br />Click "HS Code Lookup" above to test our first module.
                </p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
