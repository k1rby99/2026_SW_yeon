# 연(緣) 개발 안내

2026 SW 디지털 경진대회 프로젝트입니다. 프론트엔드와 백엔드를 한 저장소에서 관리하는 모노레포 구조입니다.

프론트엔드 디자인과 에이전트 작업 규칙은 [`docs/FRONTEND_STYLE_GUIDE.md`](docs/FRONTEND_STYLE_GUIDE.md)를 참고합니다.
인연 방 중심의 백엔드 API 계약은 [`docs/BACKEND_API_CONTRACT.md`](docs/BACKEND_API_CONTRACT.md)를 참고합니다.

## 디렉터리 구조

```text
.
├── back/                 # FastAPI 백엔드
│   └── app/main.py       # API 진입점
├── front/                # Vite + React 프론트엔드
└── docker-compose.yml    # 전체 개발 환경 실행
```

## Docker로 실행

Docker Desktop을 실행한 뒤 저장소 루트에서 아래 명령을 실행합니다.

```bash
docker compose up --build
```

- 프론트엔드: http://localhost:5173
- 백엔드 API 문서: http://localhost:8000/docs
- 백엔드 상태 확인: http://localhost:8000/api/health

소스 디렉터리가 컨테이너에 마운트되어 프론트엔드와 백엔드 모두 코드 변경 시 자동 반영됩니다. 종료는 `Ctrl+C`, 컨테이너와 볼륨 정리는 `docker compose down -v`를 사용합니다.

## API 목업과 실제 백엔드 전환

**기본값은 실제 백엔드입니다.** 프론트의 `/api/*` 요청은 Vite 개발 서버가 백엔드로 프록시하므로 브라우저에서 별도 호스트를 지정할 필요가 없습니다.
데모 계정은 `demo@yeon.dev` / `yeon1234` 입니다([`back/README.md`](back/README.md) 참고).

백엔드 없이 UI만 보려면 MSW 목업을 켭니다.

```bash
VITE_API_MOCKING=true docker compose up --build
```

목업을 켜면 프론트가 브라우저 안에서 응답을 만들어 내므로 백엔드 상태와 무관하게 화면이 뜹니다. 대신 실제 데이터는 저장되지 않습니다.

## AI 분석 엔진

목표 해석과 추천은 Anthropic API 기반 에이전트 4종이 담당합니다(프로필 분석, 목표 해석, 후보군 형성, 대상 선별).
기본값은 키가 필요 없는 규칙 기반 목업이며, 에이전트를 켜려면:

```bash
ANTHROPIC_API_KEY=sk-ant-... YEON_ANALYSIS_ENGINE=agent docker compose up --build
```

자세한 내용은 [`back/README.md`](back/README.md#분석-에이전트)를 참고합니다.

## 로컬에서 개별 실행

프론트엔드:

```bash
cd front
npm ci
npm run dev
```

백엔드:

```bash
cd back
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 검사 명령

```bash
cd front
npm run build
npm test -- --run
npm run lint
```

백엔드 기능을 추가할 때는 `/api` 아래에 라우터를 구성하고, 프론트 UI 개발 중에는 필요한 요청을 `front/src/mocks/handlers.ts`에도 동일하게 반영합니다.
