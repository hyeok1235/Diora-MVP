import { useState } from "react";
import PropTypes from "prop-types";

const MessageInput = ({ onSend, isLoading }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-container">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="카페 추천을 요청해보세요..."
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading || !message.trim()}>
        전송
      </button>
    </form>
  );
};

MessageInput.propTypes = {
  onSend: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

export default MessageInput;
