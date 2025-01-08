// frontend/src/components/ChatMessage.jsx
import PropTypes from "prop-types";

const ChatMessage = ({ message }) => {
  const renderCafeInfo = (cafeData) => {
    return (
      <div className="cafe-info">
        <h3 className="cafe-name">{cafeData.name}</h3>
        <div className="cafe-details">
          <p className="cafe-address">
            <span className="label">📍 주소:</span> {cafeData.address}
          </p>
          <p className="cafe-station">
            <span className="label">🚇 가까운 역:</span>{" "}
            {cafeData.nearest_station}
          </p>
          <p className="cafe-description">
            <span className="label">✨ 설명:</span> {cafeData.description}
          </p>
          <div className="cafe-features">
            <span className="label">🏷️ 특징:</span>
            <ul>
              {cafeData.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
          <p className="cafe-hashtags">
            <span className="label">🔖 태그:</span> {cafeData.hashtags}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={`message ${message.type}`}>
      <div className="message-content">
        {message.type === "bot" && <div className="bot-icon">🤖</div>}
        <div className="text">
          {message.isFormatted
            ? renderCafeInfo(message.content)
            : message.content}
        </div>
        {message.type === "user" && <div className="user-icon">👤</div>}
      </div>
    </div>
  );
};

ChatMessage.propTypes = {
  message: PropTypes.shape({
    type: PropTypes.string.isRequired,
    content: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        name: PropTypes.string,
        address: PropTypes.string,
        nearest_station: PropTypes.string,
        description: PropTypes.string,
        features: PropTypes.arrayOf(PropTypes.string),
        hashtags: PropTypes.string,
      }),
    ]).isRequired,
    isFormatted: PropTypes.bool, // 추가된 isFormatted
  }).isRequired,
};

export default ChatMessage;
