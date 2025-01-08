// frontend/src/App.jsx
import ChatInterface from "./components/ChatInterface";
import "./styles/global.css";

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Diora AI</h1>
      </header>
      <main>
        <ChatInterface />
      </main>
    </div>
  );
}

export default App;
