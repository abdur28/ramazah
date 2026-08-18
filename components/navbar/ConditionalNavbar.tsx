'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import HomeNavbar from './HomeNavbar';

const ConditionalNavbar = () => {
  const pathname = usePathname();

  if (pathname.startsWith('/auth')) {
    return null;
  }
  
  // Use HomeNavbar for the homepage, regular Navbar for all other pages
  if (pathname === '/') {
    return <HomeNavbar />;
  }
  
  return <Navbar />;
};

export default ConditionalNavbar;