FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# We will provide environment variables and mounts at runtime
CMD ["./node_modules/.bin/ts-node", "src/index.ts"]
