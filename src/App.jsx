import React from "react";
import Mic from "./Mic";
import { Routes, Route } from "react-router-dom";
import Home from "./components/chatgpt/Home";

const App = () => {
  return (
    <div>
      <Routes>
       
        
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  );
};

export default App;
