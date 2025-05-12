// backend/src/routes/chatbot.js
import express from "express";
import { chain } from "../services/chatbotService.js";
import {
  extractLocationFromQuery,
  findSubwayRoadAddress,
  getRoadAddress,
} from "../services/chatbotService.js";

const router = express.Router();

// POST 요청 처리
router.post("/", async (req, res) => {
  try {
    const { query } = req.body;

    // Extract location and create final query (similar to your test code)
    const location = await extractLocationFromQuery(query);
    const subwayRoadAddress = await findSubwayRoadAddress(location);

    let finalQuery = query;

    if (location) {
      const roadAddress = await getRoadAddress(location);

      if (roadAddress) {
        finalQuery = `${query}\nroad_address = ${roadAddress}`;
      } else {
        finalQuery = `${query}\d위치 = ${location}`;
      }

      console.log(subwayRoadAddress.pageContent);

      // if (subwayRoadAddress) {
      //   finalQuery = `${finalQuery}\nsubway_info = ${subwayRoadAddress["name"]}\nsubway_address = ${subwayRoadAddress["roadAddress"]}`;
      // }
    }

    const answer = await chain.invoke(finalQuery);

    res.json({ answer });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET 요청 처리 (dummy 데이터)
router.get("/", (req, res) => {
  const dummyResponse = {
    message: "This is a dummy response for GET method.",
    status: "success",
  };
  res.json(dummyResponse);
});

export default router;
