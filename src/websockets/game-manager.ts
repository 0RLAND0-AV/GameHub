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

interface GameState {
  roomId: string;
  currentQuestionIndex: number;
  questions: QuestionData[];
  playerScores: Map<string, PlayerScore>;
  questionStartTime?: number;
  questionTimer?: NodeJS.Timeout;
  playerAnswers: Map<string, PlayerAnswerData>;
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

  // ============================================
  // INICIAR JUEGO
  // ============================================
  startGame(roomId: string, players: { userId: string; username: string }[]): void {
    console.log(`🎮 Initializing game for room ${roomId}`);

    // Generar preguntas aleatorias
    const questions = this.generateRandomQuestions(ENV.QUESTIONS_PER_GAME);

    // Inicializar puntajes de jugadores
    const playerScores = new Map<string, PlayerScore>();
    players.forEach(player => {
      playerScores.set(player.userId, {
        userId: player.userId,
        username: player.username,
        totalScore: 0,
        correctAnswers: 0,
      });
    });

    // Crear estado del juego
    const gameState: GameState = {
      roomId,
      currentQuestionIndex: 0,
      questions,
      playerScores,
      playerAnswers: new Map(),
    };

    this.games.set(roomId, gameState);

    // Iniciar primera pregunta después de 3 segundos
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

    // Verificar si hay más preguntas
    if (game.currentQuestionIndex >= game.questions.length) {
      this.finishGame(roomId);
      return;
    }

    // Limpiar respuestas de la pregunta anterior
    game.playerAnswers.clear();

    const currentQuestion = game.questions[game.currentQuestionIndex];
    game.questionStartTime = Date.now();

    const io = getSocketIOInstance();
    io.to(roomId).emit('question:displayed', currentQuestion);

    console.log(
      `📋 Question ${game.currentQuestionIndex + 1}/${game.questions.length} displayed in room ${roomId}`
    );

    // Timer automático para pasar a resultados
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

    // Verificar que no haya respondido ya
    if (game.playerAnswers.has(payload.userId)) {
      console.log(`⚠️ Player ${payload.userId} already answered`);
      return;
    }

    // Guardar respuesta
    game.playerAnswers.set(payload.userId, {
      userId: payload.userId,
      selectedOptionId: payload.selectedOptionId,
      responseTimeSeconds: payload.responseTimeSeconds,
      answeredAt: Date.now(),
    });

    console.log(
      `✅ Player ${payload.userId} answered in ${payload.responseTimeSeconds}s`
    );

    // Si todos respondieron, mostrar resultados inmediatamente
    const totalPlayers = game.playerScores.size;
    const answeredPlayers = game.playerAnswers.size;

    if (answeredPlayers === totalPlayers) {
      // Cancelar timer automático
      if (game.questionTimer) {
        clearTimeout(game.questionTimer);
        game.questionTimer = undefined;
      }
      // Mostrar resultados inmediatamente
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

    // Calcular resultados para cada jugador
    game.playerScores.forEach((playerScore, userId) => {
      const answer = game.playerAnswers.get(userId);
      
      let isCorrect = false;
      let pointsEarned = 0;
      let responseTime = ENV.TIME_PER_QUESTION; // Tiempo máximo si no respondió

      if (answer) {
        isCorrect = answer.selectedOptionId === correctOption.optionId;
        responseTime = answer.responseTimeSeconds;

        if (isCorrect) {
          // Calcular puntos: 10 base + bonus de velocidad
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

    // Ordenar por puntaje para mostrar ranking actual
    playerResults.sort((a, b) => b.totalScore - a.totalScore);

    const resultsPayload: QuestionResultsPayload = {
      questionId: currentQuestion.questionId,
      correctOptionId: correctOption.optionId,
      playerResults,
    };

    const io = getSocketIOInstance();
    io.to(roomId).emit('question:results', resultsPayload);

    console.log(`📊 Results sent for question ${game.currentQuestionIndex + 1}`);

    // Pasar a siguiente pregunta después de 5 segundos
    setTimeout(() => {
      if (game) {
        game.currentQuestionIndex++;
        this.displayNextQuestion(roomId);
      }
    }, 5000);
  }

  // ============================================
  // FINALIZAR JUEGO
  // ============================================
  private finishGame(roomId: string): void {
    const game = this.games.get(roomId);
    if (!game) return;

    console.log(`🏁 Game finished in room ${roomId}`);

    // Calcular ranking final
    const playersArray = Array.from(game.playerScores.values());
    playersArray.sort((a, b) => b.totalScore - a.totalScore);

    // Asignar posiciones y premios
    const finalRanking: FinalPlayerRanking[] = [];
    let currentPosition = 1;
    let previousScore = -1;

    playersArray.forEach((player, index) => {
      // Manejar empates
      if (player.totalScore !== previousScore) {
        currentPosition = index + 1;
      }
      previousScore = player.totalScore;

      const accuracy = game.questions.length > 0 
        ? (player.correctAnswers / game.questions.length) * 100 
        : 0;

      finalRanking.push({
        position: currentPosition,
        userId: player.userId,
        username: player.username,
        finalScore: player.totalScore,
        prizeWon: 0, // Lo calcularemos en FASE 4 con transacciones
        correctAnswers: player.correctAnswers,
        totalQuestions: game.questions.length,
        accuracy: Math.round(accuracy * 100) / 100,
      });
    });

    const resultsPayload: GameResultsPayload = {
      roomId,
      finalRanking,
      totalPot: 0, // Lo calcularemos en FASE 4
    };

    const io = getSocketIOInstance();
    io.to(roomId).emit('game:finished', resultsPayload);

    // Limpiar juego después de 30 segundos
    setTimeout(() => {
      this.games.delete(roomId);
      console.log(`🗑️ Game cleaned up for room ${roomId}`);
    }, 30000);
  }

  // ============================================
  // GENERAR PREGUNTAS ALEATORIAS (SIMULADAS)
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

    // Mezclar y tomar las primeras 'count' preguntas
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
    // Buscar en todos los juegos activos
    for (const game of this.games.values()) {
      const question = game.questions.find(q => q.questionId === questionId);
      if (question) {
        // La opción correcta siempre es la segunda (index 1) en nuestro banco simulado
        // En producción, esto vendría de la base de datos
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