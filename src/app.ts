import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { languageMiddleware } from './middlewares/language.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Detectar idioma del request
app.use(languageMiddleware);

app.use('/api', routes);
app.use(errorHandler);

export default app;
