# GameHub

Proyecto final del curso de Desarrollo Backend de la SCESI.

## Tecnologías Usadas
- Node.js
- Socket.IO
- HTML, TypeScript
- PostgreSQL
- Express
- Sequelize
- JWT

## Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/0RLAND0-AV/GameHub.git
```

2. **Instalar dependencias**

```
npm install
```


3. **Configurar variables de entorno**

Crear un archivo .env y copiar el contenido de .env.example reemplzando por tus valores preferidos.

4. **Levantar la BD y realizar migraciones**
```
docker compose up -d
npm run db:setup   
```
el db:setup, hace que se ejecuten seeders, por lo que tenemos a 10 usuarios creados en la BD player#@test.com / password123

5. **Iniciar el servidor**
```
npm run dev
```

**Para hacer la prueba que funciona debemos abrir el archivo test-client.html en 2 navegadores distintos e iniciar sesion de usuario diferente en cada uno, en uno probamos con player1@test.com / password123. En el otro player2@test.com / password123**

Creamos una sala con el player 1, y nos unimos a la sala con el player 2.