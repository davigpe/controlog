import { createApp } from '../src/app.js';

// Serverless Function da Vercel — o mesmo app Express de sempre, só que
// exportado como handler em vez de escutar uma porta (não existe processo
// persistente em serverless). O vercel.json reescreve todo path pra cá; o
// Express continua roteando /health e /api/* internamente, sem mudar nada.
export default createApp();
