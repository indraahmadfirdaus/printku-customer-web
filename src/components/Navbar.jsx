import { Link, useLocation } from 'react-router-dom';
import { Box, ArrowLeft } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="navbar bg-gradient-to-r from-blackboxz-dark to-blackboxz-gray shadow-lg">
      <div className="navbar-start">
        {!isHomePage && (
          <Link to="/" className="btn btn-ghost btn-sm text-white hover:text-blackboxz-accent">
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Link>
        )}
      </div>
      
      <div className="navbar-center">
        <Link to="/" className="btn btn-ghost text-xl font-bold text-white hover:text-blackboxz-accent transition-colors">
          <Box className="w-6 h-6 text-blackboxz-primary" />
          <div className="flex flex-col items-start ml-2">
            <span className="text-white font-bold tracking-wide">BlackBoxZ</span>
            <span className="text-xs text-blackboxz-accent tracking-widest uppercase">KIOSK PRINTING SYSTEM</span>
          </div>
        </Link>
      </div>
      
      <div className="navbar-end">
        {/* Additional nav items can go here */}
      </div>
    </div>
  );
};

export default Navbar;