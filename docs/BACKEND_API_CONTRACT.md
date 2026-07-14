# 연(緣) 백엔드 API 계약 초안

이 문서는 목업 프론트엔드와 추후 백엔드 구현 사이의 계약이다. 현재 MSW가 이 계약을 모사하며, 백엔드는 같은 URL과 응답 형태를 제공하는 것을 목표로 한다.

## 1. 핵심 모델

### 인연 방 `ConnectionRoom`

인연은 사람 한 명과의 직접 매칭이 아니라 공모전, 해커톤, 프로젝트, 스터디, 커피챗 등을 목적으로 만들어진 방이다.

```ts
type RoomType = 'competition' | 'hackathon' | 'study' | 'project' | 'coffee_chat' | 'networking';
type RoomStatus = 'recruiting' | 'active' | 'ended';
type MembershipRole = 'owner' | 'member' | null;
type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface ConnectionRoom {
  id: string;
  title: string;
  type: RoomType;
  summary: string;
  imageUrl?: string;
  tags: string[];
  requiredRoles: string[];
  status: RoomStatus;
  memberCount: number;
  capacity: number;
  matchScore?: number;
  deadline?: string;
  owner: { id: string; name: string };
  membershipRole: MembershipRole;
  applicationStatus: ApplicationStatus;
  visibility?: 'public' | 'private';
  applicationMode?: 'approval' | 'instant';
  meetingStyle?: 'online' | 'offline' | 'hybrid';
  location?: string;
  notice?: string;
  createdAt: string;
}
```

규칙:

- `recruiting`: 참여 신청과 초대 가능
- `active`: 모집을 마감하고 진행 중
- `ended`: 종료되어 읽기 전용
- 방장은 항상 `membershipRole: owner`
- 일반 참여자는 `member`
- 비참여자는 `null`
- 같은 사용자는 한 방에 하나의 활성 참여 신청만 가질 수 있다.

## 2. 목표 분석

### `POST /api/goals/analyze`

요청:

```json
{
  "text": "AI 해커톤에 참가할 백엔드 개발자와 디자이너를 찾고 싶어요",
  "keywords": ["해커톤", "AI"]
}
```

응답 `200`:

```json
{
  "id": "analysis-1",
  "normalizedGoal": "AI 해커톤 팀 구성",
  "keywords": ["AI", "해커톤", "백엔드", "디자인"],
  "suggestedRoomType": "hackathon",
  "suggestedRoles": ["백엔드 개발", "프로덕트 디자인"],
  "recommendedRoomIds": ["room-1", "room-2"]
}
```

오류:

- `400`: 문장과 키워드가 모두 비어 있음
- `422`: 분석할 수 없는 입력
- `503`: AI 분석 서비스 일시 장애

분석은 비동기 작업으로 전환할 수 있다. 이 경우 `202 + jobId`를 반환하고 `GET /api/goal-analyses/{jobId}`를 폴링한다.

## 3. 인연 탐색과 생성

### `GET /api/rooms/recommended`

프로필과 최근 목표를 기준으로 추천 방을 반환한다.

쿼리:

- `cursor`: 다음 페이지 커서
- `size`: 기본 10, 최대 30
- `goalAnalysisId`: 특정 목표 분석 결과에 한정

응답:

```json
{ "items": [], "nextCursor": null }
```

### `GET /api/rooms/{roomId}`

인연 프로필과 현재 사용자의 역할 및 신청 상태를 반환한다.

### `POST /api/rooms`

방을 만든 사용자는 자동으로 방장이 된다.

```json
{
  "title": "AI 해커톤 같이 나갈 팀",
  "type": "hackathon",
  "summary": "주말 집중 개발을 목표로 합니다.",
  "tags": ["AI", "해커톤"],
  "requiredRoles": ["백엔드", "디자인"],
  "capacity": 5,
  "deadline": "2026-08-30",
  "visibility": "public",
  "applicationMode": "approval",
  "meetingStyle": "hybrid",
  "location": "서울 성수동 또는 Discord",
  "notice": "매주 토요일 오후에 정기 회의를 진행합니다."
}
```

### `PATCH /api/rooms/{roomId}`

방장만 수정 가능하다. 이름, 소개, 모집 역할, 정원, 공개 범위, 신청 방식, 상태를 변경한다.

- `visibility`: `public`이면 검색·추천에 노출, `private`이면 초대 링크로만 접근
- `applicationMode`: `approval`이면 방장 승인 필요, `instant`이면 정원 확인 후 바로 참여
- `meetingStyle`: `online`, `offline`, `hybrid`
- 수정 권한이 없으면 `403 FORBIDDEN`
- 현재 인원보다 작은 정원으로 변경하면 `409 CAPACITY_UNDER_MEMBER_COUNT`

## 4. 참여 신청과 초대

### `POST /api/rooms/{roomId}/applications`

```json
{ "message": "React 개발 경험으로 기여하고 싶습니다." }
```

### `GET /api/rooms/{roomId}/applications`

방장만 조회한다. `pending`, `approved`, `rejected` 상태를 포함한다.

### `PATCH /api/rooms/{roomId}/applications/{applicationId}`

```json
{ "action": "approve" }
```

`action`은 `approve` 또는 `reject`다. 승인 시 정원을 트랜잭션 안에서 다시 검사한다.

### `POST /api/rooms/{roomId}/invitations`

```json
{ "userId": "user-12", "message": "함께하고 싶어 초대합니다." }
```

중복 초대와 이미 참여 중인 사용자는 `409`를 반환한다.

### `GET /api/rooms/{roomId}/candidates`

방의 목표, 필요 역할과 현재 멤버 구성을 기준으로 초대 후보를 반환한다. 방장만 조회할 수 있다.

```json
[
  {
    "id": "user-12",
    "name": "최윤아",
    "role": "백엔드 개발자",
    "bio": "서비스 구조를 단단하게 만드는 개발자입니다.",
    "skillTags": ["FastAPI", "PostgreSQL", "AWS"],
    "interests": ["AI", "사이드 프로젝트"],
    "matchScore": 96,
    "reason": "필요 역할과 주말 협업 선호도가 일치합니다.",
    "invitationStatus": "none"
  }
]
```

`invitationStatus`는 `none`, `pending`, `accepted`, `declined`다. 추천 점수만으로 민감한 성격 정보나 비공개 프로필 필드를 노출하면 안 된다.

### 참여 신청 응답 모델

`GET /api/rooms/{roomId}/applications`는 아래 배열을 반환한다.

```json
[
  {
    "id": "application-1",
    "applicant": { "id": "user-12", "name": "최윤아", "role": "백엔드 개발자" },
    "message": "API 설계와 배포를 맡고 싶어요.",
    "status": "pending",
    "createdAt": "2026-07-13T10:30:00Z"
  }
]
```

승인 시 같은 신청의 재처리를 막고, 트랜잭션 안에서 `memberCount < capacity`를 확인한 뒤 멤버와 인원수를 함께 갱신한다.

## 5. 내 인연과 채팅

### `GET /api/rooms?scope=mine&status=active`

내가 방장이거나 참여자인 방을 조회한다. `status`는 `recruiting`, `active`, `ended`를 지원한다.

### `GET /api/rooms/{roomId}/members`

해당 인연의 참여자만 조회할 수 있다. 목록 화면에 필요한 공개 요약 정보만 반환한다.

```json
[
  {
    "id": "user-2",
    "name": "박지후",
    "role": "프로덕트 매니저",
    "bio": "문제를 구조화하고 팀이 같은 목표를 보도록 돕습니다.",
    "skillTags": ["서비스 기획", "사용자 인터뷰", "데이터 분석"],
    "isOwner": false,
    "joinedAt": "2026-06-05T09:00:00Z"
  }
]
```

### `GET /api/rooms/{roomId}/members/{memberId}`

참여자 프로필 상세를 반환한다. `interests`, `collabStyle`, `projectHistory`, `socialLinks`가 추가되며, 프로필 공개 범위에 따라 허용된 필드만 포함한다.

- 요청자가 해당 인연의 참여자가 아니면 `403 FORBIDDEN`
- 대상 사용자가 해당 인연의 참여자가 아니면 `404 MEMBER_NOT_FOUND`
- `isOwner`는 사용자 전역 속성이 아니라 해당 인연의 역할을 기준으로 계산
- 이메일, 전화번호와 비공개 소셜 링크는 반환하지 않음
- 종료된 인연도 참여 이력이 있는 사용자에게는 읽기 전용으로 제공

### `GET /api/rooms/{roomId}/messages`

참여자만 접근할 수 있다. 커서 페이지네이션을 사용한다.

```json
{
  "items": [
    {
      "id": "message-1",
      "sender": { "id": "user-1", "name": "김서윤" },
      "content": "이번 주 토요일에 킥오프 어떠세요?",
      "createdAt": "2026-07-14T10:00:00Z"
    }
  ],
  "nextCursor": null
}
```

### `POST /api/rooms/{roomId}/messages`

```json
{ "content": "좋아요!" }
```

실시간 채팅은 이후 WebSocket `/ws/rooms/{roomId}`로 확장한다. REST 메시지 생성 계약은 유지한다.

## 6. 프로필 분석 입력

`GET/PATCH /api/profile`은 관심사, 강점별 수준, 협업 성향, 소개와 외부 링크를 제공한다. 추천 서버는 공개 범위 내 데이터만 사용한다.

권장 추가 필드:

```ts
strengths: Array<{ key: string; label: string; level: 1 | 2 | 3 }>;
personality: { collaborationStyle: string; communicationStyle?: string };
socialLinks: { blog?: string; instagram?: string; github?: string };
```

## 7. 공통 규칙

- 인증: `Authorization: Bearer <accessToken>`
- 날짜: UTC ISO 8601
- ID: 문자열 UUID 권장
- 목록: 커서 페이지네이션 권장
- 오류: `{ "code": "ROOM_FULL", "message": "인연 정원이 가득 찼습니다." }`
- 사용자가 볼 수 없는 비공개 프로필 정보는 응답에서 제거한다.
- 참여 승인, 정원 변경, 상태 변경은 동시성 검사를 수행한다.
- 프론트 MSW 핸들러와 백엔드 테스트 픽스처는 동일한 예시 필드를 유지한다.

## 8. 공고와 공모전

### `GET /api/opportunities`

공고와 공모전 목록을 반환한다.

쿼리:

- `type`: `contest` 또는 `announcement`
- `featured`: 홈 추천 노출 여부
- `cursor`, `size`: 운영 데이터에서는 커서 페이지네이션 적용

응답:

```json
{
  "items": [
    {
      "id": "op-ai-innovation",
      "type": "contest",
      "status": "open",
      "category": "AI · 소프트웨어",
      "title": "2026 AI 서비스 아이디어 경진대회",
      "organizer": "한국소프트웨어진흥원",
      "summary": "생성형 AI 기반 서비스 아이디어를 모집합니다.",
      "imageUrl": "https://cdn.example.com/poster.png",
      "tags": ["AI", "서비스 기획", "프로토타입"],
      "deadline": "2026-07-26",
      "period": "2026.07.01 - 2026.07.26",
      "eligibility": "대학생 및 만 34세 이하 청년, 2~5인 팀",
      "benefits": ["대상 500만원", "전문가 멘토링"],
      "officialUrl": "https://example.com/notice/1",
      "featured": true
    }
  ]
}
```

### `GET /api/opportunities/{opportunityId}`

공고 상세를 반환한다. 삭제되거나 비공개 처리된 공고는 `404`를 반환한다.

규칙:

- `status`: `open`, `upcoming`, `closed`
- 날짜 계산은 서버의 `deadline` 원본 값을 기준으로 하고, `D-n` 표시는 프론트에서 계산
- `officialUrl`은 허용된 `https` URL만 저장
- 홈의 `featured=true` 결과는 최대 3건을 우선순위 순으로 반환
- 외부 수집 데이터라면 출처 URL, 마지막 동기화 시각과 중복 방지 키를 별도 저장
