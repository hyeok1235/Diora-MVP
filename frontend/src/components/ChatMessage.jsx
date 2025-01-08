// frontend/src/components/ChatMessage.jsx
import PropTypes from "prop-types";

const ChatMessage = ({ message }) => {
  const renderCafeInfo = (cafeData) => {
    console.log(cafeData);
    if (cafeData.name === "모르겠어요") {
      return (
        <div className="cafe-info">더 구체적인 정보를 알려주시겠어요?</div>
      );
    }
    return (
      <div className="cafe-info">
        <h3 className="cafe-name">{cafeData.name}</h3>
        <div className="cafe-details">
          <p className="cafe-address">
            <span className="label">📍 주소:</span> {cafeData.road_address}
          </p>
          <p className="cafe-station">
            <span className="label">🚇 가까운 역:</span> {cafeData.subway}
          </p>
          <p className="cafe-description">
            <span className="label">✨ 설명:</span> {cafeData.diora_info}
          </p>
          <div className="cafe-points">
            <span className="label">🔹 알아야 할 3가지 Point!</span>
            <ol>
              <li>{cafeData.point_1}</li>
              <li>{cafeData.point_2}</li>
              <li>{cafeData.point_3}</li>
            </ol>
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
