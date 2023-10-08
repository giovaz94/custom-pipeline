import express, { Express, Request, Response , Application } from 'express';
import { DB } from './db/database';

const app: Application = express();
const port: string | 3200 = process.env.PORT || 3200;
const db = new DB();

app.use(express.json());

app.get('/', async (req: Request, res: Response) => {
    res.status(200).send("Hello World!");
});

app.listen(port, () => {
    console.log(`Database service launched ad http://localhost:${port}`);
});