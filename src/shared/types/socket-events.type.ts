export interface SocketErrorResponse {
  message: string;
  code?: string;
}

export interface RoomData {
  roomId: string;
  gameType: string;
  betAmount: number;
  status: string;
  minPlayers: number;
  maxPlayers: number;
  currentPlayers: number;
  totalPot: number;
  creatorId: string;
  players: PlayerInRoom[];
  countdownSeconds?: number;
}

export interface PlayerInRoom {
  userId: string;
  username: string;
  avatar?: string;
  coins: number;
  isConnected: boolean;
  socketId: string;
  joinedAt: Date;
}

export interface CreateRoomPayload {
  userId: string;
  username: string;
  gameTypeId: string;
  betAmount: number;
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
  username: string;
}

export interface CountdownTickPayload {
  roomId: string;
  secondsRemaining: number;
}

export interface QuestionData {
  questionId: string;
  questionText: string;
  options: QuestionOption[];
  timeLimit: number;
  questionNumber: number;
  totalQuestions: number;
}

export interface QuestionOption {
  optionId: string;
  optionText: string;
  optionOrder: number;
}

export interface PlayerAnswerPayload {
  roomId: string;
  userId: string;
  questionId: string;
  selectedOptionId: string;
  responseTimeSeconds: number;
}

export interface QuestionResultsPayload {
  questionId: string;
  correctOptionId: string;
  playerResults: PlayerQuestionResult[];
}

export interface PlayerQuestionResult {
  userId: string;
  username: string;
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  responseTime: number;
}

export interface GameResultsPayload {
  roomId: string;
  finalRanking: FinalPlayerRanking[];
  totalPot: number;
}

export interface FinalPlayerRanking {
  position: number;
  userId: string;
  username: string;
  finalScore: number;
  prizeWon: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
}