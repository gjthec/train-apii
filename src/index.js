import 'dotenv/config';

import { app } from './app.js';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Train API rodando em http://localhost:${PORT}`));
