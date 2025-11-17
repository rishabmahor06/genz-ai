import React from "react";
// import Login from "./Login";
import Mic from "./Mic";
import { Routes, Route } from "react-router-dom";
// import OpenAi from './components/OpenAi'
// import Chat from './components/Chat'
import NewUi from "./components/New Ui/NewUi";

const App = () => {
  return (
    <div>
      <Routes>
        {/* <Route path="/" element={<Login />} /> */}
        {/* <Route path="/mic" element={<Mic />} />
        <Route path="/chat" element={<OpenAi />} />
        <Route path="/chat-ui" element={<Chat />} /> */}
        <Route path="/" element={<NewUi />} />
      </Routes>
    </div>
  );
};

export default App;
