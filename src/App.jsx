import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import LandingPage from './pages/LandingPage';
import PrintTypeSelection from './pages/PrintTypeSelection';
import DocumentUpload from './pages/DocumentUpload';
import PhotoUpload from './pages/PhotoUpload';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <div data-theme="blackboxz" className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Router>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/pilih-jenis" element={<PrintTypeSelection />} />
              <Route path="/upload/dokumen" element={<DocumentUpload />} />
              <Route path="/upload/foto" element={<PhotoUpload />} />
              <Route path="/pembayaran/berhasil" element={<PaymentSuccess />} />
              <Route path="/pembayaran/gagal" element={<PaymentFailed />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </Router>
    </div>
  );
}

export default App;
