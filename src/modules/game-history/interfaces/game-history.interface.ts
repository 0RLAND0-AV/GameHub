export interface IGameHistory {
  id: string;
  roomId: string;
  gameSessionId: string;
  userId: string;
  finalPosition: number;
  finalScore: number;
  prizeWon: number;
  createdAt: Date;
}

export interface CreateGameHistoryData {
  roomId: string;
  gameSessionId: string;
  userId: string;
  finalPosition: number;
  finalScore: number;
  prizeWon: number;
}