# 🎮 GameHub - Plataforma de Juegos Competitivos Multijugador

**GameHub** es una plataforma de juegos competitivos en tiempo real donde los usuarios apuestan monedas virtuales para competir entre sí. El juego inicial es **Trivia Showdown**: de 2 a 5 jugadores responden 10 preguntas de cultura general en 15 segundos cada una, compitiendo por el pozo acumulado.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#️-tecnologías)
- [Arquitectura](#️-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Flujo del Juego](#-flujo-del-juego)
- [Seguridad y Roles](#-seguridad-y-roles)
- [Socket.IO Eventos](#-socketio-eventos)
- [Sistema de Premios](#-sistema-de-premios)

---

## ✨ Características

### **Autenticación y Seguridad**
- ✅ Registro e inicio de sesión con email/password
- ✅ Autenticación JWT con tokens de 7 días
- ✅ Hash de contraseñas con Bcrypt (10 rounds)
- ✅ **Sistema de roles** (USER / ADMIN)
- ✅ **Protección de endpoints por rol**
- ✅ Validación de datos con Zod

### **Sistema de Juego**
- ✅ Salas de 2 a 5 jugadores
- ✅ Apuestas de 10 a 1,000 monedas virtuales
- ✅ 10 preguntas de trivia por partida
- ✅ 15 segundos por pregunta
- ✅ Countdown de 30 segundos antes de iniciar
- ✅ Sistema de puntos con bonus por velocidad
- ✅ Distribución de premios escalable según jugadores

### **Comunicación en Tiempo Real**
- ✅ WebSockets con Socket.IO
- ✅ Sincronización de salas y jugadores
- ✅ Countdown en tiempo real
- ✅ Preguntas y respuestas sincronizadas
- ✅ Resultados instantáneos

### **Base de Datos y Persistencia**
- ✅ PostgreSQL con Prisma ORM
- ✅ Transacciones atómicas para apuestas y premios
- ✅ Historial completo de partidas
- ✅ Estadísticas de usuario
- ✅ Sistema de transacciones (BET, WIN, REFUND)

---

## 🛠️ Tecnologías

### **Backend**

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **Node.js** | 20.x | Runtime de JavaScript |
| **TypeScript** | 5.x | Tipado estático |
| **Express.js** | 4.x | Framework web |
| **Socket.IO** | 4.x | WebSockets en tiempo real |

### **Base de Datos**

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **PostgreSQL** | 16-alpine | Base de datos relacional |
| **Prisma ORM** | 5.x | ORM moderno con type-safety |
| **Docker** | - | Containerización de PostgreSQL |

### **Autenticación y Seguridad**

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **JWT** | 9.x | Autenticación stateless |
| **Bcrypt** | 5.x | Hash de contraseñas |
| **Zod** | 3.x | Validación de schemas |

### **Utilidades**

| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **dotenv** | 16.x | Variables de entorno |
| **ts-node** | 10.x | Ejecutar TypeScript directamente |
| **nodemon** | 3.x | Hot-reload en desarrollo |

---

## 🏗️ Arquitectura

### **Patrón de Arquitectura**

- **Screaming Architecture**: Nombres descriptivos de carpetas/archivos
- **Modular**: Cada módulo con lógica aislada
- **Separación de responsabilidades**: Controller → Service → Database
- **Type-safe**: TypeScript en todo el proyecto

### **Estructura del Proyecto**
```
GameHub/
├── prisma/
│   ├── schema.prisma          # Modelos de base de datos
│   ├── migrations/            # Migraciones SQL
│   └── seeders/
│       └── seed.ts            # Datos iniciales (10 users + 1 admin)
│
├── src/
│   ├── config/                # Configuraciones globales
│   │   ├── environment.config.ts        # Variables de entorno
│   │   ├── prisma-client.config.ts      # Cliente de Prisma
│   │   ├── express-server.config.ts     # Servidor Express
│   │   ├── application-routes.config.ts # Rutas principales
│   │   └── socketio-server.config.ts    # Socket.IO setup
│   │
│   ├── middleware/            # Middlewares globales
│   │   ├── authentication.middleware.ts      # Validar JWT ✅
│   │   ├── authorization-role.middleware.ts  # Verificar roles ✅
│   │   ├── request-validation.middleware.ts  # Validar con Zod
│   │   └── error-handler.middleware.ts       # Manejo de errores
│   │
│   ├── modules/               # Módulos de negocio
│   │   ├── authentication/    # Login, Registro, Perfil
│   │   ├── users/             # Gestión de usuarios (ADMIN only)
│   │   ├── game-rooms/        # Gestión de salas
│   │   ├── player-transactions/ # Apuestas y premios
│   │   ├── game-sessions/     # Registro y control del ciclo de vida de cada partida en BD
│   │   ├── game-history/      # Historial de partidas
│   │   └── health-check/      # Health check endpoint
│   │
│   ├── websockets/            # Lógica de Socket.IO
│   │   ├── handlers/          # Event handlers
│   │   ├── socketio-manager.ts     # Gestión de salas en memoria
│   │   └── game-manager.ts         # Lógica del juego ⭐
│   │
│   ├── shared/                # Código compartido
│   │   ├── types/             # Tipos e interfaces
│   │   └── utils/         # Utilidades (JWT, Hash, etc)
│   │
│   └── main.ts                # Punto de entrada
│
├── .env                       # Variables de entorno
├── .env.example               # Ejemplo de variables
├── docker-compose.yaml        # PostgreSQL container
├── package.json
└── tsconfig.json
```

---

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 18.x ([Descargar](https://nodejs.org/))
- **Docker** y **Docker Compose** ([Descargar](https://www.docker.com/))
- **Git** ([Descargar](https://git-scm.com/))
- **PostgreSQL** 15+ (opcional si usas Docker)

---

## 🚀 Instalación

### **1. Clonar el Repositorio**
```bash
git clone https://github.com/0RLAND0-AV/GameHub.git
cd GameHub-Backend
```

### **2. Instalar Dependencias**
```bash
npm install
```

### **3. Configurar Variables de Entorno**

Copia el archivo de ejemplo y configura tus valores:
```bash
cp .env.example .env
```

### **4. Iniciar PostgreSQL con Docker**
```bash
# Iniciar contenedor de PostgreSQL
docker-compose up -d

# Verificar que está corriendo
docker ps
```

### **5. Configurar Prisma y Base de Datos**
```bash
# Generar cliente de Prisma
# Aplicar migraciones
# Cargar datos iniciales (10 usuarios + 1 admin)
npm run db:setup

```

### **6. Iniciar el Servidor**
```bash
# Modo desarrollo (con hot-reload)
npm run dev

# El servidor estará en http://localhost:3000
```

### **7. Probar la Aplicación**

Abre `test-client.html` en **dos navegadores diferentes**:

1. **Navegador 1**: Inicia sesión con `player1@test.com` / `password123`
2. **Navegador 2**: Inicia sesión con `player2@test.com` / `password123`
3. Con player1, crea una sala
4. Con player2, únete a la sala
5. ¡Juega Trivia Showdown! 🎮

---




## 🎮 Flujo del Juego

### **1. Registro e Inicio de Sesión**
```
Usuario → POST /api/auth/register
    ↓
Validación con Zod (RegisterSchema)
    ↓
Hash de password con Bcrypt (10 rounds)
    ↓
Crear usuario en BD (Prisma)
    ↓
Crear UserStats iniciales
    ↓
Generar JWT token (válido 7 días)
    ↓
Retornar token + datos del usuario
```

**Datos iniciales del usuario:**
- 100 monedas virtuales
- Rol: USER (por defecto)
- Estadísticas en 0

### **2. Crear/Unirse a una Sala**
```javascript
// Crear sala
socket.emit('room:create', {
  userId: "user_123",
  username: "player1",
  gameTypeId: "trivia-showdown",
  betAmount: 50  // Entre 10 y 1,000
});

// Unirse a sala
socket.emit('room:join', {
  roomId: "room_abc",
  userId: "user_456",
  username: "player2"
});
```

### **3. Countdown (30 segundos)**

Cuando se alcanzan 2 jugadores:
- Estado: `WAITING` → `COUNTDOWN`
- Emite `countdown:started` con 30 segundos
- Cada segundo emite `countdown:tick`
- Otros jugadores pueden unirse (hasta 5 total)
- Al llegar a 0, inicia el juego

### **4. Inicio del Juego**
```
1. Verificar fondos de cada jugador
2. Deducir apuestas (transacción BET)
3. Cambiar estado a IN_PROGRESS
4. Emitir game:started
5. Mostrar primera pregunta tras 3 segundos
```

### **5. Preguntas y Respuestas**

- 10 preguntas de trivia
- 15 segundos por pregunta
- Sistema de puntos:
```
  speedBonus = (15 - responseTime) × 2
  pointsEarned = 10 + speedBonus
```
- Ejemplo: Responder en 5s = **30 puntos**

### **6. Finalización y Premios**
```
1. Calcular ranking final
2. Distribuir premios según posición
3. Actualizar balances (transacción WIN)
4. Guardar historial de partida
5. Actualizar estadísticas de usuarios
6. Emitir resultados finales
```

---

## 🔐 Seguridad y Roles

### **Sistema de Roles**

GameHub implementa dos roles:

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **USER** | Usuario estándar | Jugar, ver su perfil, crear salas |
| **ADMIN** | Administrador | Todo lo de USER + gestionar usuarios |

### **Protección de Endpoints**

#### **1. Middleware de Autenticación**

**Archivo**: `src/middleware/authentication.middleware.ts`
```typescript
export const authenticateToken = (req, res, next) => {
  // 1. Extraer token del header Authorization
  const token = extractTokenFromHeader(req.headers['authorization']);
  
  // 2. Verificar y decodificar token
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // 3. Adjuntar usuario a request
  req.user = {
    userId: decoded.userId,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role  // 'USER' o 'ADMIN'
  };
  
  next();
};
```

#### **2. Middleware de Autorización por Roles**

**Archivo**: `src/middleware/authorization-role.middleware.ts`
```typescript
export const authorizeRole = (...allowedRoles: UserRole[]) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        ok: false,
        message: 'Forbidden: Insufficient permissions' 
      });
    }
    next();
  };
};
```

### **Ejemplos de Uso**

#### **Endpoint Protegido (Solo Autenticado)**
```typescript
router.get('/profile', 
  authenticateToken,  // ✅ Cualquier usuario autenticado
  controller.getProfile
);
```

### **Endpoints por Rol**

#### **Públicos (Sin autenticación)**
```http
POST /api/auth/register      # Registro
POST /api/auth/login         # Login
GET  /api/health      # Health check
GET api/auth/users
GET api/auth/verify
```

#### **USER (Autenticado)**
```http
GET    /api/auth/profile     # Ver mi perfil
GET    /api/game-history     # Mi historial
GET    /api/transactions     # Mis transacciones
GET     /api/transactions/my-balance
GET     /api/transactions/my-transactions?page=1&limit=10
GET     /api/transactions/check-funds?amount=100
GET     /api/transactions/my-summary
```

#### **ADMIN (Solo administradores)**
```http
GET    /api/users            # Listar todos los usuarios
```


---

## 🔌 Socket.IO Eventos

### **Conexión**
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'tu_jwt_token_aqui'
  }
});
```

### **Eventos Cliente → Servidor**

| Evento | Parámetros | Descripción |
|--------|-----------|-------------|
| `room:create` | `{ userId, username, gameTypeId, betAmount }` | Crear sala |
| `room:join` | `{ roomId, userId, username }` | Unirse a sala |
| `room:leave` | `{ roomId, userId }` | Salir de sala |
| `rooms:list` | - | Listar salas disponibles |
| `player:answer` | `{ roomId, userId, questionId, selectedOptionId, responseTimeSeconds }` | Responder pregunta |

### **Eventos Servidor → Cliente**

| Evento | Datos | Descripción |
|--------|-------|-------------|
| `room:created` | `{ roomId }` | Sala creada exitosamente |
| `player:joined` | `{ roomId, currentPlayers, maxPlayers, totalPot }` | Jugador se unió |
| `countdown:started` | `{ secondsRemaining: 30 }` | Countdown iniciado |
| `countdown:tick` | `{ secondsRemaining }` | Cada segundo del countdown |
| `game:started` | `{ roomId }` | Juego iniciado |
| `question:displayed` | `QuestionData` | Nueva pregunta mostrada |
| `question:results` | `{ questionId, correctOptionId, playerResults }` | Resultados de pregunta |
| `game:finished` | `{ roomId, finalRanking, totalPot }` | Juego finalizado |
| `error` | `{ message, code }` | Error |

---

## 💰 Sistema de Premios

### **Distribución Escalable por Jugadores**

El sistema adapta los premios según el número de jugadores:

#### **2 Jugadores (Winner Takes Most)**

| Posición | Porcentaje | Ejemplo (100 coins) | Balance Final* |
|----------|-----------|---------------------|----------------|
| 1ro | 80% | 80 coins | 130 (+30) 🎉 |
| 2do | 20% | 20 coins | 70 (-30) 😢 |

#### **3 Jugadores (Top 2 Recompensados)**

| Posición | Porcentaje | Ejemplo (150 coins) | Balance Final* |
|----------|-----------|---------------------|----------------|
| 1ro | 60% | 90 coins | 140 (+40) 🎉 |
| 2do | 30% | 45 coins | 95 (-5) 😐 |
| 3ro | 10% | 15 coins | 65 (-35) 😢 |

#### **4 Jugadores (Top 3 Recompensados)**

| Posición | Porcentaje | Ejemplo (200 coins) | Balance Final* |
|----------|-----------|---------------------|----------------|
| 1ro | 50% | 100 coins | 150 (+50) 🎉 |
| 2do | 30% | 60 coins | 110 (+10) 😊 |
| 3ro | 20% | 40 coins | 90 (-10) 😐 |
| 4to | 0% | 0 coins | 50 (-50) 😢 |

#### **5 Jugadores (Top 4 Recompensados)**

| Posición | Porcentaje | Ejemplo (250 coins) | Balance Final* |
|----------|-----------|---------------------|----------------|
| 1ro | 40% | 100 coins | 150 (+50) 🎉 |
| 2do | 30% | 75 coins | 125 (+25) 😊 |
| 3ro | 20% | 50 coins | 100 (±0) 😐 |
| 4to | 10% | 25 coins | 75 (-25) 😟 |
| 5to | 0% | 0 coins | 50 (-50) 😢 |

\* *Asumiendo balance inicial de 100 coins y apuesta de 50*

### **Manejo de Empates**

Si dos o más jugadores empatan, el sistema:
1. Suma los porcentajes de las posiciones empatadas
2. Divide equitativamente entre los jugadores

**Ejemplo**: 2 jugadores empatan en 1er lugar (3 jugadores total)
```
Porcentajes: 60% + 30% = 90%
Premio por jugador: 90% / 2 = 45% cada uno
```

---


## 👥 Usuarios de Prueba

El seeder crea automáticamente:

| Email | Password | Rol | Coins |
|-------|----------|-----|-------|
| `admin@gamehub.com` | `admin123` | ADMIN | 10,000 |
| `player1@test.com` | `password123` | USER | 100 |
| `player2@test.com` | `password123` | USER | 100 |
| `player3@test.com` | `password123` | USER | 100 |
| `player4@test.com` | `password123` | USER | 100 |
| `player5@test.com` | `password123` | USER | 100 |
| `player6@test.com` | `password123` | USER | 100 |
| `player7@test.com` | `password123` | USER | 100 |
| `player8@test.com` | `password123` | USER | 100 |
| `player9@test.com` | `password123` | USER | 100 |
| `player10@test.com` | `password123` | USER| 100 |


