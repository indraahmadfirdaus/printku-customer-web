import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircle, Phone, Mail, MessageCircle, Home, RotateCcw } from 'lucide-react';
import { useStore } from '../store/useStore';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const { currentOrder, clearOrder } = useStore();

  // Redirect if no order data
  useEffect(() => {
    if (!currentOrder) {
      navigate('/');
    }
  }, [currentOrder, navigate]);

  const handleTryAgain = () => {
    // Keep the order data and go back to payment
    navigate('/pembayaran');
  };

  const handleStartOver = () => {
    clearOrder();
    navigate('/pilih-jenis');
  };

  if (!currentOrder) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Error Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <XCircle className="w-20 h-20 text-error animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-base-content mb-2">
              Pembayaran Gagal
            </h1>
            <p className="text-base-content/70">
              Maaf, terjadi kesalahan saat memproses pembayaran Anda
            </p>
          </div>

          {/* Error Details */}
          <div className="card bg-error text-error-content shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title mb-4">Kemungkinan Penyebab</h2>
              <ul className="list-disc list-inside space-y-2">
                <li>Saldo tidak mencukupi</li>
                <li>Koneksi internet terputus</li>
                <li>Kartu kredit/debit bermasalah</li>
                <li>Sesi pembayaran kedaluwarsa</li>
                <li>Gangguan sistem sementara</li>
              </ul>
            </div>
          </div>

          {/* Order Summary */}
          <div className="card bg-base-100 shadow-xl border border-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Jenis Cetak:</span>
                  <span className="font-semibold">
                    {currentOrder.type === 'documents' ? 'Dokumen' : 'Foto'}
                  </span>
                </div>
                
                {currentOrder.type === 'documents' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Jumlah Halaman:</span>
                      <span className="font-semibold">{currentOrder.totalPages} halaman</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Jenis Cetak:</span>
                      <span className="font-semibold">
                        {currentOrder.colorType === 'bw' ? 'Hitam Putih' : 'Berwarna'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span>Ukuran:</span>
                      <span className="font-semibold">
                        {currentOrder.photoSize?.replace('SIZE_', '')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Jumlah Cetak:</span>
                      <span className="font-semibold">{currentOrder.quantity} foto</span>
                    </div>
                  </>
                )}
                
                <div className="divider"></div>
                
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Total Harga:</span>
                  <span className="font-bold text-2xl text-secondary">
                    Rp {currentOrder.totalPrice?.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="card bg-warning text-warning-content shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title mb-4">Butuh Bantuan?</h2>
              <p className="mb-4">
                Jika masalah terus berlanjut, silakan hubungi customer service kami:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a
                  href="tel:+6281234567890"
                  className="btn btn-sm bg-warning-content text-warning hover:bg-warning-content/90"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Telepon
                </a>
                
                <a
                  href="mailto:support@printku.com"
                  className="btn btn-sm bg-warning-content text-warning hover:bg-warning-content/90"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
                
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm bg-warning-content text-warning hover:bg-warning-content/90"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </div>
              
              <div className="mt-4 p-3 bg-warning-content/20 rounded-lg">
                <p className="text-sm">
                  <strong>Jam Operasional:</strong><br />
                  Senin - Jumat: 08:00 - 17:00 WIB<br />
                  Sabtu - Minggu: 09:00 - 15:00 WIB
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleTryAgain}
              className="btn btn-primary btn-lg flex-1"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Coba Lagi
            </button>
            
            <button
              onClick={handleStartOver}
              className="btn btn-outline btn-lg flex-1"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Mulai Ulang
            </button>
            
            <Link to="/" className="btn btn-ghost btn-lg flex-1">
              <Home className="w-5 h-5 mr-2" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;