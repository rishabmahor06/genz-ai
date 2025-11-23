import React from "react";
import Mic from "./Mic";
import { Routes, Route } from "react-router-dom";
import NewUi from "./components/New Ui/NewUi";
import Home from "./components/chatgpt/Home";

const App = () => {
  return (
    <div>
      <Routes>
       
        <Route path="/" element={<NewUi />} />
        <Route path="/new" element={<Home />} />
      </Routes>
    </div>
  );
};

export default App;
