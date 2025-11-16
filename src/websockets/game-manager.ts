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
import { GameRoomsService } from '../modules/game-rooms/game-rooms.service'; //  AGREGAR

interface GameState {
  roomId: string;
  gameSessionId?: string; //  NUEVO: Almacenar ID de sesión real
  currentQuestionIndex: number;
  questions: QuestionData[];
  playerScores: Map<string, PlayerScore>;
  questionStartTime?: number;
  questionTimer?: NodeJS.Timeout;
  playerAnswers: Map<string, PlayerAnswerData>;
  betAmount: number; //  NUEVO
  totalPot: number;  //  NUEVO
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
  private gameSessionsService: GameSessionsService; //  NUEVO
  private usersService: UsersService;
  private gameRoomsService: GameRoomsService; //  AGREGAR

  constructor() {
    this.transactionsService = new PlayerTransactionsService();
    this.gameHistoryService = new GameHistoryService();
    this.gameSessionsService = new GameSessionsService(); //  NUEVO
    this.usersService = new UsersService();
    this.gameRoomsService = new GameRoomsService(); //  AGREGAR
  }

  // ============================================
  // INICIAR JUEGO (ACTUALIZADO)
  // ============================================
  async startGame(roomId: string, players: { userId: string; username: string }[], betAmount: number, totalPot: number): Promise<void> {
    console.log(` Initializing game for room ${roomId}`);

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

    //  CREAR SESIÓN DE JUEGO EN BD
    let gameSessionId: string | undefined;
    try {
      const gameSession = await this.gameSessionsService.createGameSession(roomId);
      gameSessionId = gameSession.id;
    } catch (error) {
      console.error(` Failed to create game session for room ${roomId}:`, error);
      throw error;
    }

    const gameState: GameState = {
      roomId,
      gameSessionId,        //  GUARDAR ID DE SESIÓN
      currentQuestionIndex: 0,
      questions,
      playerScores,
      playerAnswers: new Map(),
      betAmount,      //  NUEVO
      totalPot,       //  NUEVO
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
      ` Question ${game.currentQuestionIndex + 1}/${game.questions.length} displayed in room ${roomId}`
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
      console.log(`️ Game not found for room ${payload.roomId}`);
      return;
    }

    if (game.playerAnswers.has(payload.userId)) {
      console.log(`️ Player ${payload.userId} already answered`);
      return;
    }

    game.playerAnswers.set(payload.userId, {
      userId: payload.userId,
      selectedOptionId: payload.selectedOptionId,
      responseTimeSeconds: payload.responseTimeSeconds,
      answeredAt: Date.now(),
    });

    console.log(
      ` Player ${payload.userId} answered in ${payload.responseTimeSeconds}s`
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
      console.error(` No correct option found for question ${currentQuestion.questionId}`);
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

    console.log(` Results sent for question ${game.currentQuestionIndex + 1}`);

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

    console.log(` Game finished in room ${roomId}`);

    // Calcular ranking final
    const playersArray = Array.from(game.playerScores.values());
    playersArray.sort((a, b) => b.totalScore - a.totalScore);

    //  CALCULAR DISTRIBUCIÓN DE PREMIOS
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
        gameSessionId: game.gameSessionId, //  USAR ID DE SESIÓN REAL
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
      //  EJECUTAR TODO EN UNA TRANSACCIÓN
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

      console.log(` Game finalized successfully for room ${roomId}`);

      //  NOTIFICAR AL SOCKET MANAGER PARA LIMPIAR LA SALA
      socketIOManager.cleanupRoom(roomId);

    } catch (error) {
      console.error(` Error finalizing game ${roomId}:`, error);
      
      const io = getSocketIOInstance();
      io.to(roomId).emit('error', {
        message: 'Error processing game results',
        code: 'GAME_FINALIZATION_ERROR',
      });
    }

    // Limpiar juego después de 30 segundos
    setTimeout(() => {
      this.games.delete(roomId);
      console.log(`️ Game cleaned up for room ${roomId}`);
    }, 30000);
  }

// ============================================
// CALCULAR DISTRIBUCIÓN DE PREMIOS (ACTUALIZADO)
// ============================================
private calculatePrizeDistribution(
  players: PlayerScore[],
  totalPot: number
): Map<number, number> {
  const distribution = new Map<number, number>();

  if (players.length === 0) return distribution;

  // Obtener porcentajes según cantidad de jugadores
  let percentages: number[] = [];
  
  switch (players.length) {
    case 2:
      percentages = [ENV.PRIZE_2P_FIRST, ENV.PRIZE_2P_SECOND];
      break;
    case 3:
      percentages = [ENV.PRIZE_3P_FIRST, ENV.PRIZE_3P_SECOND, ENV.PRIZE_3P_THIRD];
      break;
    case 4:
      percentages = [ENV.PRIZE_4P_FIRST, ENV.PRIZE_4P_SECOND, ENV.PRIZE_4P_THIRD, ENV.PRIZE_4P_FOURTH];
      break;
    case 5:
      percentages = [ENV.PRIZE_5P_FIRST, ENV.PRIZE_5P_SECOND, ENV.PRIZE_5P_THIRD, ENV.PRIZE_5P_FOURTH, ENV.PRIZE_5P_FIFTH];
      break;
    default:
      // Fallback para casos inesperados (usar distribución de 5 jugadores)
      percentages = [ENV.PRIZE_5P_FIRST, ENV.PRIZE_5P_SECOND, ENV.PRIZE_5P_THIRD, ENV.PRIZE_5P_FOURTH, ENV.PRIZE_5P_FIFTH];
      break;
  }

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
      
      console.log(` Position ${positions.join(',')} (${positions.length} players): ${prizePerPlayer} coins each (${(accumulatedPercentage * 100).toFixed(1)}% of pot)`);
    } else {
      // Posiciones fuera del premio
      positions.forEach(position => {
        distribution.set(position, 0);
      });
      
      console.log(` Position ${positions.join(',')}: 0 coins (no prize)`);
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

    console.log(` Game finalization processed for room ${roomId}`);
  }

  // ============================================
  // GENERAR PREGUNTAS ALEATORIAS
  // ============================================
  private generateRandomQuestions(count: number): QuestionData[] {
    const triviaBank = [
      // PREGUNTAS ORIGINALES (15)
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
      // PREGUNTAS NUEVAS (35 adicionales)
      {
        question: "¿En qué año se cayó el Muro de Berlín?",
        options: ["1987", "1989", "1991", "1993"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es la montaña más alta del mundo?",
        options: ["K2", "Everest", "Kilimanjaro", "Denali"],
        correctIndex: 1,
        category: "Geografía"
      },
      {
        question: "¿Quién escribió 'Don Quijote'?",
        options: ["Lope de Vega", "Miguel de Cervantes", "Garcilaso de la Vega", "Quevedo"],
        correctIndex: 1,
        category: "Literatura"
      },
      {
        question: "¿Cuál es la velocidad de la luz?",
        options: ["300.000 km/s", "200.000 km/s", "100.000 km/s", "400.000 km/s"],
        correctIndex: 0,
        category: "Ciencia"
      },
      {
        question: "¿En qué país nació Albert Einstein?",
        options: ["Austria", "Suiza", "Alemania", "Polonia"],
        correctIndex: 2,
        category: "Historia"
      },
      {
        question: "¿Cuál es el país más poblado del mundo?",
        options: ["India", "China", "Indonesia", "Estados Unidos"],
        correctIndex: 0,
        category: "Geografía"
      },
      {
        question: "¿Quién fue Napoleón Bonaparte?",
        options: ["Un artista francés", "Un militar francés", "Un escritor francés", "Un científico francés"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es el desierto más grande del mundo?",
        options: ["Sahara", "Gobi", "Kalahari", "Atacama"],
        correctIndex: 0,
        category: "Geografía"
      },
      {
        question: "¿En qué año llegó Cristóbal Colón a América?",
        options: ["1490", "1492", "1495", "1498"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es el animal más veloz del mundo?",
        options: ["Halcón peregrino", "Guepardo", "Pez vela", "Gacela"],
        correctIndex: 0,
        category: "Naturaleza"
      },
      {
        question: "¿Quién fue Vincent van Gogh?",
        options: ["Un escultor neerlandés", "Un pintor neerlandés", "Un arquitecto neerlandés", "Un poeta neerlandés"],
        correctIndex: 1,
        category: "Arte"
      },
      {
        question: "¿Cuántos huesos tiene el cuerpo humano adulto?",
        options: ["186", "206", "226", "246"],
        correctIndex: 1,
        category: "Biología"
      },
      {
        question: "¿Cuál es el país con más islas?",
        options: ["Indonesia", "Filipinas", "Suecia", "Noruega"],
        correctIndex: 0,
        category: "Geografía"
      },
      {
        question: "¿En qué año se fundó la ONU?",
        options: ["1943", "1945", "1947", "1949"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es el símbolo químico del oro?",
        options: ["Au", "Ag", "Fe", "Cu"],
        correctIndex: 0,
        category: "Química"
      },
      {
        question: "¿Quién escribió 'Romeo y Julieta'?",
        options: ["Christopher Marlowe", "William Shakespeare", "Ben Jonson", "John Webster"],
        correctIndex: 1,
        category: "Literatura"
      },
      {
        question: "¿Cuál es la capital de Japón?",
        options: ["Osaka", "Tokio", "Kioto", "Yokohama"],
        correctIndex: 1,
        category: "Geografía"
      },
      {
        question: "¿En qué continente se encuentra Marruecos?",
        options: ["Asia", "Europa", "África", "Oceanía"],
        correctIndex: 2,
        category: "Geografía"
      },
      {
        question: "¿Cuál es el órgano más grande del cuerpo humano?",
        options: ["Corazón", "Hígado", "Piel", "Cerebro"],
        correctIndex: 2,
        category: "Biología"
      },
      {
        question: "¿Quién fue el primer hombre en pisar la Luna?",
        options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es el gas más abundante en la atmósfera terrestre?",
        options: ["Oxígeno", "Nitrógeno", "Argón", "Dióxido de carbono"],
        correctIndex: 1,
        category: "Ciencia"
      },
      {
        question: "¿En qué año comenzó la Primera Guerra Mundial?",
        options: ["1912", "1914", "1916", "1918"],
        correctIndex: 1,
        category: "Historia"
      },
      {
        question: "¿Cuál es la capital de Brasil?",
        options: ["Rio de Janeiro", "San Pablo", "Brasilia", "Salvador"],
        correctIndex: 2,
        category: "Geografía"
      },
      {
        question: "¿Cuántas cuerdas tiene una guitarra clásica?",
        options: ["5", "6", "7", "8"],
        correctIndex: 1,
        category: "Música"
      },
      {
        question: "¿Quién fue Marie Curie?",
        options: ["Una bióloga francesa", "Una física polaca", "Una química alemana", "Una astrónoma sueca"],
        correctIndex: 1,
        category: "Ciencia"
      },
      {
        question: "¿Cuál es el país más grande de América del Sur?",
        options: ["Argentina", "Perú", "Brasil", "Colombia"],
        correctIndex: 2,
        category: "Geografía"
      },
      {
        question: "¿En qué año se inventó la imprenta?",
        options: ["1440", "1445", "1450", "1455"],
        correctIndex: 0,
        category: "Historia"
      },
      {
        question: "¿Cuál es el idioma oficial de Brasil?",
        options: ["Español", "Portugués", "Inglés", "Francés"],
        correctIndex: 1,
        category: "Cultura"
      },
      {
        question: "¿Cuántos lados tiene un octágono?",
        options: ["6", "7", "8", "9"],
        correctIndex: 2,
        category: "Matemáticas"
      },
      {
        question: "¿Quién fue Cleopatra?",
        options: ["Una reina romana", "Una reina griega", "Una reina egipcia", "Una reina persa"],
        correctIndex: 2,
        category: "Historia"
      },
      {
        question: "¿Cuál es la moneda de México?",
        options: ["Bolívar", "Peso", "Real", "Córdoba"],
        correctIndex: 1,
        category: "Economía"
      },
    ];

    // Usar Fisher-Yates shuffle para una mejor aleatorización
    const shuffled = this.shuffleArray([...triviaBank]);
    const selectedQuestions = shuffled.slice(0, Math.min(count, triviaBank.length));

    return selectedQuestions.map((q, index) => ({
      questionId: `q_${Date.now()}_${index}_${Math.random()}`,
      questionText: q.question,
      options: q.options.map((optText, optIndex) => ({
        optionId: `opt_${Date.now()}_${index}_${optIndex}_${Math.random()}`,
        optionText: optText,
        optionOrder: optIndex + 1,
      })),
      timeLimit: ENV.TIME_PER_QUESTION,
      questionNumber: index + 1,
      totalQuestions: count,
    }));
  }

  // ============================================
  // SHUFFLE ARRAY (Fisher-Yates Algorithm)
  // ============================================
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
    console.log(` Game cancelled for room ${roomId}`);
  }
}

export default new GameManager();

