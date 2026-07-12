// front_request.md §6 데이터 타입 정의 기준. 서버 응답 타입의 단일 진실 소스로 사용한다.

export interface Profile {
  id: string;
  userId: string;
  interests: string[];
  skillTags: string[];
  collabStyle: string;
  projectHistory: string[];
  visibilityScope: 'public' | 'limited' | 'private';
  onboardingCompleted: boolean;
  bio?: string;
  socialLinks?: {
    blog?: string;
    instagram?: string;
    github?: string;
  };
}

export type GoalStatus = 'processing' | 'completed' | 'failed';

export interface Goal {
  id: string;
  text: string;
  category: string;
  status: GoalStatus;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  candidateId: string;
  candidateProfileSummary: Pick<Profile, 'interests' | 'skillTags'>;
  complementScore: number; // 0~100
  gapTags: string[];
  reasonText: string;
  createdAt: string;
}

export type RecommendationAction = 'accept' | 'reject';

export type MatchStatus = 'active' | 'ended';

export interface MatchRelation {
  id: string;
  counterpartId: string;
  counterpartSummary: Pick<Profile, 'interests' | 'skillTags'>;
  status: MatchStatus;
  startedAt: string;
  endedAt: string | null;
}

export interface FeedbackPayload {
  matchId: string;
  satisfactionScore: number; // 1~5
  comment?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  size: number;
  hasMore: boolean;
}
