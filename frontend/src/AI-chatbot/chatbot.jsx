import { useState, useRef, useEffect } from "react";
import { TbMessageChatbotFilled } from "react-icons/tb";
import ChatForm from './components/ChatForm';
import ChatMessage from './components/ChatMessage';
import '../styles/chatbot.css';

const ChatBot = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const chatBodyRef = useRef();

  const generateBotResponse = async (history) => {
    const updateHistory = (text) => {
      setChatHistory(prev => [...prev.filter(msg => msg.text !== "Thinking..."), { role: "model", text }]);
    }
    history = history.map(({ role, text }) => ({ role, parts: [{ text }] }));
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: history })
    };

    try {
      // make API call to get bot's response
      const response = await fetch(process.env.REACT_APP_API_URL, requestOptions);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message || "Something went wrong!");

      const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
      updateHistory(apiResponseText);
    } catch (error) {
      console.log(error);
    };
  };

  useEffect(() => {
    chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="chatbot-popup">
      {/* Chatbot header */}
      <div className="chat-header">
        <div className="header-info">
          <TbMessageChatbotFilled size={50} />
          <h2 className="logo-text">Chatbot</h2>
        </div>
        <button className="material-symbols-rounded">
          keyboard_arrow_down
        </button>
      </div>

      {/* Chatbot body */}
      <div ref={chatBodyRef} className="chat-body">
        <div className="message bot-message">
          <TbMessageChatbotFilled size={45} />
          <p className="message-text">
            Hey there, How can I help you today?
          </p>
        </div>

        {chatHistory.map((chat, index) => (
          <ChatMessage key={index} chat={chat} />
        ))}
      </div>

      {/* Chat Footer */}
      <div className="chat-footer">
        <ChatForm
          chatHistory={chatHistory}
          setChatHistory={setChatHistory}
          generateBotResponse={generateBotResponse}
        />
      </div>
    </div>
  );
};

export default ChatBot
