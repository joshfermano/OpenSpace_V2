import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { CiLogin } from 'react-icons/ci';
import { IoMdPerson } from 'react-icons/io';
import { IoMenuOutline } from 'react-icons/io5';
import { IoCloseOutline } from 'react-icons/io5';
import { IoPersonSharp } from 'react-icons/io5';
import { IoLogOut } from 'react-icons/io5';
import { MdAdminPanelSettings } from 'react-icons/md';
import { HiSun, HiMoon } from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import logo_black from '../assets/logo_black.png';
import logo_white from '../assets/logo_white.png';

const Navbar = () => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const { isAuthenticated, logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Handle scroll effect for transparency
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const systemDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      setDarkMode(systemDark);
      document.documentElement.classList.toggle('dark', systemDark);
      localStorage.setItem('theme', systemDark ? 'dark' : 'light');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  const toggleMobileMenu = () => {
    setIsMobile((prev) => !prev);
  };

  const handleLogout = () => {
    logout();
    setIsMobile(false);
  };

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return isActive
      ? 'font-bold text-blue-600 dark:text-blue-400'
      : 'text-gray-700 dark:text-gray-300';
  };

  const getMobileNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return `block px-4 py-3 rounded-lg transition-all duration-300 ${
      isActive
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`;
  };

  return (
    <>
      {/* Fixed navbar */}
      <nav
        className={`font-poppins fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/80 dark:bg-darkBlue/80 backdrop-blur-md shadow-lg'
            : 'bg-light dark:bg-darkBlue'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo - Left */}
            <div className="flex-shrink-0">
              <NavLink to={'/'} className="block">
                {darkMode ? (
                  <img
                    className="w-12 sm:w-14 md:w-16 h-auto"
                    src={logo_white}
                    alt="OpenSpace Logo"
                  />
                ) : (
                  <img
                    className="w-12 sm:w-14 md:w-16 h-auto"
                    src={logo_black}
                    alt="OpenSpace Logo"
                  />
                )}
              </NavLink>
            </div>

            {/* Navigation Links - Center (Desktop) */}
            <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `hover:scale-105 transition-all duration-300 font-medium ${getNavLinkClass(
                    {
                      isActive,
                    }
                  )}`
                }>
                Home
              </NavLink>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `hover:scale-105 transition-all duration-300 font-medium ${getNavLinkClass(
                    {
                      isActive,
                    }
                  )}`
                }>
                About
              </NavLink>
            </div>

            {/* Right section - Auth buttons, mobile menu, theme toggle */}
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
              {/* Desktop Auth Buttons */}
              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-3">
                  {isAdmin ? (
                    <NavLink
                      to="/admin/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 hover:scale-105 transition-all duration-300 shadow-sm">
                      <MdAdminPanelSettings size={18} />
                      Admin
                    </NavLink>
                  ) : (
                    <NavLink
                      to="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-105 transition-all duration-300 text-gray-700 dark:text-gray-300">
                      <IoPersonSharp size={18} />
                      Dashboard
                    </NavLink>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-105 transition-all duration-300 text-red-600 dark:text-red-400">
                    <IoLogOut size={18} />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <NavLink
                    to="/auth/login"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:scale-105 transition-all duration-300 text-gray-700 dark:text-gray-300">
                    <CiLogin size={18} />
                    Login
                  </NavLink>

                  <NavLink
                    to="/auth/register"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 hover:scale-105 transition-all duration-300 shadow-sm">
                    <IoMdPerson size={18} />
                    Register
                  </NavLink>
                </div>
              )}

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                aria-label="Toggle theme">
                {darkMode ? (
                  <HiSun size={20} className="text-yellow-500" />
                ) : (
                  <HiMoon size={20} className="text-gray-700" />
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 text-gray-600 dark:text-gray-400"
                aria-label="Toggle menu">
                {isMobile ? (
                  <IoCloseOutline size={24} />
                ) : (
                  <IoMenuOutline size={24} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobile && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-darkBlue/95 backdrop-blur-md">
            <div className="px-4 py-4 space-y-2">
              {/* Navigation Links */}
              <div className="space-y-1 mb-4">
                <NavLink
                  to="/"
                  onClick={() => setIsMobile(false)}
                  className={getMobileNavLinkClass}>
                  Home
                </NavLink>
                <NavLink
                  to="/about"
                  onClick={() => setIsMobile(false)}
                  className={getMobileNavLinkClass}>
                  About
                </NavLink>
              </div>

              {/* Auth Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    {isAdmin ? (
                      <NavLink
                        to="/admin/dashboard"
                        onClick={() => setIsMobile(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                        <MdAdminPanelSettings size={20} />
                        Admin Dashboard
                      </NavLink>
                    ) : (
                      <NavLink
                        to="/dashboard"
                        onClick={() => setIsMobile(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
                        <IoPersonSharp size={20} />
                        My Dashboard
                      </NavLink>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                      <IoLogOut size={20} />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <NavLink
                      to="/auth/login"
                      onClick={() => setIsMobile(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors">
                      <CiLogin size={20} />
                      Login
                    </NavLink>

                    <NavLink
                      to="/auth/register"
                      onClick={() => setIsMobile(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                      <IoMdPerson size={20} />
                      Register
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-16 sm:h-20"></div>
    </>
  );
};

export default Navbar;
