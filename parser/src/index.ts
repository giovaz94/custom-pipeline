import express, { Express, Request, Response , Application } from 'express';

const app: Application = express();
const port: string | 8000 = process.env.PORT || 8000;

app.get('/', (req: Request, res: Response) => {
    res.send('Test request  ');
});

app.listen(port, () => {
    console.log(`Message parser launched at http://localhost:${port}`);
});


