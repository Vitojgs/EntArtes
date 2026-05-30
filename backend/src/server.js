import { buildApp } from "./app.js";
import { startPedidoAulaScheduler } from "./services/pedidocoaching.scheduler.js";

const app = await buildApp({ logger: true });
const port = Number(process.env.PORT) || 3000;

startPedidoAulaScheduler();

app.listen({ port, host: '0.0.0.0' })
  .then(() => console.log(`Servidor a correr na porta ${port}`))
  .catch(err => {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  });
