import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, FileText, Image, Copy, RotateCcw, Home } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getPrintJobByCode } from '../lib/api';
import toast from 'react-hot-toast';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentOrder, clearOrder } = useStore();
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [printCode, setPrintCode] = useState('');
  const [amount, setAmount] = useState(0);
  const [expiresAt, setExpiresAt] = useState(null);
  const [printJobData, setPrintJobData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch print job data by code
  const fetchPrintJobData = async (code) => {
    try {
      setLoading(true);
      const response = await getPrintJobByCode(code);
      if (response.success) {
        const printJob = response.data;
        setPrintJobData(printJob);
        setPrintCode(printJob.print_code);
        setAmount(printJob.total_price);
        if (printJob.expires_at) {
          // Simpan sebagai Date object langsung dari UTC string
          // JavaScript akan otomatis handle timezone conversion
          setExpiresAt(new Date(printJob.expires_at));
        }
        
        // Store in localStorage for backup
        localStorage.setItem('printJob', JSON.stringify(printJob));
        if (printJob.payment) {
          localStorage.setItem('paymentData', JSON.stringify(printJob.payment));
        }
      }
    } catch (error) {
      console.error('Error fetching print job:', error);
      toast.error('Gagal memuat data pesanan');
      // Fallback to localStorage if API fails
      tryLoadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  // Fallback to localStorage
  const tryLoadFromLocalStorage = () => {
    const storedPrintJob = localStorage.getItem('printJob');
    if (storedPrintJob && storedPrintJob !== 'undefined' && storedPrintJob !== 'null') {
      try {
        const printJob = JSON.parse(storedPrintJob);
        setPrintJobData(printJob);
        setPrintCode(printJob.print_code);
        setAmount(printJob.total_price);
        if (printJob.expires_at) {
          // Simpan sebagai Date object langsung dari UTC string
          setExpiresAt(new Date(printJob.expires_at));
        }
      } catch (error) {
        console.error('Error parsing stored print job:', error);
        localStorage.removeItem('printJob');
        navigate('/');
      }
    } else if (currentOrder?.printJob) {
      setPrintJobData(currentOrder.printJob);
      setPrintCode(currentOrder.printJob.print_code);
      setAmount(currentOrder.printJob.total_price);
      if (currentOrder.printJob.expires_at) {
        setExpiresAt(new Date(currentOrder.printJob.expires_at));
      }
    } else {
      navigate('/');
    }
  };

  // Parse URL parameters and fetch data
  useEffect(() => {
    const urlPrintCode = searchParams.get('print_code');
    const urlAmount = searchParams.get('amount');
    const urlExpiresAt = searchParams.get('expires_at');

    if (urlPrintCode) {
      // Fetch fresh data from API using print_code
      fetchPrintJobData(urlPrintCode);
    } else if (urlAmount) {
      // Legacy URL parameters (from Xendit redirect)
      setPrintCode(urlPrintCode);
      setAmount(parseInt(urlAmount));
      if (urlExpiresAt) {
        // Simpan sebagai Date object langsung dari UTC string
        setExpiresAt(new Date(urlExpiresAt));
      }
      setLoading(false);
    } else {
      // Fallback to localStorage or currentOrder
      tryLoadFromLocalStorage();
      setLoading(false);
    }
  }, [searchParams, currentOrder, navigate]);

  // Calculate time left - SIMPLIFIED VERSION
  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      // Bandingkan langsung dengan waktu sekarang
      // JavaScript otomatis handle timezone conversion
      const now = new Date();
      const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(timeRemaining);
      
      if (timeRemaining <= 0) {
        return false; // Stop timer
      }
      return true; // Continue timer
    };

    // Initial calculation
    if (!calculateTimeLeft()) return;

    // Set up interval
    const timer = setInterval(() => {
      if (!calculateTimeLeft()) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes} menit ${remainingSeconds} detik`;
    } else {
      return `${remainingSeconds} detik`;
    }
  };

  const copyPrintCode = () => {
    navigator.clipboard.writeText(printCode);
    toast.success('Kode cetak berhasil disalin!');
  };

  const handlePrintAgain = () => {
    clearOrder();
    localStorage.removeItem('printJob');
    localStorage.removeItem('paymentData');
    navigate('/pilih-jenis');
  };

  const handleBackToHome = () => {
    clearOrder();
    localStorage.removeItem('printJob');
    localStorage.removeItem('paymentData');
    navigate('/');
  };

  // Get order details from various sources
  const getOrderDetails = () => {
    if (printJobData) {
      return {
        type: printJobData.print_type === 'DOCS' ? 'documents' : 'photos',
        files: [{ name: printJobData.file_name }],
        totalPages: printJobData.page_count,
        colorType: printJobData.docs_color_type === 'BLACK_WHITE' ? 'bw' : 'color',
        photoSize: printJobData.photo_size,
        quantity: printJobData.photo_quantity,
        totalPrice: printJobData.total_price,
        status: printJobData.status,
        isExpired: printJobData.is_expired
      };
    }
    
    if (currentOrder) return currentOrder;
    
    const storedPrintJob = localStorage.getItem('printJob');
    if (storedPrintJob && storedPrintJob !== 'undefined' && storedPrintJob !== 'null') {
      try {
        const printJob = JSON.parse(storedPrintJob);
        return {
          type: printJob.print_type === 'DOCS' ? 'documents' : 'photos',
          files: [{ name: printJob.file_name }],
          totalPages: printJob.page_count,
          colorType: printJob.docs_color_type === 'BLACK_WHITE' ? 'bw' : 'color',
          photoSize: printJob.photo_size,
          quantity: printJob.photo_quantity,
          totalPrice: printJob.total_price,
          status: printJob.status,
          isExpired: printJob.is_expired
        };
      } catch (error) {
        console.error('Error parsing stored print job:', error);
        localStorage.removeItem('printJob');
        return null;
      }
    }
    
    return null;
  };

  const orderDetails = getOrderDetails();
  
  if (loading || !printCode) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Memuat data pesanan...</p>
        </div>
      </div>
    );
  }

  const isDocument = orderDetails?.type === 'documents';
  const Icon = isDocument ? FileText : Image;

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-20 h-20 text-success animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-base-content mb-2">
              Pembayaran Berhasil!
            </h1>
            <p className="text-base-content/70">
              Pesanan Anda telah dikonfirmasi dan siap untuk dicetak
            </p>
          </div>

          {/* Print Code Display */}
          <div className="card bg-primary text-primary-content shadow-xl mb-6">
            <div className="card-body text-center">
              <h2 className="card-title justify-center text-2xl mb-4">
                Kode Cetak Anda
              </h2>
              <div className="bg-base-300/30 rounded-lg p-6 mb-4 border border-base-content/20">
                <div className="text-6xl font-bold tracking-wider mb-2 font-mono" style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                  letterSpacing: '0.2em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {printCode}
                </div>
                <button
                  onClick={copyPrintCode}
                  className="btn btn-sm btn-ghost text-primary-content/80 hover:text-primary-content"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Salin Kode
                </button>
              </div>
              
              {/* Timer */}
              {expiresAt && (
                <div className="flex items-center justify-center space-x-2 text-primary-content/90">
                  <Clock className="w-5 h-5" />
                  <span className="text-lg font-semibold">
                    Berlaku selama: {formatTime(timeLeft)}
                  </span>
                </div>
              )}
              {timeLeft <= 300 && timeLeft > 0 && ( // Show warning when less than 5 minutes
                <div className="text-warning text-sm mt-2">
                  ⚠️ Kode akan kedaluwarsa dalam {Math.floor(timeLeft / 60)} menit!
                </div>
              )}
              {timeLeft <= 0 && (
                <div className="text-error text-sm mt-2">
                  ❌ Kode cetak telah kedaluwarsa
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className="card bg-base-100 shadow-xl border border-base-200 mb-6">
              <div className="card-body">
                <div className="flex items-center space-x-3 mb-4">
                  <Icon className="w-6 h-6 text-secondary" />
                  <h2 className="card-title">Detail Pesanan</h2>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Jenis Cetak:</span>
                    <span className="font-semibold">
                      {isDocument ? 'Dokumen' : 'Foto'}
                    </span>
                  </div>
                  
                  {isDocument ? (
                    <>
                      {orderDetails.files?.[0]?.name && (
                        <div className="flex justify-between items-center">
                          <span>File:</span>
                          <span className="font-semibold truncate ml-2" title={orderDetails.files[0].name}>
                            {orderDetails.files[0].name}
                          </span>
                        </div>
                      )}
                      {orderDetails.totalPages && (
                        <div className="flex justify-between items-center">
                          <span>Jumlah Halaman:</span>
                          <span className="font-semibold">{orderDetails.totalPages} halaman</span>
                        </div>
                      )}
                      {orderDetails.colorType && (
                        <div className="flex justify-between items-center">
                          <span>Jenis Cetak:</span>
                          <span className="font-semibold">
                            {orderDetails.colorType === 'bw' ? 'Hitam Putih' : 'Berwarna'}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {orderDetails.files?.[0]?.name && (
                        <div className="flex justify-between items-center">
                          <span>File:</span>
                          <span className="font-semibold truncate ml-2" title={orderDetails.files[0].name}>
                            {orderDetails.files[0].name}
                          </span>
                        </div>
                      )}
                      {orderDetails.photoSize && (
                        <div className="flex justify-between items-center">
                          <span>Ukuran:</span>
                          <span className="font-semibold">
                            {orderDetails.photoSize.replace('SIZE_', '')}
                          </span>
                        </div>
                      )}
                      {orderDetails.quantity && (
                        <div className="flex justify-between items-center">
                          <span>Jumlah Cetak:</span>
                          <span className="font-semibold">{orderDetails.quantity} foto</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="divider"></div>
                  
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold">Total Harga:</span>
                    <span className="font-bold text-2xl text-secondary">
                      Rp {amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="card bg-secondary/20 text-base-content shadow-xl mb-6 border border-secondary/30">
            <div className="card-body">
              <h2 className="card-title mb-4 text-secondary">Cara Menggunakan Kiosk</h2>
              <ol className="list-decimal list-inside space-y-2">
                <li>Datang ke lokasi kiosk BlackBoxZ terdekat</li>
                <li>Pilih menu "Ambil Pesanan" di layar kiosk</li>
                <li>Masukkan kode cetak: <strong>{printCode}</strong></li>
                <li>Konfirmasi detail pesanan Anda</li>
                <li>Tunggu proses pencetakan selesai</li>
                <li>Ambil hasil cetakan Anda</li>
              </ol>
              <div className="mt-4 p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                <p className="text-sm">
                  💡 <strong>Tips:</strong> Pastikan Anda datang sebelum kode kedaluwarsa. 
                  Jika mengalami kendala, hubungi customer service kami.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handlePrintAgain}
              className="btn btn-secondary btn-lg flex-1"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Cetak Lagi
            </button>
            <button
              onClick={handleBackToHome}
              className="btn btn-outline btn-lg flex-1"
            >
              <Home className="w-5 h-5 mr-2" />
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;