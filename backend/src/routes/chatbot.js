// backend/src/routes/chatbot.js
import express from "express";
import { chain } from "../services/chatbotService.js";
import {
  extractLocationFromQuery,
  findSubwayRoadAddress,
  getRoadAddress,
} from "../services/chatbotService.js";

const router = express.Router();

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
        finalQuery = `${query}\n위치 = ${roadAddress}`;
      } else {
        finalQuery = `${query}\n위치 = ${location}`;
      }

      if (subwayRoadAddress) {
        finalQuery = `${finalQuery}\n지하철역명 = ${subwayRoadAddress["name"]}\n지하철역의 주소 = ${subwayRoadAddress["roadAddress"]}`;
      }
    }

    const answer = await chain.invoke(finalQuery);

    res.json({ answer });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
