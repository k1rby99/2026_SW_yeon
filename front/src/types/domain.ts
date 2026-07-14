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

export type RoomType = 'competition' | 'hackathon' | 'study' | 'project' | 'coffee_chat' | 'networking';
export type RoomStatus = 'recruiting' | 'active' | 'ended';
export type MembershipRole = 'owner' | 'member' | null;
export type ApplicationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface ConnectionRoom {
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

export interface GoalAnalysis {
  id: string;
  normalizedGoal: string;
  keywords: string[];
  suggestedRoomType: RoomType;
  suggestedRoles: string[];
  recommendedRoomIds: string[];
}

export interface RoomUpsertPayload {
  title: string;
  type: RoomType;
  summary: string;
  tags: string[];
  requiredRoles: string[];
  capacity: number;
  deadline?: string;
  visibility: 'public' | 'private';
  applicationMode: 'approval' | 'instant';
  meetingStyle: 'online' | 'offline' | 'hybrid';
  location?: string;
  notice?: string;
}

export interface RoomCandidate {
  id: string;
  name: string;
  role: string;
  bio: string;
  skillTags: string[];
  interests: string[];
  matchScore: number;
  reason: string;
  invitationStatus: 'none' | 'pending' | 'accepted' | 'declined';
}

export interface RoomApplication {
  id: string;
  applicant: RoomCandidate;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface RoomMessage {
  id: string;
  sender: { id: string; name: string };
  content: string;
  createdAt: string;
}

export interface RoomMemberSummary {
  id: string;
  name: string;
  role: string;
  bio: string;
  skillTags: string[];
  isOwner: boolean;
  joinedAt: string;
}

export interface RoomMemberProfile extends RoomMemberSummary {
  interests: string[];
  collabStyle: string;
  projectHistory: string[];
  socialLinks?: {
    blog?: string;
    instagram?: string;
    github?: string;
  };
}

export type OpportunityType = 'contest' | 'announcement';
export type OpportunityStatus = 'open' | 'upcoming' | 'closed';

export interface Opportunity {
  id: string;
  type: OpportunityType;
  status: OpportunityStatus;
  category: string;
  title: string;
  organizer: string;
  summary: string;
  imageUrl: string;
  tags: string[];
  deadline: string;
  period: string;
  eligibility: string;
  benefits: string[];
  officialUrl: string;
  featured: boolean;
}
