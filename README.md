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

현재 Compose 기본값은 기존 UI 개발 흐름을 유지하기 위해 MSW 목업을 사용합니다. 실제 백엔드 API를 연결할 때 `docker-compose.yml`의 값을 아래처럼 변경합니다.

```yaml
environment:
  VITE_API_MOCKING: "false"
  VITE_API_TARGET: http://backend:8000
```

프론트의 `/api/*` 요청은 Vite 개발 서버가 백엔드로 프록시하므로 브라우저에서 별도 호스트를 지정할 필요가 없습니다.

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
