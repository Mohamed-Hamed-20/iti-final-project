import server from "./app.controller";
import { database } from "./DB/database";
import { PORT } from "./config/env";

const port = PORT || 5002;

// Start the server after database connection
database
  .connect()
  .then(() => {
    server.listen(port, () =>
      console.log(`Server is running on port ${port}!`)
    );
  })
  .catch((err: Error) => {
    console.error("Database connection failed:", err.message);
  });
