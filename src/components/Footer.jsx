import { Box, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-blackboxz-dark text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <Box className="w-6 h-6 text-blackboxz-primary" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white tracking-wide">BlackBoxZ</span>
                <span className="text-xs text-blackboxz-accent tracking-widest uppercase">KIOSK PRINTING SYSTEM</span>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              Sistem cetak kiosk praktis dan kekinian.
            </p>
          </div>

          {/* Services */}
          <div className="col-span-1">
            <h3 className="font-semibold mb-4 text-blackboxz-accent">Layanan</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="hover:text-blackboxz-accent transition-colors cursor-pointer">Cetak Dokumen</li>
              <li className="hover:text-blackboxz-accent transition-colors cursor-pointer">Cetak Foto</li>
            </ul>
          </div>

          {/* Support */}
          <div className="col-span-1">
            <h3 className="font-semibold mb-4 text-blackboxz-accent">Bantuan</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="hover:text-blackboxz-accent transition-colors cursor-pointer">Cara Penggunaan</li>
              <li className="hover:text-blackboxz-accent transition-colors cursor-pointer">FAQ</li>
              <li className="hover:text-blackboxz-accent transition-colors cursor-pointer">Hubungi Kami</li>
              <li className="hover:text-blackboxz-accent transition-colors cursor-pointer">Syarat & Ketentuan</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1">
            <h3 className="font-semibold mb-4 text-blackboxz-accent">Kontak</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-center space-x-2 hover:text-blackboxz-accent transition-colors">
                <Phone className="w-4 h-4" />
                <span>+62</span>
              </div>
              <div className="flex items-center space-x-2 hover:text-blackboxz-accent transition-colors">
                <Mail className="w-4 h-4" />
                <span></span>
              </div>
              <div className="flex items-center space-x-2 hover:text-blackboxz-accent transition-colors">
                <MapPin className="w-4 h-4" />
                <span>Jakarta, Indonesia</span>
              </div>
            </div>
          </div>
        </div>

        <div className="divider border-blackboxz-gray"></div>

        <div className="text-center text-sm text-gray-400">
          <p>&copy; 2024 BlackBoxZ. Semua hak dilindungi.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;