// backend/src/services/chatbotService.js
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { formatDocumentsAsString } from "langchain/util/document";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
import csvParser from "csv-parser";

dotenv.config();

// Embedding 로드, Retriever 생성
const cafe_vectorStorePath = "./references/cafe_info_vectorstore";

const cafe_vectorStore = await HNSWLib.load(
  cafe_vectorStorePath,
  new OpenAIEmbeddings()
);

const k = 6; // retrieve할 갯수 설정
const cafe_vectorStoreRetriever = cafe_vectorStore.asRetriever({ k });

// Prompt Template
const SYSTEM_TEMPLATE = `주어진 정보를 바탕으로 사용자가 요구하는 카페 하나를 추천해주세요. 아래의 조건을 참고하여 답변을 주세요:
1. 사용자가 요구하는 위치를 정확히 파악하세요. 위치 정보가 주어진 경우 해당 위치를 기준으로 가까운 카페를 추천해주세요. 위치의 중요도가 매우 큽니다. 예: "홍대입구"에서 가까운 카페를 추천해주세요.
2. 위치가 불확실하거나 대략적인 지역만 주어졌을 경우, 그에 맞는 근처 지역을 사용해 주세요. 하지만 위치가 정확하게 주어졌다면, 그 위치를 우선적으로 고려해주세요.
3. 카페의 분위기나 특성을 판단할 때는 'diora_info'와 'hashtags' 정보를 사용하세요. 예를 들어, "친구들과 갈만한 분위기 좋은 카페" 또는 "편안한 분위기의 카페" 같은 요구 사항을 고려하세요.
4. 추천할 카페는 사용자가 요청한 위치와 가까운 순서대로 추천해주세요. 지하철역을 기준으로 가까운 카페를 우선적으로 제시해주세요.
5. 만약 카페 정보가 부족하거나 정확한 답을 알 수 없다면, "모르겠어요"라고 대답해주세요. 다만, 가능한 한 가장 가까운 카페를 찾아서 추천해 주세요.
6. 추천되는 카페 1개를 선택하여 **추천 이유와 추가 설명 없이 카페 정보를 수정하지 말고 raw한 데이터만 그대로** name, address, description, hashtags, features, nearest_station 정보를 JSON 형식으로 출력해주세요.

---------- 
{context}`;

// Chat Model
const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_API_MODEL,
});

// Extract subway-related location using OpenAI API
export async function extractLocationFromQuery(query) {
  const locationPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "이 질문에서 지하철역이나 지역 이름이 있다면 정확히 위치만 출력해주세요. 예: 홍대입구역",
    ],
    ["human", "{question}"],
  ]);

  const locationModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_API_MODEL,
  });

  const locationChain = RunnableSequence.from([
    locationPrompt,
    locationModel,
    new StringOutputParser(),
  ]);

  try {
    return (await locationChain.invoke({ question: query })).trim();
  } catch (error) {
    console.error("Error extracting location:", error);
    console.error("Input query:", query);
    throw error;
  }
}

const messages = [
  SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
  HumanMessagePromptTemplate.fromTemplate("{question}"),
];
const prompt = ChatPromptTemplate.fromMessages(messages);

// Recommendation Chain
export const chain = RunnableSequence.from([
  {
    context: cafe_vectorStoreRetriever.pipe(formatDocumentsAsString),
    question: new RunnablePassthrough(),
  },
  prompt,
  chatModel,
  new StringOutputParser(),
]);

// Geocoding function
export async function getGeocode(name) {
  const api_url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(
    name
  )}`;
  const headers = {
    "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_GEO_CLIENT_ID,
    "X-NCP-APIGW-API-KEY": process.env.NAVER_GEO_CLIENT_SECRET,
  };

  try {
    const response = await axios.get(api_url, { headers });
    const addresses = response.data.addresses;

    if (addresses.length > 0) {
      return addresses[0].roadAddress || null; // Return roadAddress only
    } else {
      return null;
    }
  } catch (error) {
    console.error("Geocoding API error:", error);
    return null;
  }
}

// Local Search function
export async function getLocalSearch(name) {
  const api_url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
    name
  )}&display=10`;
  const headers = {
    "X-Naver-Client-Id": process.env.NAVER_SEARCH_CLIENT_ID,
    "X-Naver-Client-Secret": process.env.NAVER_SEARCH_CLIENT_SECRET,
  };

  try {
    const response = await axios.get(api_url, { headers });
    const items = response.data.items;

    if (items.length > 0) {
      return items[0].roadAddress || null; // Return roadAddress only
    } else {
      return null;
    }
  } catch (error) {
    console.error("Local Search API error:", error);
    return null;
  }
}

// Combined function to get road address
export async function getRoadAddress(name) {
  let roadAddress = await getGeocode(name);
  if (roadAddress) {
    return roadAddress;
  }

  roadAddress = await getLocalSearch(name);

  if (roadAddress) {
    return roadAddress;
  }

  console.log("No road address found using either method.");
  return null;
}

// CSV 파일 읽어오기
function loadSubwayData() {
  return new Promise((resolve, reject) => {
    const subwayData = [];
    fs.createReadStream("./references/seoul_subway_with_addresses.csv")
      .pipe(csvParser())
      .on("data", (row) => {
        // Normalize keys by trimming spaces
        const cleanedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.trim();
          cleanedRow[normalizedKey] = value.trim(); // Trim values as well
        }
        subwayData.push(cleanedRow);
      })
      .on("end", () => resolve(subwayData))
      .on("error", (error) => reject(error));
  });
}

// 지하철역 주소 찾기
export async function findSubwayRoadAddress(query) {
  const subwayData = await loadSubwayData();

  const subwayStation = subwayData.find((row) => {
    return row["name"].includes(query);
  });

  if (subwayStation) {
    return subwayStation || null;
  } else {
    return null;
  }
}
