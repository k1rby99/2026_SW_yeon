# 연(緣) 백엔드

FastAPI + SQLAlchemy(SQLite) 기반이며, [`docs/BACKEND_API_CONTRACT.md`](../docs/BACKEND_API_CONTRACT.md)의 인연 방 계약을 구현한다.
응답은 프론트 `types/domain.ts`에 맞춰 camelCase로 직렬화하고, 오류는 `{ "code": ..., "message": ... }` 형태를 지킨다.

## 실행

```bash
cd back
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- 상태 확인: http://localhost:8000/api/health

첫 실행 시 `yeon.db`가 만들어지고 데모 데이터가 들어간다(`YEON_SEED_DEMO_DATA=false`로 끌 수 있다).
데이터를 초기화하려면 `yeon.db`를 지우고 다시 실행한다.

## 데모 계정

MSW 목업과 같은 인물·인연 방이 들어 있다. 비밀번호는 모두 `yeon1234`.

| 이메일 | 이름 | 비고 |
| --- | --- | --- |
| demo@yeon.dev | 나 | 시작점. `room-my-project`의 방장 |
| seoyun@yeon.dev | 김서윤 | `room-ai-hackathon` 방장 |
| jihu@yeon.dev | 박지후 | `room-public-data` 방장 |
| harin@yeon.dev | 이하린 | `room-coffee-chat` 방장 |
| doyun@yeon.dev | 정도윤 | `room-ended-study` 방장 |

## 구조

```text
app/
├── main.py            # 앱 조립, 테이블 생성, 데모 시드
├── core/              # 설정, DB 세션, JWT, 오류 형식, 인증 의존성
├── models/            # SQLAlchemy 모델 (User/Profile, Room·Member·Application·Invitation·Message, Goal)
├── schemas/           # 요청·응답 (camelCase 직렬화)
├── api/               # 라우터 (auth, profile, rooms, goals)
├── agents/            # Anthropic API 기반 분석 에이전트 4종
│   ├── base.py            # 공통 실행기 (모델·thinking·구조화 출력·오류 처리)
│   ├── profile_agent.py   # 1. 프로필 분석
│   ├── goal_agent.py      # 2. 인연 목표 해석
│   ├── shortlist_agent.py # 3. 추천 후보군 형성
│   ├── selection_agent.py # 4. 추천 대상 선별
│   └── pipeline.py        # 넷을 묶어 AnalysisAgent 프로토콜을 구현
├── services/
│   ├── analysis.py    # 분석 계층 인터페이스 + 규칙 기반 목업
│   └── rooms.py       # 방 응답 조립 (요청자 기준 필드 계산)
└── seed.py            # 데모 데이터
```

## 분석 에이전트

추천과 분석은 전부 `services/analysis.py`의 `AnalysisAgent` 프로토콜 뒤에 있다. 구현은 둘이다.

| 엔진 | 구현 | 특징 |
| --- | --- | --- |
| `mock` (기본) | `MockAnalysisAgent` | 규칙 기반. 키가 필요 없고 결정적이라 테스트·데모에 안정적 |
| `agent` | `AgentAnalysis` (`app/agents/`) | Anthropic API 기반 4개 에이전트 |

### 4개 에이전트

| # | 에이전트 | 언제 도는가 | effort |
| --- | --- | --- | --- |
| 1 | 프로필 분석 | `POST`/`PATCH /api/profile` | medium |
| 2 | 인연 목표 해석 | `POST /api/goals/analyze`, `POST /api/goals` | medium |
| 3 | 추천 후보군 형성 | 추천/초대 후보 조회 시 (1단계) | low |
| 4 | 추천 대상 선별 | 추천/초대 후보 조회 시 (2단계) | high |

3번과 4번은 한 쌍이다. **넓게 추린 뒤(3) 좁게 고른다(4).** 전체 목록을 바로 선별에 넣지 않는
이유는 목록이 길수록 토큰이 선형으로 늘고, 관련 없는 항목이 섞이면 선별 품질이 떨어지기
때문이다. 두 단계 모두 **목록 전체를 한 번에** 받는다. 항목마다 호출하면 방 목록 한 번에
수십 번을 부르게 된다.

선별 결과는 요청 하나 동안 캐시되고, `matchScore`와 추천 이유로 응답에 실린다.

### 켜기

```bash
export YEON_ANALYSIS_ENGINE=agent
export YEON_ANTHROPIC_API_KEY=sk-ant-...   # 비우면 SDK가 ANTHROPIC_API_KEY를 찾는다
uvicorn app.main:app --reload --port 8000
```

실제 API를 태워 4개 에이전트를 눈으로 확인하려면:

```bash
.venv/bin/python -m scripts.agent_smoke
```

### 캐시 — 목록 화면이 10초 걸리지 않게

에이전트 호출은 느리다. 목록 하나에 후보군 형성 + 선별 두 번을 태우면 **10초 안팎**이 걸린다.
같은 화면을 열 때마다 이 값을 다시 사는 것은 시간도 돈도 낭비다.

그래서 추천 결과를 `score_cache` 표에 저장한다. 무효화는 TTL이 아니라 **입력 변화**로 한다.
프로필·방 목록·모델이 그대로면 지문(fingerprint)이 같고, 같으면 저장된 결과를 그대로 쓴다.

| | 응답 시간 |
| --- | --- |
| 첫 요청 (에이전트 호출) | 9~12초 |
| 이후 요청 (캐시 적중) | **4밀리초** |
| 프로필 수정 직후 | 다시 9초 (자동 재계산) |

규칙 기반으로 떨어진 결과는 캐시하지 않는다. 캐시해 버리면 키가 돌아와도 계속 그 값을 쓰게 된다.

### 실패했을 때

에이전트 호출이 실패하면(키 없음, 레이트 리밋, 모델 거절) **규칙 기반 목업으로 떨어지고
경고 로그를 남긴다.** 데모 도중 화면이 비지 않게 하려는 것이다. 실패를 숨기고 싶지 않으면
`YEON_ANALYSIS_FALLBACK=false`로 두면 오류가 그대로 올라온다.

서버 로그에 에이전트별 토큰 사용량과 캐시 적중이 남는다.

```text
INFO  app.agents.base     | agent=selection effort=high input=1755 output=459
INFO  app.agents.pipeline | 추천 캐시 적중 kind=room owner=user-me
```

### 테스트

테스트는 실제 Claude를 부르지 않는다. `tests/conftest.py`가 엔진을 `mock`으로 고정한다
(`.env`에 `agent`가 들어 있어도). 실제 API를 태우는 검증은 `scripts/agent_smoke.py`가 담당한다.

## 검사

```bash
cd back
.venv/bin/python -m pytest tests -q
```

가입 → 온보딩 → 방 생성 → 신청 → 승인 → 채팅 흐름과 정원·권한·중복 신청 규칙을 검증한다.

## 프론트 연동

프론트는 **기본값이 실제 백엔드**다. Vite가 `/api/*`를 백엔드로 프록시한다.
백엔드 없이 UI만 보려면 `VITE_API_MOCKING=true`로 MSW 목업을 켠다.

프론트가 호출하는 엔드포인트는 전부 구현돼 있다.

| 영역 | 엔드포인트 |
| --- | --- |
| 인증 | `POST /api/auth/{signup,login,refresh}` |
| 프로필 | `GET`/`POST`/`PATCH /api/profile` |
| 인연 방 | `GET /api/rooms/recommended`, `GET /api/rooms`, `GET`/`PATCH /api/rooms/{id}`, `POST /api/rooms` |
| 신청 | `POST`/`GET .../applications`, `PATCH .../applications/{id}` |
| 초대 | `GET .../candidates`, `POST .../invitations` (보내기) / `GET /api/invitations`, `PATCH /api/invitations/{id}` (받은 초대 수락·거절) |
| 채팅·멤버 | `.../messages`, `.../members` |
| 목표 | `POST /api/goals/analyze`, `GET`/`POST /api/goals` |
| 공모전 | `GET /api/opportunities`, `GET /api/opportunities/{id}` |
| 1:1 매칭 | `GET /api/recommendations(/{id})`, `POST .../action`, `GET /api/matches`, `PATCH /api/matches/{id}`, `POST /api/feedback` |

1:1 매칭 계열은 인연 방 모델 이전의 기능이다. 추천은 저장하지 않고 요청 시점에 계산하며,
추천 id는 `rec-{상대 user_id}`로 결정된다. 저장하는 것은 수락/거절, 그 결과 맺어진 매칭,
피드백뿐이다. 점수와 이유는 인연 방 추천과 **같은 두 에이전트**(후보군 형성 → 선별)를 사람에
적용해 얻는다.
