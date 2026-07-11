import { http, HttpResponse } from 'msw';
import type {
  Profile,
  Goal,
  Recommendation,
  MatchRelation,
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
    };
    return HttpResponse.json(profile);
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
