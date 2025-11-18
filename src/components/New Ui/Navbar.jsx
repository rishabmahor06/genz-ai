import React from "react";
import { Bell, Settings } from "lucide-react";
import ContentArea from "./ContentArea";
import logo from "../../assets/genz-logo.png";

const Navbar = () => {
  return (
    <div className="bg-gray-200 px-3">
      <div className="flex flex-wrap justify-between items-center mb-5 sticky top-0 bg-gray-200/80 backdrop-blur-md py-3 px-3 rounded-lg z-50">
        {/* Logo */}
        <div className="flex items-center">
          <img
            className="w-12 rounded-full cursor-pointer"
            src={logo}
            alt="Logo-image"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="w-full md:w-auto mt-3 md:mt-0 flex justify-center">
          <ul className="flex items-center gap-1 bg-white rounded-full shadow px-2 py-1 overflow-x-auto no-scrollbar">
            {["Chat", "My Project", "Brand Voice", "Templates", "Tools"].map(
              (item) => (
                <li
                  key={item}
                  className="hover:bg-gray-400 text-black hover:text-white px-6 py-2 rounded-full cursor-pointer transition whitespace-nowrap"
                >
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        {/* Profile + Icons */}
        <div className="flex  items-center justify-between w-82 gap-3 bg-white px-1.5 py-1 rounded-full shadow mt-3 md:mt-0">
          <div className="flex items-center gap-3">
            <img
              className="w-10 h-10 object-cover rounded-full"
              src="https://i.pinimg.com/1200x/63/f3/a0/63f3a0fe0c318b623d9a431e2817b515.jpg"
              alt="profile-image"
            />
            <h4 className="text-lg font-serif font-medium hidden sm:block">
              Rishab
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <Bell className="bg-gray-200 w-10 h-10 p-2 rounded-full hover:bg-gray-300 cursor-pointer transition" />
            <Settings className="bg-gray-200 w-10 h-10 p-2 rounded-full hover:bg-gray-300 cursor-pointer transition" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <ContentArea />
    </div>
  );
};

export default Navbar;
