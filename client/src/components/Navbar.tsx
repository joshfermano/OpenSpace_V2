import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { CiLogin } from 'react-icons/ci';
import { IoMdPerson } from 'react-icons/io';
import { IoMenuOutline } from 'react-icons/io5';
import { IoCloseOutline } from 'react-icons/io5';
import { IoPersonSharp } from 'react-icons/io5';
import { IoLogOut } from 'react-icons/io5';
import { MdAdminPanelSettings } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import logo_black from '../assets/logo_black.png';
import logo_white from '../assets/logo_white.png';

const Navbar = () => {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const { isAuthenticated, logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
    return isActive ? 'font-bold' : '';
  };

  return (
    <nav className="font-poppins p-4 bg-light dark:bg-darkBlue dark:text-light transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center py-2 border-b border-gray-200">
        {/* Logo - Left */}
        <div className="w-1/4 flex-shrink-0">
          <NavLink to={'/'}>
            {darkMode ? (
              <img
                className="w-[60px] md:w-[75px]"
                src={logo_white}
                alt="OpenSpace Logo"
              />
            ) : (
              <img
                className="w-[60px] md:w-[75px]"
                src={logo_black}
                alt="OpenSpace Logo"
              />
            )}
          </NavLink>
        </div>

        {/* Navigation Links - Center */}
        <div className="w-2/4 flex justify-center">
          <div className="hidden md:flex items-center gap-8 text-md">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `hover:scale-105 transition-all duration-500 ${getNavLinkClass({
                  isActive,
                })}`
              }>
              Home
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `hover:scale-105 transition-all duration-500 ${getNavLinkClass({
                  isActive,
                })}`
              }>
              About
            </NavLink>
          </div>
        </div>

        {/* Right section - Auth buttons, mobile menu, theme toggle */}
        <div className="w-1/4 flex justify-end items-center gap-2 md:gap-6">
          {isAuthenticated ? (
            <div className="hidden md:flex justify-between items-center gap-4">
              {isAdmin ? (
                <NavLink
                  to="/admin/dashboard"
                  className="flex items-center gap-2 text-md px-3 py-1 border rounded-lg bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 hover:scale-105 border-blue-700 dark:border-blue-600 transition duration-500">
                  <MdAdminPanelSettings className="text-xl" /> Admin
                </NavLink>
              ) : (
                <NavLink
                  to="/dashboard"
                  className="flex items-center gap-2 text-md px-3 py-1 border rounded-lg hover:bg-darkBlue hover:text-light dark:hover:bg-light dark:hover:text-darkBlue hover:scale-105 border-darkBlue dark:border-light transition duration-500">
                  <IoPersonSharp className="text-xl" /> Me
                </NavLink>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-md px-3 py-1 border rounded-lg hover:bg-red-700 hover:text-light hover:scale-105 border-darkBlue dark:border-light transition duration-500 cursor-pointer">
                <IoLogOut className="text-xl" /> Logout
              </button>
            </div>
          ) : (
            <div className="hidden md:flex justify-between items-center gap-4">
              <NavLink
                to="/auth/login"
                className="flex items-center gap-2 text-md px-3 py-1 border rounded-lg hover:bg-darkBlue hover:text-light dark:hover:bg-light dark:hover:text-darkBlue hover:scale-105 border-darkBlue dark:border-light transition duration-500">
                <CiLogin className="text-xl" /> Login
              </NavLink>

              <NavLink
                to="/auth/register"
                className="flex items-center gap-2 text-md px-3 py-1 border rounded-lg hover:bg-darkBlue hover:text-light dark:hover:bg-light dark:hover:text-darkBlue hover:scale-105 border-darkBlue dark:border-light transition duration-500">
                <IoMdPerson className="text-xl" /> Register
              </NavLink>
            </div>
          )}

          {/* Mobile Menu Button */}
          {isMobile ? (
            <button onClick={toggleMobileMenu} className="md:hidden text-2xl ">
              <IoCloseOutline />
            </button>
          ) : (
            <button onClick={toggleMobileMenu} className="md:hidden text-2xl ">
              <IoMenuOutline />
            </button>
          )}

          {isMobile && (
            <div className="absolute z-20 top-[76px] left-0 text-md bg-light dark:bg-darkBlue w-full p-4 shadow-lg shadow-gray-300 dark:shadow-gray-900 flex flex-col justify-center items-center gap-4 md:hidden">
              <NavLink
                to={'/'}
                className={({ isActive }) =>
                  `${getNavLinkClass({ isActive })}`
                }>
                Homepage
              </NavLink>

              <NavLink
                to={'/about'}
                className={({ isActive }) =>
                  `${getNavLinkClass({ isActive })}`
                }>
                About
              </NavLink>

              {isAuthenticated ? (
                <>
                  {isAdmin ? (
                    <NavLink
                      to="/admin/dashboard"
                      className={({ isActive }) =>
                        `flex items-center gap-2 text-blue-600 dark:text-blue-400 ${getNavLinkClass(
                          {
                            isActive,
                          }
                        )}`
                      }>
                      <MdAdminPanelSettings /> Admin Dashboard
                    </NavLink>
                  ) : (
                    <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                        `flex items-center gap-2 ${getNavLinkClass({
                          isActive,
                        })}`
                      }>
                      <IoPersonSharp /> My Dashboard
                    </NavLink>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                    <IoLogOut /> Logout
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to={'/auth/login'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${getNavLinkClass({ isActive })}`
                    }>
                    <CiLogin /> Login
                  </NavLink>

                  <NavLink
                    to={'/auth/register'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 ${getNavLinkClass({ isActive })}`
                    }>
                    <IoMdPerson /> Register
                  </NavLink>
                </>
              )}
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="px-3 py-1 border text-xs rounded-lg hover:bg-darkBlue hover:text-light dark:hover:bg-light dark:hover:text-darkBlue hover:scale-105 border-darkBlue dark:border-light transition duration-500 cursor-pointer">
            {darkMode ? <p>Light</p> : <p>Dark</p>}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
