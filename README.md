# Diora MVP

Diora MVP는 카페 및 서울 지하철 정보를 활용한 AI 기반 추천/검색 서비스의 프로토타입입니다. Node.js(Express)와 React를 기반으로 개발되었습니다.

## 사용 기술 및 프레임워크

- **백엔드**: Node.js, Express, LangChain, OpenAI API, Naver API
- **프론트엔드**: React (Vite 기반)
- **데이터**: CSV 파일 및 벡터스토어

## 프로젝트 구조

```
backend/
  ├── .env
  ├── package.json
  ├── references/
  │   ├── cafe.csv
  │   ├── seoul_subway_with_addresses.csv
  │   ├── cafe_info_vectorstore/
  │   └── subway_info_vectorstore/
  └── src/
      ├── app.js
      ├── routes/
      └── services/
frontend/
  ├── .env
  ├── package.json
  ├── public/
  └── src/
      ├── App.jsx
      ├── components/
      └── ...
```

## 주요 기능

- **카페 및 지하철 정보 벡터스토어**: cafe_info_vectorstore, subway_info_vectorstore를 통해 AI 기반 검색/추천 기능 제공
- **REST API 백엔드**: Node.js 기반 Express 서버
- **React 프론트엔드**: 사용자 인터페이스 제공
- **환경설정**: 각 환경별 `.env` 파일로 설정 관리

## 실행 방법

### 1. 백엔드

```sh
cd backend
npm install
npm start
```

### 2. 프론트엔드

```sh
cd frontend
npm install
npm run dev
```

## 참고

- [backend/references/cafe.csv](backend/references/cafe.csv): 카페 데이터
- [backend/references/seoul_subway_with_addresses.csv](backend/references/seoul_subway_with_addresses.csv): 지하철 데이터
- [backend/src/app.js](backend/src/app.js): 백엔드 진입점
- [frontend/src/App.jsx](frontend/src/App.jsx): 프론트엔드 진입점

---

> 본 프로젝트는 AI 기반 추천/검색 서비스의 MVP로, 실제 서비스 적용 전 실험 및 프로토타입 용도로 제작되었습니다.
