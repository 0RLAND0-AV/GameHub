import { Socket } from 'socket.io';
import gameManager from '../game-manager';
import { PlayerAnswerPayload, SocketErrorResponse } from '../../shared/types/socket-events.type';
import { GameEventType } from '../../shared/types/game-enums.type';

export function handleTriviaGameplay(socket: Socket): void {

  // ============================================
  // RESPONDER PREGUNTA
  // ============================================
  socket.on('player:answer', (payload: PlayerAnswerPayload) => {
    try {
      console.log(`📥 player:answer received from ${payload.userId}`);

      if (!payload.roomId || !payload.userId || !payload.questionId || !payload.selectedOptionId) {
        throw new Error('Invalid answer payload');
      }

      if (payload.responseTimeSeconds < 0 || payload.responseTimeSeconds > 15) {
        throw new Error('Invalid response time');
      }

      gameManager.handlePlayerAnswer(payload);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      socket.emit(GameEventType.ERROR, {
        message: errorMessage,
        code: 'ANSWER_ERROR',
      } as SocketErrorResponse);
    }
  });

  // ============================================
  // SOLICITAR ESTADO DEL JUEGO
  // ============================================
  socket.on('game:getState', (payload: { roomId: string }) => {
    try {
      const gameState = gameManager.getGameState(payload.roomId);
      
      if (!gameState) {
        socket.emit(GameEventType.ERROR, {
          message: 'Game not found',
          code: 'GAME_NOT_FOUND',
        } as SocketErrorResponse);
        return;
      }

      socket.emit('game:state', {
        currentQuestionIndex: gameState.currentQuestionIndex,
        totalQuestions: gameState.questions.length,
        playerScores: Array.from(gameState.playerScores.values()),
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      socket.emit(GameEventType.ERROR, {
        message: errorMessage,
        code: 'GET_STATE_ERROR',
      } as SocketErrorResponse);
    }
  });
}