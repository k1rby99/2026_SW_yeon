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
  RoomMemberProfile,
  Opportunity,
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

const memberProfiles: RoomMemberProfile[] = [
  {
    id: 'user-me', name: '나', role: '프론트엔드 개발자', bio: '사용하기 편한 모바일 경험을 만들고 있습니다.',
    skillTags: ['React', 'TypeScript', 'UI 구현'], interests: ['모바일', '로컬', '사이드 프로젝트'],
    collabStyle: '아이디어를 빠르게 화면으로 만들고 피드백을 주고받는 협업을 선호해요.',
    projectHistory: ['동네 모임 지도 서비스 프론트엔드', '공공데이터 해커톤 프로토타입'],
    socialLinks: { github: 'https://github.com/' }, isOwner: true, joinedAt: '2026-06-02T09:00:00Z',
  },
  {
    id: 'user-2', name: '박지후', role: '프로덕트 매니저', bio: '문제를 구조화하고 팀이 같은 목표를 보도록 돕습니다.',
    skillTags: ['서비스 기획', '사용자 인터뷰', '데이터 분석'], interests: ['로컬', '커뮤니티', '커피챗'],
    collabStyle: '목표와 일정을 명확히 합의하고 자율적으로 실행하는 방식을 선호해요.',
    projectHistory: ['지역 상권 탐색 서비스 PM', '청년 정책 데이터 프로젝트'],
    socialLinks: { blog: 'https://example.com/jihu' }, isOwner: false, joinedAt: '2026-06-05T09:00:00Z',
  },
  {
    id: 'user-3', name: '이하린', role: 'UX 디자이너', bio: '관찰과 인터뷰를 바탕으로 사람 중심의 제품을 설계합니다.',
    skillTags: ['Figma', 'UX 리서치', '프로토타이핑'], interests: ['디자인', '커뮤니티', '커리어'],
    collabStyle: '작은 가설을 함께 검증하고 결과를 투명하게 공유하는 팀을 좋아해요.',
    projectHistory: ['모빌리티 앱 UX 개선', '지역 커뮤니티 리서치'],
    socialLinks: { instagram: 'https://instagram.com/' }, isOwner: false, joinedAt: '2026-06-08T09:00:00Z',
  },
  {
    id: 'user-4', name: '정도윤', role: '백엔드 개발자', bio: '안정적인 API와 운영 가능한 구조를 만드는 개발자입니다.',
    skillTags: ['FastAPI', 'PostgreSQL', 'Docker'], interests: ['AI', '데이터', '오픈소스'],
    collabStyle: '기술 결정을 기록하고 작은 단위로 자주 배포하는 방식을 선호해요.',
    projectHistory: ['추천 시스템 API 개발', '데이터 파이프라인 운영'],
    socialLinks: { github: 'https://github.com/' }, isOwner: false, joinedAt: '2026-06-12T09:00:00Z',
  },
];

const roomMemberIds = new Map<string, string[]>([
  ['room-my-project', ['user-me', 'user-2', 'user-3', 'user-4']],
  ['room-coffee-chat', ['user-3', 'user-2', 'user-4', 'user-me']],
  ['room-ended-study', ['user-4', 'user-me', 'user-2', 'user-3']],
]);

const opportunities: Opportunity[] = [
  {
    id: 'op-ai-innovation', type: 'contest', status: 'open', category: 'AI · 소프트웨어',
    title: '2026 AI 서비스 아이디어 경진대회', organizer: '한국소프트웨어진흥원',
    summary: '생성형 AI를 활용해 일상의 문제를 해결하는 서비스 아이디어와 프로토타입을 모집합니다.',
    imageUrl: '/contests/ai-innovation.png', tags: ['AI', '서비스 기획', '프로토타입'],
    deadline: '2026-07-26', period: '2026.07.01 - 2026.07.26', eligibility: '대학생 및 만 34세 이하 청년, 2~5인 팀',
    benefits: ['대상 500만원', '전문가 멘토링', '후속 창업 프로그램 연계'], officialUrl: 'https://example.com/ai-contest', featured: true,
  },
  {
    id: 'op-public-data', type: 'contest', status: 'open', category: '공공데이터',
    title: '공공데이터 활용 창업 경진대회', organizer: '행정안전부',
    summary: '공공데이터를 활용한 사회문제 해결 아이디어와 제품·서비스를 발굴합니다.',
    imageUrl: '/contests/public-data.png', tags: ['공공데이터', '창업', '데이터 분석'],
    deadline: '2026-08-04', period: '2026.06.20 - 2026.08.04', eligibility: '공공데이터 기반 아이디어를 가진 개인 또는 팀',
    benefits: ['총상금 2,000만원', '사업화 컨설팅', '데이터 기업 네트워킹'], officialUrl: 'https://example.com/public-data', featured: true,
  },
  {
    id: 'op-design-challenge', type: 'contest', status: 'open', category: '스타트업 · 디자인',
    title: '청년 프로덕트 디자인 챌린지', organizer: '서울디자인재단',
    summary: '초기 스타트업의 실제 문제를 해결할 프로덕트 디자이너와 개발자 팀을 모집합니다.',
    imageUrl: '/contests/startup-design.png', tags: ['UX', '프로덕트 디자인', '스타트업'],
    deadline: '2026-08-13', period: '2026.07.10 - 2026.08.13', eligibility: '디자인 또는 개발 포트폴리오를 보유한 청년',
    benefits: ['우수팀 상금 300만원', '현직자 리뷰', '협력사 인턴십 기회'], officialUrl: 'https://example.com/design', featured: true,
  },
  {
    id: 'op-startup-campus', type: 'announcement', status: 'open', category: '창업 지원',
    title: '2026 예비창업패키지 참여팀 모집', organizer: '창업진흥원',
    summary: '기술 기반 아이디어를 보유한 예비창업팀에 사업화 자금과 교육을 지원합니다.',
    imageUrl: '/contests/ai-innovation.png', tags: ['예비창업', '사업화', '멘토링'],
    deadline: '2026-08-20', period: '2026.07.15 - 2026.08.20', eligibility: '사업자 등록 전인 예비창업자 또는 팀',
    benefits: ['사업화 자금 지원', '전담 멘토 배정', '투자 연계 데모데이'], officialUrl: 'https://example.com/startup', featured: false,
  },
  {
    id: 'op-coffee-chat', type: 'announcement', status: 'upcoming', category: '네트워킹',
    title: 'IT 직무 커피챗 네트워킹 데이', organizer: '청년취업사관학교',
    summary: '개발, 디자인, 기획 현직자와 소규모로 대화하고 동료를 만나는 네트워킹 프로그램입니다.',
    imageUrl: '/contests/startup-design.png', tags: ['커피챗', '커리어', '네트워킹'],
    deadline: '2026-09-01', period: '2026.08.18 - 2026.09.01', eligibility: 'IT 직무 취업과 협업에 관심 있는 누구나',
    benefits: ['현직자 그룹 커피챗', '참여자 네트워킹', '직무별 포트폴리오 상담'], officialUrl: 'https://example.com/coffee-chat', featured: false,
  },
  {
    id: 'op-open-source', type: 'announcement', status: 'open', category: '개발자 프로그램',
    title: '오픈소스 컨트리뷰션 아카데미 참가자 모집', organizer: '정보통신산업진흥원',
    summary: '멘토와 함께 실제 오픈소스 프로젝트에 기여하며 협업 경험을 쌓는 프로그램입니다.',
    imageUrl: '/contests/public-data.png', tags: ['오픈소스', '개발', '협업'],
    deadline: '2026-08-28', period: '2026.07.28 - 2026.08.28', eligibility: '오픈소스 기여에 관심 있는 개발자',
    benefits: ['프로젝트 멘토링', '수료 인증', '우수 참여자 해외 행사 지원'], officialUrl: 'https://example.com/open-source', featured: false,
  },
];

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

  http.get('/api/opportunities', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const featured = url.searchParams.get('featured') === 'true';
    const items = opportunities.filter((item) => (!type || item.type === type) && (!featured || item.featured));
    return HttpResponse.json({ items });
  }),

  http.get('/api/opportunities/:id', ({ params }) => {
    const opportunity = opportunities.find((item) => item.id === params.id);
    return opportunity ? HttpResponse.json(opportunity) : new HttpResponse(null, { status: 404 });
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

  http.get('/api/rooms/:id/members', ({ params }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    if (!room.membershipRole) return HttpResponse.json({ code: 'FORBIDDEN', message: '참여자만 멤버를 볼 수 있어요.' }, { status: 403 });
    const ids = roomMemberIds.get(room.id) ?? ['user-me'];
    const members = ids.flatMap((memberId) => {
      const profile = memberProfiles.find((item) => item.id === memberId);
      if (!profile) return [];
      return [{
        id: profile.id, name: profile.name, role: profile.role, bio: profile.bio,
        skillTags: profile.skillTags, isOwner: profile.id === room.owner.id, joinedAt: profile.joinedAt,
      }];
    });
    return HttpResponse.json(members);
  }),

  http.get('/api/rooms/:id/members/:memberId', ({ params }) => {
    const room = rooms.find((item) => item.id === params.id);
    if (!room) return new HttpResponse(null, { status: 404 });
    if (!room.membershipRole) return HttpResponse.json({ code: 'FORBIDDEN', message: '참여자만 프로필을 볼 수 있어요.' }, { status: 403 });
    const memberIds = roomMemberIds.get(room.id) ?? [];
    if (!memberIds.includes(params.memberId as string)) return new HttpResponse(null, { status: 404 });
    const profile = memberProfiles.find((item) => item.id === params.memberId);
    return profile ? HttpResponse.json({ ...profile, isOwner: profile.id === room.owner.id }) : new HttpResponse(null, { status: 404 });
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
