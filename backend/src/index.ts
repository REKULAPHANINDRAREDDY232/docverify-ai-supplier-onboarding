import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`DocVerify AI API listening on port ${env.PORT}`);
});
