import React from "react";
import { Bell, Settings } from "lucide-react";
import ContentArea from "./ContentArea";
import logo from "../../assets/genz-logo.png";
// import profile from

const Navbar = () => {
  return (
    <div className="bg-gray-200 py-5 px-3">
      <div className="flex justify-between mb-5 backdrop-blur-xs backdrop-filter sticky top-0 ">
        <div>
          <img
            className="w-12 rounded-full cursor-pointer"
            src={logo}
            alt="Logo-image"
          />
        </div>
        <div >
          <ul className="flex  items-center -gap-1 bg-white rounded-full ">
            <li className="hover:bg-gray-400 text-black hover:text-white px-10 py-3 rounded-4xl active:bg-black">Chat</li>
            <li className="hover:bg-gray-400  hover:text-white px-10 py-3 rounded-4xl">My Project</li>
            <li className="hover:bg-gray-400  hover:text-white px-10 py-3 rounded-4xl">Brand Voice</li>
            <li className="hover:bg-gray-400  hover:text-white px-10 py-3 rounded-4xl">Templates</li>
            <li className="hover:bg-gray-400  hover:text-white px-10 py-3 rounded-4xl">Tools</li>
          </ul>
        </div>

        <div className=" flex justify-between w-98 bg-white px-1.5 rounded-full overflow-hidden">
          <div className="flex justify-between gap-3 items-center">
            <img
              className="w-10 rounded-full"
              src="https://i.pinimg.com/1200x/63/f3/a0/63f3a0fe0c318b623d9a431e2817b515.jpg"
              alt="profile-image"
            />
            <h4 className="text-lg font-serif">Rishab</h4>
          </div>
          <div className="flex justify-between items-center gap-3">
            <Bell className="bg-gray-200 w-10 h-10 px-2 py-2 rounded-4xl hover:bg-gray-300 cursor-pointer"/>
            <Settings className="bg-gray-200 w-10 h-10 px-2 py-2 rounded-4xl hover:bg-gray-300 cursor-pointer" />
          </div>
        </div>
      </div>
      <div className=" w-full">
        <ContentArea />
      </div>
    </div>
  );
};

export default Navbar;
