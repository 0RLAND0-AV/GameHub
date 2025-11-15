export enum RoomStatus {
  WAITING = 'WAITING',
  COUNTDOWN = 'COUNTDOWN',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum GameSessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum PlayerConnectionStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
}

export enum GameEventType {
  // Room events
  ROOM_CREATED = 'room:created',
  ROOM_UPDATED = 'room:updated',
  ROOM_DELETED = 'room:deleted',
  PLAYER_JOINED = 'player:joined',
  PLAYER_LEFT = 'player:left',
  PLAYER_DISCONNECTED = 'player:disconnected',
  
  // Countdown events
  COUNTDOWN_STARTED = 'countdown:started',
  COUNTDOWN_TICK = 'countdown:tick',
  
  // Game events
  GAME_STARTED = 'game:started',
  QUESTION_DISPLAYED = 'question:displayed',
  PLAYER_ANSWERED = 'player:answered',
  QUESTION_RESULTS = 'question:results',
  GAME_FINISHED = 'game:finished',
  GAME_RESULTS = 'game:results',
  
  // Error events
  ERROR = 'error',
}

