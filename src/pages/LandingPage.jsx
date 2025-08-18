import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Image, 
  Printer, 
  CreditCard, 
  Clock, 
  Shield,
  Box
} from 'lucide-react';
import { getPricing } from '../lib/api';

const LandingPage = () => {
  const [docsPricing, setDocsPricing] = useState(null);
  const [photoPricing, setPhotoPricing] = useState(null);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const [docsData, photoData] = await Promise.all([
          getPricing('docs'),
          getPricing('photo')
        ]);
        setDocsPricing(docsData);
        setPhotoPricing(photoData);
      } catch (error) {
        console.error('Error fetching pricing:', error);
      }
    };

    fetchPricing();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="hero min-h-screen bg-gradient-to-br from-base-300 via-base-200 to-base-100">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary rounded-full shadow-lg">
                <Box className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-primary mb-2">BlackBoxZ</h1>
            <p className="py-6 text-lg text-base-content/80">
              Cetak dokumen dan foto jadi gampang banget! 
              Upload file kamu, bayar online, terus ambil hasilnya di kiosk terdekat.
            </p>
            <Link to="/pilih-jenis" className="btn btn-primary btn-lg shadow-lg hover:shadow-xl transition-all duration-300">
              Yuk Mulai Cetak!
            </Link>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="py-16 bg-base-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-base-content mb-4">
              Apa Aja yang Bisa Dicetak?
            </h2>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              Dari dokumen penting sampe foto kenangan, semua bisa dicetak dengan kualitas oke!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Documents Card */}
            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all duration-300 border border-primary/20">
              <div className="card-body text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="card-title justify-center text-xl mb-2">
                  Cetak Dokumen
                </h3>
                <p className="text-base-content/70 mb-4">
                  Format PDF
                </p>
                <div className="text-sm text-base-content/60">
                  Mulai dari <span className="font-semibold text-primary">
                    Rp {docsPricing?.pricing?.[0]?.price_per_page?.toLocaleString('id-ID') || '500'}
                  </span>/halaman
                </div>
              </div>
            </div>

            {/* Photos Card */}
            <div className="card bg-base-200 shadow-lg hover:shadow-xl transition-all duration-300 border border-secondary/20">
              <div className="card-body text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-secondary/10 rounded-full">
                    <Image className="w-8 h-8 text-secondary" />
                  </div>
                </div>
                <h3 className="card-title justify-center text-xl mb-2">
                  Cetak Foto
                </h3>
                <p className="text-base-content/70 mb-4">
                  Foto digital jadi foto fisik, berbagai ukuran tersedia
                </p>
                <div className="text-sm text-base-content/60">
                  Mulai dari <span className="font-semibold text-secondary">
                    Rp {photoPricing?.pricing?.[0]?.price_per_copy?.toLocaleString('id-ID') || '2.000'}
                  </span>/foto
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16 bg-base-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-base-content mb-4">
              Gimana Caranya?
            </h2>
            <p className="text-base-content/70 max-w-2xl mx-auto">
              Gampang kok! Cuma 4 langkah doang
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                step: 1,
                title: "Upload File",
                description: "Pilih file yang mau dicetak dari HP atau laptop kamu",
                icon: FileText
              },
              {
                step: 2,
                title: "Setting Cetak",
                description: "Atur ukuran, jumlah copy, dan setting lainnya sesuai kebutuhan",
                icon: Printer
              },
              {
                step: 3,
                title: "Bayar",
                description: "Bayar pakai berbagai metode pembayaran yang tersedia",
                icon: CreditCard
              },
              {
                step: 4,
                title: "Ambil di Kiosk",
                description: "Pakai kode yang dikasih buat ambil hasil cetakan",
                icon: Clock
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                      {item.step}
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-base-content/70 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-base-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-base-content mb-4">
              Kenapa Pilih BlackBoxZ?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: "Praktis & Cepet",
                description: "Upload file, bayar, ambil. Sesimpel itu! Hasil cetak juga cepet, ga perlu nunggu lama",
                icon: Clock,
                color: "text-primary"
              },
              {
                title: "Aman Terpercaya",
                description: "File kamu aman, pembayaran juga secure. Udah dipake ribuan orang!",
                icon: Shield,
                color: "text-secondary"
              },
              {
                title: "Kualitas Bagus",
                description: "Printer canggih, hasil cetak jernih dan rapi. Dijamin puas!",
                icon: Box,
                color: "text-accent"
              }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-base-200 rounded-full shadow-lg">
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                  </div>
                </div>
                <h3 className="font-semibold text-xl mb-3">{feature.title}</h3>
                <p className="text-base-content/70">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Udah Siap Cetak?
          </h2>
          <p className="text-primary-content/80 mb-8 max-w-2xl mx-auto">
            Join ribuan orang yang udah pake BlackBoxZ buat cetak dokumen dan foto mereka
          </p>
          <Link to="/pilih-jenis" className="btn btn-accent btn-lg text-white shadow-lg hover:shadow-xl transition-all duration-300">
            Gas Cetak Sekarang!
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;