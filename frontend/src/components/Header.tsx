import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-6 left-1/2 z-50 w-[95%] max-w-4xl glass-panel rounded-full px-4 py-3 flex items-center justify-between text-gray-900"
    >
      <Link to="/" className="flex items-center gap-2 group pl-2">
        <div className="w-8 h-8 bg-[#0A0A0A] rounded-full flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md">
          <Layers size={16} strokeWidth={2.5} />
        </div>
        <span className="font-semibold text-lg tracking-tight hidden sm:block">atsai</span>
      </Link>
      
      {isLanding && (
        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#showcase" className="hover:text-gray-900 transition-colors">How it works</a>
          <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
        </nav>
      )}
      
      <div className="flex items-center gap-3 text-sm font-medium">
        <Link to="/login" className="hidden sm:block px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">Log In</Link>
        <Link to="/signup" className="bg-[#0A0A0A] text-white px-5 py-2.5 rounded-full hover:bg-black/80 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-lg shadow-black/10">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4 bg-white rounded-full p-[1px]" />
          Sign Up
        </Link>
      </div>
    </motion.header>
  );
}
