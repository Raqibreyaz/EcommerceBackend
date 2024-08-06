import dotenv from 'dotenv'
import { connectToDatabase } from "./db/db-connection.js";

dotenv.config({ path: "./.env" })

import app from "./app.js";

const port = process.env.PORT || 4000;

connectToDatabase().then(() => {
    app.listen(port, () => {
        console.log(`server is running on port ${port}`);
    }
    )
})

