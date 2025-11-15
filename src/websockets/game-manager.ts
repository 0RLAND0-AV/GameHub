import { getSocketIOInstance } from '../config/socketio-server.config';
import { ENV } from '../config/environment.config';
import {
  QuestionData,
  QuestionOption,
  PlayerAnswerPayload,
  QuestionResultsPayload,
  PlayerQuestionResult,
  GameResultsPayload,
  FinalPlayerRanking,
} from '../shared/types/socket-events.type';
import { PlayerTransactionsService } from '../modules/player-transactions/player-transactions.service';
import { GameHistoryService } from '../modules/game-history/game-history.service';
import { GameSessionsService } from '../modules/game-sessions/game-sessions.service';
import { UsersService } from '../modules/users/users.service';
import socketIOManager from './socketio-manager';
import { GameRoomsService } from '../modules/game-rooms/game-rooms.service'; // ⭐ AGREGAR

interface GameState {
  roomId: string;
  gameSessionId?: string; // ⭐ NUEVO: Almacenar ID de sesión real
  currentQuestionIndex: number;
  questions: QuestionData[];
  playerScores: Map<string, PlayerScore>;
  questionStartTime?: number;
  questionTimer?: NodeJS.Timeout;
  playerAnswers: Map<string, PlayerAnswerData>;
  betAmount: number; // ⭐ NUEVO
  totalPot: number;  // ⭐ NUEVO
}

interface PlayerScore {
  userId: string;
  username: string;
  totalScore: number;
  correctAnswers: number;
}

interface PlayerAnswerData {
  userId: string;
  selectedOptionId: string;
  responseTimeSeconds: number;
  answeredAt: number;
}

class GameManager {
  private games: Map<string, GameState> = new Map();
  private transactionsService: PlayerTransactionsService;
  private gameHistoryService: GameHistoryService;
  private gameSessionsService: GameSessionsService; // ⭐ NUEVO
  private usersService: UsersService;
  private gameRoomsService: GameRoomsService; // ⭐ AGREGAR

  constructor() {
    this.transactionsService = new PlayerTransactionsService();
    this.gameHistoryService = new GameHistoryService();
    this.gameSessionsService = new GameSessionsService(); // ⭐ NUEVO
    this.usersService = new UsersService();
    this.gameRoomsService = new GameRoomsService(); // ⭐ AGREGAR
  }

  // ============================================
  // INICIAR JUEGO (ACTUALIZADO)
  // ============================================
  async startGame(roomId: string, players: { userId: string; username: string }[], betAmount: number, totalPot: number): Promise<void> {
    console.log(`🎮 Initializing game for room ${roomId}`);

    const questions = this.generateRandomQuestions(ENV.QUESTIONS_PER_GAME);

    const playerScores = new Map<string, PlayerScore>();
    players.forEach(player => {
      playerScores.set(player.userId, {
        userId: player.userId,
        username: player.username,
        totalScore: 0,
        correctAnswers: 0,
      });
    });

    // ⭐ CREAR SESIÓN DE JUEGO EN BD
    let gameSessionId: string | undefined;
    try {
      const gameSession = await this.gameSessionsService.createGameSession(roomId);
      gameSessionId = gameSession.id;
    } catch (error) {
      console.error(`❌ Failed to create game session for room ${roomId}:`, error);
      throw error;
    }

    const gameState: GameState = {
      roomId,
      gameSessionId,        // ⭐ GUARDAR ID DE SESIÓN
      currentQuestionIndex: 0,
      questions,
      playerScores,
      playerAnswers: new Map(),
      betAmount,      // ⭐ NUEVO
      totalPot,       // ⭐ NUEVO
    };

    this.games.set(roomId, gameState);

    setTimeout(() => {
      this.displayNextQuestion(roomId);
    }, 3000);
  }

  // ============================================
  // MOSTRAR SIGUIENTE PREGUNTA
  // ============================================
  private displayNextQuestion(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    if (game.currentQuestionIndex >= game.questions.length) {
      this.finishGame(roomId);
      return;
    }

    game.playerAnswers.clear();

    const currentQuestion = game.questions[game.currentQuestionIndex];
    game.questionStartTime = Date.now();

    const io = getSocketIOInstance();
    io.to(roomId).emit('question:displayed', currentQuestion);

    console.log(
      `📋 Question ${game.currentQuestionIndex + 1}/${game.questions.length} displayed in room ${roomId}`
    );

    game.questionTimer = setTimeout(() => {
      this.showQuestionResults(roomId);
    }, ENV.TIME_PER_QUESTION * 1000);
  }

  // ============================================
  // RECIBIR RESPUESTA DE JUGADOR
  // ============================================
  handlePlayerAnswer(payload: PlayerAnswerPayload): void {
    const game = this.games.get(payload.roomId);
    if (!game) {
      console.log(`⚠️ Game not found for room ${payload.roomId}`);
      return;
    }

    if (game.playerAnswers.has(payload.userId)) {
      console.log(`⚠️ Player ${payload.userId} already answered`);
      return;
    }

    game.playerAnswers.set(payload.userId, {
      userId: payload.userId,
      selectedOptionId: payload.selectedOptionId,
      responseTimeSeconds: payload.responseTimeSeconds,
      answeredAt: Date.now(),
    });

    console.log(
      `✅ Player ${payload.userId} answered in ${payload.responseTimeSeconds}s`
    );

    const totalPlayers = game.playerScores.size;
    const answeredPlayers = game.playerAnswers.size;

    if (answeredPlayers === totalPlayers) {
      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = undefined;
      }
      this.showQuestionResults(payload.roomId);
    }
  }

  // ============================================
  // MOSTRAR RESULTADOS DE PREGUNTA
  // ============================================
  private showQuestionResults(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    const currentQuestion = game.questions[game.currentQuestionIndex];
    const correctOption = currentQuestion.options.find(opt => 
      this.isCorrectOption(currentQuestion.questionId, opt.optionId)
    );

    if (!correctOption) {
      console.error(`❌ No correct option found for question ${currentQuestion.questionId}`);
      return;
    }

    const playerResults: PlayerQuestionResult[] = [];

    game.playerScores.forEach((playerScore, userId) => {
      const answer = game.playerAnswers.get(userId);
      
      let isCorrect = false;
      let pointsEarned = 0;
      let responseTime = ENV.TIME_PER_QUESTION;

      if (answer) {
        isCorrect = answer.selectedOptionId === correctOption.optionId;
        responseTime = answer.responseTimeSeconds;

        if (isCorrect) {
          const speedBonus = Math.max(0, (ENV.TIME_PER_QUESTION - responseTime)) * ENV.SPEED_BONUS_MULTIPLIER;
          pointsEarned = ENV.BASE_POINTS + Math.round(speedBonus);

          playerScore.totalScore += pointsEarned;
          playerScore.correctAnswers += 1;
        }
      }

      playerResults.push({
        userId,
        username: playerScore.username,
        isCorrect,
        pointsEarned,
        totalScore: playerScore.totalScore,
        responseTime,
      });
    });

    playerResults.sort((a, b) => b.totalScore - a.totalScore);

    const resultsPayload: QuestionResultsPayload = {
      questionId: currentQuestion.questionId,
      correctOptionId: correctOption.optionId,
      playerResults,
    };

    const io = getSocketIOInstance();
    io.to(roomId).emit('question:results', resultsPayload);

    console.log(`📊 Results sent for question ${game.currentQuestionIndex + 1}`);

    setTimeout(() => {
      if (game) {
        game.currentQuestionIndex++;
        this.displayNextQuestion(roomId);
      }
    }, 5000);
  }

  // ============================================
  // FINALIZAR JUEGO (ACTUALIZADO CON PREMIOS)
  // ============================================
  private async finishGame(roomId: string): Promise<void> {
    const game = this.games.get(roomId);
    if (!game) return;

    console.log(`🏁 Game finished in room ${roomId}`);

    // Calcular ranking final
    const playersArray = Array.from(game.playerScores.values());
    playersArray.sort((a, b) => b.totalScore - a.totalScore);

    // ⭐ CALCULAR DISTRIBUCIÓN DE PREMIOS
    const prizeDistribution = this.calculatePrizeDistribution(
      playersArray,
      game.totalPot
    );

    // Asignar posiciones y premios
    const finalRanking: FinalPlayerRanking[] = [];
    const gameHistoryData = [] as any;
    const rewardsToDistribute = [] as any;

    let currentPosition = 1;
    let previousScore = -1;

    playersArray.forEach((player, index) => {
      if (player.totalScore !== previousScore) {
        currentPosition = index + 1;
      }
      previousScore = player.totalScore;

      const prizeWon = prizeDistribution.get(currentPosition) || 0;

      const accuracy = game.questions.length > 0 
        ? (player.correctAnswers / game.questions.length) * 100 
        : 0;

      finalRanking.push({
        position: currentPosition,
        userId: player.userId,
        username: player.username,
        finalScore: player.totalScore,
        prizeWon,
        correctAnswers: player.correctAnswers,
        totalQuestions: game.questions.length,
        accuracy: Math.round(accuracy * 100) / 100,
      });

      // Preparar datos para historial
      gameHistoryData.push({
        roomId,
        gameSessionId: game.gameSessionId, // ⭐ USAR ID DE SESIÓN REAL
        userId: player.userId,
        finalPosition: currentPosition,
        finalScore: player.totalScore,
        prizeWon,
      });

      // Preparar premios a distribuir
      if (prizeWon > 0) {
        rewardsToDistribute.push({
          userId: player.userId,
          amount: prizeWon,
          position: currentPosition,
        });
      }
    });

    try {
      // ⭐ EJECUTAR TODO EN UNA TRANSACCIÓN
      await this.processGameFinalization(
        roomId,
        rewardsToDistribute,
        gameHistoryData,
        playersArray
      );

      const resultsPayload: GameResultsPayload = {
        roomId,
        finalRanking,
        totalPot: game.totalPot,
      };

      const io = getSocketIOInstance();
      io.to(roomId).emit('game:finished', resultsPayload);

      console.log(`✅ Game finalized successfully for room ${roomId}`);

      // ⭐ NOTIFICAR AL SOCKET MANAGER PARA LIMPIAR LA SALA
      socketIOManager.cleanupRoom(roomId);

    } catch (error) {
      console.error(`❌ Error finalizing game ${roomId}:`, error);
      
      const io = getSocketIOInstance();
      io.to(roomId).emit('error', {
        message: 'Error processing game results',
        code: 'GAME_FINALIZATION_ERROR',
      });
    }

    // Limpiar juego después de 30 segundos
    setTimeout(() => {
      this.games.delete(roomId);
      console.log(`🗑️ Game cleaned up for room ${roomId}`);
    }, 30000);
  }

  // ============================================
  // CALCULAR DISTRIBUCIÓN DE PREMIOS
  // ============================================
  private calculatePrizeDistribution(
    players: PlayerScore[],
    totalPot: number
  ): Map<number, number> {
    const distribution = new Map<number, number>();

    if (players.length === 0) return distribution;

    // Distribución de premios:
    // 1er lugar: 50%
    // 2do lugar: 30%
    // 3er lugar: 20%
    // 4to y 5to: 0%

    const percentages = [0.50, 0.30, 0.20];

    // Agrupar jugadores por puntaje (para manejar empates)
    const scoreGroups = new Map<number, number[]>();
    players.forEach((player, index) => {
      if (!scoreGroups.has(player.totalScore)) {
        scoreGroups.set(player.totalScore, []);
      }
      scoreGroups.get(player.totalScore)!.push(index + 1);
    });

    // Calcular premios considerando empates
    const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a);

    let positionIndex = 0;
    sortedScores.forEach(score => {
      const positions = scoreGroups.get(score)!;
      
      if (positionIndex < percentages.length) {
        // Calcular cuánto porcentaje acumulado corresponde a estas posiciones
        let accumulatedPercentage = 0;
        for (let i = 0; i < positions.length && positionIndex + i < percentages.length; i++) {
          accumulatedPercentage += percentages[positionIndex + i];
        }

        // Dividir equitativamente entre jugadores empatados
        const prizePerPlayer = Math.floor((totalPot * accumulatedPercentage) / positions.length);

        positions.forEach(position => {
          distribution.set(position, prizePerPlayer);
        });
      }

      positionIndex += positions.length;
    });

    return distribution;
  }

  // ============================================
  // PROCESAR FINALIZACIÓN DEL JUEGO (ACTUALIZADO)
  // ============================================
  private async processGameFinalization(
    roomId: string,
    rewards: { userId: string; amount: number; position: number }[],
    gameHistoryData: any[],
    players: PlayerScore[]
  ): Promise<void> {
    // 1. Distribuir premios
    if (rewards.length > 0) {
      await this.transactionsService.distributeRewards(roomId, rewards);
    }

    // 2. Guardar historial de partidas
    await this.gameHistoryService.createGameHistory(gameHistoryData);

    // 3. Actualizar resultados en room_players
    for (const historyEntry of gameHistoryData) {
      await this.gameRoomsService.updatePlayerResults(
        roomId,
        historyEntry.userId,
        historyEntry.finalPosition,
        historyEntry.finalScore,
        historyEntry.prizeWon
      );
    }

    // 4. Actualizar estadísticas de usuarios
    for (const player of players) {
      const ranking = gameHistoryData.find(h => h.userId === player.userId);
      const isWinner = ranking?.finalPosition === 1;
      const isLoser = ranking?.finalPosition > 3;

      await this.usersService.updateStats(player.userId, {
        totalGames: 1,
        victories: isWinner ? 1 : 0,
        defeats: isLoser ? 1 : 0,
        totalCorrectAnswers: player.correctAnswers,
        totalQuestions: gameHistoryData[0]?.totalQuestions || 10,
        totalCoinsWon: ranking?.prizeWon || 0,
        totalCoinsLost: ranking?.prizeWon > 0 ? 0 : gameHistoryData[0]?.betAmount || 0,
      });
    }

    console.log(`✅ Game finalization processed for room ${roomId}`);
  }

  // ============================================
  // GENERAR PREGUNTAS ALEATORIAS
  // ============================================
  private generateRandomQuestions(count: number): QuestionData[] {
    const triviaBank = [
      {
        question: "¿Cuál es la capital de Francia?",
        options: ["Londres", "París", "Berlín", "Madrid"],
        correctIndex: 1,
        category: "Geografía"
      },
      {
        question: "¿En qué año llegó el hombre a la Luna?",
        options: ["1965", "1969", "1972", "1975"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es el planeta más grande del sistema solar?",
        options: ["Saturno", "Júpiter", "Neptuno", "Urano"],
        correctIndex: 1,
        category: "Ciencia"
      },
      {
        question: "¿Quién pintó La Mona Lisa?",
        options: ["Van Gogh", "Picasso", "Leonardo da Vinci", "Miguel Ángel"],
        correctIndex: 2,
        category: "Arte"
      },
      {
        question: "¿Cuál es el océano más grande?",
        options: ["Atlántico", "Índico", "Ártico", "Pacífico"],
        correctIndex: 3,
        category: "Geografía"
      },
      {
        question: "¿Cuántos continentes hay en el mundo?",
        options: ["5", "6", "7", "8"],
        correctIndex: 2,
        category: "Geografía"
      },
      {
        question: "¿Qué elemento químico tiene el símbolo 'O'?",
        options: ["Oro", "Oxígeno", "Osmio", "Oganesson"],
        correctIndex: 1,
        category: "Ciencia"
      },
      {
        question: "¿En qué país se encuentra la Torre Eiffel?",
        options: ["Italia", "España", "Francia", "Alemania"],
        correctIndex: 2,
        category: "Geografía"
      },
      {
        question: "¿Cuál es el idioma más hablado del mundo?",
        options: ["Español", "Inglés", "Mandarín", "Hindi"],
        correctIndex: 2,
        category: "Cultura"
      },
      {
        question: "¿Quién escribió 'Cien años de soledad'?",
        options: ["Mario Vargas Llosa", "Gabriel García Márquez", "Jorge Luis Borges", "Octavio Paz"],
        correctIndex: 1,
        category: "Literatura"
      },
      {
        question: "¿Cuántos jugadores hay en un equipo de fútbol?",
        options: ["9", "10", "11", "12"],
        correctIndex: 2,
        category: "Deportes"
      },
      {
        question: "¿Cuál es el río más largo del mundo?",
        options: ["Nilo", "Amazonas", "Yangtsé", "Misisipi"],
        correctIndex: 1,
        category: "Geografía"
      },
      {
        question: "¿En qué año comenzó la Segunda Guerra Mundial?",
        options: ["1937", "1939", "1941", "1945"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es el metal más abundante en la corteza terrestre?",
        options: ["Hierro", "Cobre", "Aluminio", "Zinc"],
        correctIndex: 2,
        category: "Ciencia"
      },
      {
        question: "¿Quién fue el primer presidente de Estados Unidos?",
        options: ["Thomas Jefferson", "George Washington", "Abraham Lincoln", "John Adams"],
        correctIndex: 1,
        category: "Historia"
      },
    ];

    const shuffled = [...triviaBank].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, Math.min(count, triviaBank.length));

    return selectedQuestions.map((q, index) => ({
      questionId: `q_${Date.now()}_${index}`,
      questionText: q.question,
      options: q.options.map((optText, optIndex) => ({
        optionId: `opt_${Date.now()}_${index}_${optIndex}`,
        optionText: optText,
        optionOrder: optIndex + 1,
      })),
      timeLimit: ENV.TIME_PER_QUESTION,
      questionNumber: index + 1,
      totalQuestions: count,
    }));
  }

  // ============================================
  // VERIFICAR OPCIÓN CORRECTA
  // ============================================
  private isCorrectOption(questionId: string, optionId: string): boolean {
    for (const game of this.games.values()) {
      const question = game.questions.find(q => q.questionId === questionId);
      if (question) {
        return question.options[1]?.optionId === optionId;
      }
    }
    return false;
  }

  // ============================================
  // OBTENER ESTADO DEL JUEGO
  // ============================================
  getGameState(roomId: string): GameState | undefined {
    return this.games.get(roomId);
  }

  // ============================================
  // CANCELAR JUEGO
  // ============================================
  cancelGame(roomId: string): void {
    const game = this.games.get(roomId);
    if (game && game.questionTimer) {
      clearTimeout(game.questionTimer);
    }
    this.games.delete(roomId);
    console.log(`❌ Game cancelled for room ${roomId}`);
  }
}

export default new GameManager();

