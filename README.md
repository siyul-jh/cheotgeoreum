# 첫걸음

버킷리스트를 적고, 비어 있는 칸은 AI 초안으로 채우는 1인용 로컬 웹앱.

## 실행

```sh
yarn install
cp .env.example .env   # LLM_API_KEY 입력
yarn dev               # 터미널에 나온 주소로 접속
```

검사: `yarn typecheck && yarn lint && yarn test && yarn build`

## LLM 설정

OpenAI 호환 `/v1` 엔드포인트면 무엇이든 된다. 바꿀 때는 `.env`의 세 값만 고친다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `LLM_BASE_URL` | `https://integrate.api.nvidia.com/v1` | 끝에 `/v1`까지 넣는다 |
| `LLM_API_KEY` | (없음) | NVIDIA NIM 키는 https://build.nvidia.com 에서 발급. 로컬 LLM이면 비워 둔다 |
| `LLM_MODEL` | `z-ai/glm-5.3-flash` | 로컬 LLM이면 설치한 모델 이름 |

로컬 LLM 예시: Ollama `http://localhost:11434/v1`, LM Studio `http://localhost:1234/v1`.

키는 서버 함수에서만 읽고 브라우저 번들에는 들어가지 않는다. `.env`는 커밋하지 않는다.

LLM이 응답하지 않아도 직접 입력과 저장은 그대로 된다.

## 알아 둘 점

- **데이터는 브라우저 localStorage에만 저장되고 백업이 없다.** 사이트 데이터를 지우거나 시크릿 창을 닫으면 모두 사라진다.
- **기기·브라우저마다 데이터가 따로다.** 휴대폰으로 접속하면 PC와 다른 빈 목록이 보인다.
- **`yarn dev --host`로 LAN에 열면** 같은 네트워크의 누구나 서버 함수를 호출해 내 LLM 키의 한도를 쓸 수 있다. 믿을 수 있는 네트워크에서만 잠깐 연다.
