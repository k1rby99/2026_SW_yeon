import { http, HttpResponse } from 'msw';
import type {
  Profile,
  Goal,
  Recommendation,
  MatchRelation,
  ConnectionRoom,
  GoalAnalysis,
  RoomApplication,
  RoomCandidate,
  RoomUpsertPayload,
  RoomMessage,
} from '../types/domain';

// front_request.md §7 API 연동 명세 전체를 스텁한다.
// GET /api/goals/{id} 는 Architecture.md에 없는 신규 제안 엔드포인트(백엔드 협의 필요) — dev_plan_front.md §7.4

let profile: Profile | null = null;

const goals = new Map<string, Goal>();
let goalSeq = 0;

const recommendationsPool: Recommendation[] = Array.from({ length: 12 }).map((_, i) => ({
  id: `rec-${i + 1}`,
  candidateId: `user-${i + 1}`,
  candidateProfileSummary: {
    interests: ['UX 리서치', '프론트엔드', '데이터 분석'].slice(0, (i % 3) + 1),
    skillTags: ['React', 'Figma', 'Python', 'FastAPI'].slice(0, (i % 4) + 1),
  },
  complementScore: 96 - i * 4,
  gapTags: ['백엔드 아키텍처', 'UI 디자인', '데이터 시각화'].slice(0, (i % 3) + 1),
  reasonText: `이 후보는 회원님이 보유하지 못한 '${['백엔드 아키텍처', 'UI 디자인', '데이터 시각화'][i % 3]}' 역량을 보유하고 있으며, 목표 방향성이 87% 일치합니다. 과거 유사 매칭에서 높은 협업 만족도를 기록했습니다.`,
  createdAt: new Date(Date.now() - i * 3600_000).toISOString(),
}));

const actioned = new Set<string>();

const matches: MatchRelation[] = [
  {
    id: 'match-1',
    counterpartId: 'user-1',
    counterpartSummary: { interests: ['UX 리서치'], skillTags: ['Figma'] },
    status: 'active',
    startedAt: '2026-06-02T00:00:00.000Z',
    endedAt: null,
  },
];

const rooms: ConnectionRoom[] = [
  {
    id: 'room-ai-hackathon', title: 'AI 해커톤, 주말에 몰입할 팀', type: 'hackathon',
    summary: '아이디어부터 프로토타입까지 함께 완성할 개발자와 디자이너를 찾습니다.',
    imageUrl: '/contests/ai-innovation.png', tags: ['AI', '해커톤', '프로토타입'],
    requiredRoles: ['백엔드', '프로덕트 디자인'], status: 'recruiting', memberCount: 3, capacity: 5,
    matchScore: 94, deadline: '2026-08-12', owner: { id: 'user-1', name: '김서윤' },
    membershipRole: null, applicationStatus: 'none', createdAt: '2026-07-10T09:00:00Z',
  },
  {
    id: 'room-public-data', title: '공공데이터로 지역 문제 해결하기', type: 'competition',
    summary: '데이터 분석과 서비스 기획을 결합해 공모전 출품작을 만들어요.',
    imageUrl: '/contests/public-data.png', tags: ['공공데이터', '기획', '데이터'],
    requiredRoles: ['프론트엔드', '데이터 분석'], status: 'recruiting', memberCount: 2, capacity: 4,
    matchScore: 88, deadline: '2026-08-21', owner: { id: 'user-2', name: '박지후' },
    membershipRole: null, applicationStatus: 'none', createdAt: '2026-07-09T09:00:00Z',
  },
  {
    id: 'room-coffee-chat', title: '주니어 PM 커피챗 모임', type: 'coffee_chat',
    summary: '격주로 만나 제품 고민과 커리어 경험을 편하게 나눕니다.',
    tags: ['커피챗', 'PM', '커리어'], requiredRoles: [], status: 'active', memberCount: 5, capacity: 6,
    matchScore: 82, owner: { id: 'user-3', name: '이하린' }, membershipRole: 'member',
    applicationStatus: 'approved', createdAt: '2026-06-20T09:00:00Z',
  },
  {
    id: 'room-my-project', title: '사이드 프로젝트: 동네 취향 지도', type: 'project',
    summary: '로컬 공간을 취향으로 발견하는 모바일 서비스를 만들고 있습니다.',
    imageUrl: '/contests/startup-design.png', tags: ['사이드프로젝트', '모바일', '로컬'],
    requiredRoles: ['React 개발자'], status: 'active', memberCount: 4, capacity: 5,
    owner: { id: 'user-me', name: '나' }, membershipRole: 'owner', applicationStatus: 'approved',
    createdAt: '2026-06-02T09:00:00Z',
  },
  {
    id: 'room-ended-study', title: '데이터 시각화 6주 스터디', type: 'study',
    summary: '매주 결과물을 공유하며 완주한 데이터 시각화 스터디입니다.',
    tags: ['스터디', '데이터'], requiredRoles: [], status: 'ended', memberCount: 6, capacity: 6,
    owner: { id: 'user-4', name: '정도윤' }, membershipRole: 'member', applicationStatus: 'approved',
    createdAt: '2026-04-01T09:00:00Z',
  },
];

const candidatePool: RoomCandidate[] = [
  {
    id: 'candidate-1', name: '최윤아', role: '백엔드 개발자',
    bio: '서비스 구조를 단단하게 만들고 빠르게 실험하는 개발자입니다.',
    skillTags: ['FastAPI', 'PostgreSQL', 'AWS'], interests: ['AI', '사이드 프로젝트'],
    matchScore: 96, reason: '필요 역할인 백엔드 역량이 강하고 주말 협업 선호도가 일치해요.', invitationStatus: 'none',
  },
  {
    id: 'candidate-2', name: '윤도현', role: '프로덕트 디자이너',
    bio: '사용자 문제를 화면과 프로토타입으로 구체화합니다.',
    skillTags: ['Figma', 'UX 리서치', '프로토타이핑'], interests: ['로컬', '커뮤니티'],
    matchScore: 91, reason: '프로덕트 디자인 공백을 보완하고 관심 분야가 방의 목표와 가까워요.', invitationStatus: 'none',
  },
  {
    id: 'candidate-3', name: '한지민', role: '데이터 분석가',
    bio: '데이터로 가설을 검증하고 설득력 있는 스토리를 만듭니다.',
    skillTags: ['Python', 'SQL', 'Tableau'], interests: ['공공데이터', 'AI'],
    matchScore: 87, reason: '데이터 기반 의사결정 역량이 현재 팀 구성과 상호보완적이에요.', invitationStatus: 'none',
  },
  {
    id: 'candidate-4', name: '서민재', role: '프론트엔드 개발자',
    bio: '접근성과 인터랙션을 중요하게 생각하는 프론트엔드 개발자입니다.',
    skillTags: ['React', 'TypeScript', 'React Native'], interests: ['모바일', '해커톤'],
    matchScore: 82, reason: '모바일 구현 경험이 풍부하고 단기 집중 협업 경험이 있어요.', invitationStatus: 'pending',
  },
];

const roomApplications = new Map<string, RoomApplication[]>([
  ['room-my-project', [
    {
      id: 'application-1', applicant: { ...candidatePool[0], invitationStatus: 'none' },
      message: 'FastAPI로 두 번의 사이드 프로젝트를 운영했습니다. API 설계와 배포를 맡고 싶어요.',
      status: 'pending', createdAt: '2026-07-13T10:30:00Z',
    },
    {
      id: 'application-2', applicant: { ...candidatePool[1], invitationStatus: 'none' },
      message: '로컬 서비스 UX 리서치 경험을 살려 함께하고 싶습니다.',
      status: 'pending', createdAt: '2026-07-12T15:20:00Z',
    },
  ]],
]);

const roomMessages = new Map<string, RoomMessage[]>([
  ['room-my-project', [
    { id: 'message-1', sender: { id: 'user-2', name: '박지후' }, content: '이번 주에는 지도 탐색 화면 와이어프레임을 먼저 맞춰보면 좋겠어요.', createdAt: '2026-07-14T08:20:00Z' },
    { id: 'message-2', sender: { id: 'user-me', name: '나' }, content: '좋아요. API 응답 구조도 같이 정리해서 공유할게요.', createdAt: '2026-07-14T08:28:00Z' },
    { id: 'message-3', sender: { id: 'user-3', name: '이하린' }, content: '저는 사용자 인터뷰 질문 초안을 오늘 저녁까지 올리겠습니다.', createdAt: '2026-07-14T08:35:00Z' },
  ]],
  ['room-coffee-chat', [
    { id: 'message-4', sender: { id: 'user-3', name: '이하린' }, content: '다음 커피챗은 목요일 저녁 8시 어떠세요?', createdAt: '2026-07-13T12:00:00Z' },
  ]],
]);

export const handlers = [
  http.post('/api/auth/login', async () => {
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      isNewUser: !profile,
    });
  }),

  http.post('/api/auth/signup', async () => {
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      isNewUser: true,
    });
  }),

  http.post('/api/auth/refresh', async () => {
    return HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });
  }),

  http.get('/api/profile', () => {
    if (!profile) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(profile);
  }),

  http.post('/api/rooms', async ({ request }) => {
    const body = (await request.json()) as RoomUpsertPayload;
    const room: ConnectionRoom = {
      ...body,
      id: `room-${Date.now()}`,
      status: 'recruiting',
      memberCount: 1,
      owner: { id: 'user-me', name: '나' },
      membershipRole: 'owner',
      applicationStatus: 'approved',
      createdAt: new Date().toISOString(),
    };
    rooms.unshift(room);
    return HttpResponse.json(room, { status: 201 });
  }),

  http.post('/api/profile', async ({ request }) => {
    const body = (await request.json()) as Partial<Profile>;
    profile = {
      id: 'profile-1',
      userId: 'user-me',
      interests: body.interests ?? [],
      skillTags: body.skillTags ?? [],
      collabStyle: body.collabStyle ?? '',
      projectHistory: body.projectHistory ?? [],
      visibilityScope: body.visibilityScope ?? 'public',
      onboardingCompleted: true,
      bio: body.bio,
      socialLinks: body.socialLinks,
    };
    return HttpResponse.json(profile);
  }),

  http.get('/api/rooms/recommended', () => {
    return HttpResponse.json({
      items: rooms.filter((room) => room.status === 'recruiting' && !room.membershipRole),
      nextCursor: null,
    });
  }),

  http.get('/api/rooms', ({ request }) => {
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope');
    const status = url.searchParams.get('status');
    const filtered = rooms.filter((room) =>
      (!status || room.status === status) && (scope !== 'mine' || room.membershipRole !== null),
    );
    return HttpResponse.json(filtered);
  }),

  http.get('/api/rooms/:id', ({ params }) => {
    const room = rooms.find((item) => item.id === params.id);
    return room ? HttpResponse.json(room) : new HttpResponse(null, { status: 404 });
  }),

  http.patch('/api/rooms/:id', async ({ params, request }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    if (room.membershipRole !== 'owner') {
      return HttpResponse.json({ code: 'FORBIDDEN', message: '방장만 인연을 수정할 수 있어요.' }, { status: 403 });
    }
    Object.assign(room, (await request.json()) as Partial<ConnectionRoom>);
    return HttpResponse.json(room);
  }),

  http.get('/api/rooms/:id/candidates', ({ params }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(candidatePool);
  }),

  http.post('/api/rooms/:id/invitations', async ({ params, request }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { userId: string; message: string };
    const candidate = candidatePool.find((item) => item.id === body.userId);
    if (!candidate) return new HttpResponse(null, { status: 404 });
    if (candidate.invitationStatus === 'pending') {
      return HttpResponse.json({ code: 'DUPLICATE_INVITATION', message: '이미 초대한 사용자예요.' }, { status: 409 });
    }
    candidate.invitationStatus = 'pending';
    return HttpResponse.json({ id: `invitation-${Date.now()}`, status: 'pending' }, { status: 201 });
  }),

  http.get('/api/rooms/:id/applications', ({ params }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(roomApplications.get(room.id) ?? []);
  }),

  http.patch('/api/rooms/:id/applications/:applicationId', async ({ params, request }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    const application = (roomApplications.get(room.id) ?? []).find((item) => item.id === params.applicationId);
    if (!application) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { action: 'approve' | 'reject' };
    if (body.action === 'approve' && room.memberCount >= room.capacity) {
      return HttpResponse.json({ code: 'ROOM_FULL', message: '인연 정원이 가득 찼어요.' }, { status: 409 });
    }
    application.status = body.action === 'approve' ? 'approved' : 'rejected';
    if (body.action === 'approve') room.memberCount += 1;
    return HttpResponse.json(application);
  }),

  http.get('/api/rooms/:id/messages', ({ params }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    if (!room.membershipRole) return HttpResponse.json({ code: 'FORBIDDEN', message: '참여자만 채팅을 볼 수 있어요.' }, { status: 403 });
    return HttpResponse.json({ items: roomMessages.get(room.id) ?? [], nextCursor: null });
  }),

  http.post('/api/rooms/:id/messages', async ({ params, request }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { content: string };
    const message: RoomMessage = { id: `message-${Date.now()}`, sender: { id: 'user-me', name: '나' }, content: body.content, createdAt: new Date().toISOString() };
    const messages = roomMessages.get(room.id) ?? [];
    messages.push(message);
    roomMessages.set(room.id, messages);
    return HttpResponse.json(message, { status: 201 });
  }),

  http.post('/api/rooms/:id/applications', ({ params }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    room.applicationStatus = 'pending';
    return HttpResponse.json({ id: `application-${room.id}`, status: 'pending' });
  }),

  http.post('/api/goals/analyze', async ({ request }) => {
    const body = (await request.json()) as { text: string; keywords: string[] };
    if (!body.text.trim() && body.keywords.length === 0) {
      return HttpResponse.json({ code: 'EMPTY_GOAL', message: '목표를 입력해주세요.' }, { status: 400 });
    }
    const analysis: GoalAnalysis = {
      id: `analysis-${Date.now()}`,
      normalizedGoal: body.text.trim() || `${body.keywords.join(' · ')} 인연 찾기`,
      keywords: [...new Set([...body.keywords, '협업', '상호보완'])],
      suggestedRoomType: body.keywords.includes('커피챗') ? 'coffee_chat' : 'project',
      suggestedRoles: ['백엔드 개발', '프로덕트 디자인'],
      recommendedRoomIds: rooms.filter((room) => room.status === 'recruiting').map((room) => room.id),
    };
    return HttpResponse.json(analysis);
  }),

  http.patch('/api/profile', async ({ request }) => {
    if (!profile) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Profile>;
    profile = { ...profile, ...body };
    return HttpResponse.json(profile);
  }),

  http.post('/api/goals', async ({ request }) => {
    const body = (await request.json()) as { text: string; category: string };
    goalSeq += 1;
    const id = `goal-${goalSeq}`;
    const goal: Goal = {
      id,
      text: body.text,
      category: body.category,
      status: 'processing',
      createdAt: new Date().toISOString(),
    };
    goals.set(id, goal);
    // 모의 파이프라인: 4초 후 completed 처리 (GoalPipelineStatus 폴링 대상)
    setTimeout(() => {
      const g = goals.get(id);
      if (g) goals.set(id, { ...g, status: 'completed' });
    }, 4000);
    return HttpResponse.json(goal);
  }),

  http.get('/api/goals/:id', ({ params }) => {
    const goal = goals.get(params.id as string);
    if (!goal) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(goal);
  }),

  http.get('/api/goals', () => {
    return HttpResponse.json([...goals.values()].reverse());
  }),

  http.get('/api/recommendations', ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const size = Number(url.searchParams.get('size') ?? '6');
    const available = recommendationsPool.filter((r) => !actioned.has(r.id));
    const start = (page - 1) * size;
    const items = available.slice(start, start + size);
    return HttpResponse.json({
      items,
      page,
      size,
      hasMore: start + size < available.length,
    });
  }),

  http.get('/api/recommendations/:id', ({ params }) => {
    const rec = recommendationsPool.find((r) => r.id === params.id);
    if (!rec) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(rec);
  }),

  http.post('/api/recommendations/:id/action', async ({ params, request }) => {
    const id = params.id as string;
    if (actioned.has(id)) {
      return HttpResponse.json({ message: '이미 처리된 추천입니다.' }, { status: 409 });
    }
    const body = (await request.json()) as { action: 'accept' | 'reject' };
    actioned.add(id);
    if (body.action === 'accept') {
      const rec = recommendationsPool.find((r) => r.id === id);
      if (rec) {
        matches.push({
          id: `match-${matches.length + 1}`,
          counterpartId: rec.candidateId,
          counterpartSummary: rec.candidateProfileSummary,
          status: 'active',
          startedAt: new Date().toISOString(),
          endedAt: null,
        });
      }
    }
    return HttpResponse.json({ id, action: body.action });
  }),

  http.get('/api/matches', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const filtered = status ? matches.filter((m) => m.status === status) : matches;
    return HttpResponse.json(filtered);
  }),

  // PATCH /api/matches/:id — Architecture.md/front_request.md에 미정의된 신규 제안 엔드포인트
  // (매칭 종료하기, dev_next_subject1.md 백엔드 협의 필요 항목 참조)
  http.patch('/api/matches/:id', async ({ params }) => {
    const id = params.id as string;
    const match = matches.find((m) => m.id === id);
    if (!match) return new HttpResponse(null, { status: 404 });
    match.status = 'ended';
    match.endedAt = new Date().toISOString();
    return HttpResponse.json(match);
  }),

  http.post('/api/feedback', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ok: true, received: body });
  }),
];
