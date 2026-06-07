import app from './app.js';
import { config } from './config.js';

if (process.env.VERCEL !== '1') {
  app.listen(config.port, () => {
    console.log(`Chengying API is running at http://localhost:${config.port}`);
  });
}

export default app;
