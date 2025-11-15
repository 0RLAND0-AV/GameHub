export interface IRoom {
  id: string;
  gameTypeId: string;
  creatorId: string;
  betAmount: number;
  status: string;
  minPlayers: number;
  maxPlayers: number;
  totalPot: number;
  countdownStartedAt?: Date;
  gameStartedAt?: Date;
  gameFinishedAt?: Date;
  createdAt: Date;
}

export interface CreateRoomData {
  gameTypeId: string;
  creatorId: string;
  betAmount: number;
  minPlayers: number;
  maxPlayers: number;
}