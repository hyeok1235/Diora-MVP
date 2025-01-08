// frontend/src/components/ChatInterface.jsx
import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import MessageInput from "./MessageInput";

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatCafeResponse = (responseString) => {
    try {
      // JSON 문자열 시작과 끝을 기준으로 분리
      const splitData = responseString.split("{");
      if (splitData.length > 1) {
        const jsonPart = "{" + splitData[1].split("}")[0] + "}";
        const parsedData = JSON.parse(jsonPart); // JSON 파싱

        // 검증된 JSON 데이터를 반환
        return {
          type: "bot",
          content: parsedData,
          isFormatted: true,
        };
      }

      // JSON이 아닌 경우 기본 텍스트 응답으로 처리
      throw new Error("No valid JSON found");
    } catch (e) {
      console.error("Error parsing JSON:", e);
      return {
        type: "bot",
        content: responseString,
        isFormatted: false,
      };
    }
  };

  const sendMessage = async (text) => {
    try {
      setIsLoading(true);
      setMessages((prev) => [...prev, { type: "user", content: text }]);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chatbot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: text }),
        }
      );

      const data = await response.json();
      setMessages((prev) => [...prev, formatCafeResponse(data.answer)]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: "죄송합니다. 오류가 발생했습니다.",
          isFormatted: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isLoading && <div className="loading">답변을 생각하고 있어요...</div>}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatInterface;
