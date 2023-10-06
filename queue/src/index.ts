import express, { Express, Request, Response , Application } from 'express';

const app: Application = express();
const port: string | 8010 = process.env.PORT || 8010;

app.use(express.json());

app.get('/', (_: Request, res: Response) => {
    res.status(200).send("Queue service is running!");
});



app.listen(port, () => {
    console.log(`Queue service launhed ad http://localhost:${port}`);
});
