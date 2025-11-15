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

5. **Iniciar el servidor**
```
npm run dev
```