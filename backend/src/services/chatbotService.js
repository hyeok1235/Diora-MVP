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

const SYSTEM_TEMPLATE = `SYSTEM_TEMPLATE:
1. 사용자의 query를 분석하여 요청한 위치와 조건을 파악합니다.
   - 위치: query의 "위치"와 "지하철역명", "지하철역의 주소"를 참고하여 요청 위치를 정확히 매칭합니다.
   - 조건: query에서 요구하는 분위기나 특징을 도출하고, retrieve된 정보에서 카페의 diora_info, hashtags, point_1, point_2, point_3을 바탕으로 조건에 맞는 카페를 찾아냅니다.

2. retrieve된 데이터에는 다음과 같은 column명이 포함됩니다:
   - name: 카페 이름
   - road_address: 카페 도로명 주소
   - diora_info: 카페 설명
   - hashtags: 카페 해시태그
   - point_1, point_2, point_3: 카페 특징
   - subway: 카페 근처 지하철역

3. retrieve된 정보의 subway(지하철역)와 query의 "지하철역명"을 비교하여 가까운 역을 기준으로 카페를 추천합니다.
   - 동일한 지하철역이 있을 경우, 이를 우선적으로 추천합니다.
   - 지하철역이 다를 경우, 위치 정보(road_address)로 가장 가까운 카페를 선택합니다.
   - **조건에 부합하는 카페가 없을 경우, retrieve된 데이터 중 하나를 무작위로 반환합니다.**

4. 추천되는 카페의 정보는 수정 없이 raw한 데이터를 JSON 형식으로 출력합니다. 

5. 만약 retrieve된 정보 중에서 요청 조건과 부합하는 카페를 찾을 수 없을 경우 주어진 카페들 중 하나를 랜덤하게 추천합니다.

6. 주의사항:
   - 카페 정보는 수정하지 않고 retrieve된 데이터를 그대로 사용합니다.
   - 추천 이유나 추가 설명은 출력하지 않습니다.

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
      `이 질문에서 지하철역, 지역 이름, 동네 이름 등 위치와 관련된 정보를 정확히 식별하여 하나만 출력해주세요. 아래 기준을 따르세요:

      1. 만약 질문에 **지하철역 이름**이 포함되어 있다면, 역 이름만 출력하세요. 예: '안암동' -> '안암역'
      2. 질문에 **지하철역 이름**이 명확히 없고, 지역명(동, 구 등)만 있다면 해당 지역명을 출력하세요. 예: '안암동 근처 카페' -> '안암동'
      3. 두 가지 경우 모두 해당하지 않거나, 위치가 명확하지 않다면 '없음'을 출력하세요.
      4. 항상 사람이 이해할 수 있는 한국의 위치명을 정확히 추출해주세요.

      예시:
      - '홍대 근처 맛집 추천' -> '홍대입구역'
      - '강남역에서 가까운 곳 추천해줘' -> '강남역'
      - '연남동의 핫플' -> '연남동'
      - '서울에서 가장 예쁜 카페' -> '서울'
      - '다른 나라 위치' 또는 추출이 어려운 경우 -> '없음'

      `,
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

// 지하철역 주소 찾기
export async function findSubwayRoadAddress(query) {
  // 1. 벡터 스토어 경로 및 초기화
  const subwayVectorStorePath = "./references/subway_info_vectorstore";
  const subwayVectorStore = await HNSWLib.load(
    subwayVectorStorePath,
    new OpenAIEmbeddings() // OpenAI 임베딩 사용
  );

  // 2. 검색할 결과 개수 설정
  const k = 1; // 가장 유사한 1개만 반환
  const subwayVectorStoreRetriever = subwayVectorStore.asRetriever({ k });

  // 3. 쿼리를 통해 검색 수행
  const results = await subwayVectorStoreRetriever.getRelevantDocuments(query);

  // 4. 결과 처리
  if (results.length > 0) {
    return results[0]; // 가장 유사한 지하철역 정보 반환
  } else {
    return null; // 검색 결과가 없으면 null 반환
  }
}
