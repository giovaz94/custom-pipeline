FROM node:20-alpine

WORKDIR /usr/src/app
COPY ./package.json ./
COPY ./tsconfig.json ./
COPY ecosystem.config.js ./
COPY ./src ./src

RUN ls -al
RUN npm install
RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --verbose --only=production
COPY --from=0 /usr/src/app .

RUN npm install pm2 -g
EXPOSE 8010

CMD ["pm2-runtime", "ecosystem.config.js"]