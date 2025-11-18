import React from "react";
import Mic from "./Mic";
import { Routes, Route } from "react-router-dom";
import NewUi from "./components/New Ui/NewUi";

const App = () => {
  return (
    <div>
      <Routes>
       
        <Route path="/" element={<NewUi />} />
      </Routes>
    </div>
  );
};

export default App;
