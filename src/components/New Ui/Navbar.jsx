import React, { useState } from "react";
import { Bell, Settings, Menu, X, Plus, Trash2 } from "lucide-react";
import ContentArea from "./ContentArea";
import logo from "../../assets/genz-logo.png";
import ToggleTheme from "./ToggleTheme";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-200 dark:bg-gray-800 px-3  min-h-screen">

      <div className="flex justify-between items-center mb-2  sticky top-0 bg-gray-100 dark:bg-gray-700 backdrop-blur-md py-3 px-3 rounded-lg z-50">

        {/* Left: Logo */}
        <div className="flex items-center">
          <img
            className="w-10 rounded-full cursor-pointer"
            src={logo}
            alt="Logo"
          />
        </div>

        {/* Center (MOBILE ONLY): Theme toggle + New chat + Clear chat + Profile */}
        <div className="flex md:hidden items-center gap-3">
          <ToggleTheme />
          
          <img
            className="w-9 h-9 rounded-full"
            src="https://i.pinimg.com/1200x/63/f3/a0/63f3a0fe0c318b623d9a431e2817b515.jpg"
            alt="profile"
          />
        </div>

        {/* Right: Hamburger (Mobile Only) */}
        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-600"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex w-full md:w-auto justify-center">
          <ul className="flex items-center gap-1 bg-white dark:bg-gray-600 rounded-full shadow px-2 py-1">
            {["Chat", "History"].map((item) => (
              <li
                key={item}
                className="hover:bg-gray-400 dark:hover:bg-gray-500 text-black dark:text-white hover:text-white px-6 py-2 rounded-full cursor-pointer transition whitespace-nowrap"
              >
                {item}
              </li>
            ))}

            <li className="px-4">
              <ToggleTheme />
            </li>
          </ul>
        </div>

        {/* Desktop Profile Section */}
        <div className="hidden md:flex items-center gap-3 bg-white dark:bg-gray-600 px-2 py-1 rounded-full shadow">
          <div className="flex items-center gap-3">
            <img
              className="w-10 h-10 rounded-full"
              src="https://i.pinimg.com/1200x/63/f3/a0/63f3a0fe0c318b623d9a431e2817b515.jpg"
              alt="profile"
            />
            <h4 className="text-lg font-serif font-medium hidden sm:block text-black dark:text-white">
              Rishab
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <Bell className="bg-gray-200 dark:bg-gray-500 w-10 h-10 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-400 cursor-pointer transition" />
            <Settings className="bg-gray-200 dark:bg-gray-500 w-10 h-10 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-400 cursor-pointer transition" />
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-gray-700 rounded-lg shadow px-4 py-4">
          <ul className="flex flex-col gap-3 text-black dark:text-white">
            {["Chat", "My Project", "Brand Voice", "Templates"].map((item) => (
              <li
                key={item}
                className="py-2 px-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ContentArea />
    </div>
  );
};

export default Navbar;
