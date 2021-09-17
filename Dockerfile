FROM node:alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./
COPY .yarn ./
COPY .pnp.cjs ./
COPY .yarnrc.yml ./


RUN yarn install

# Bundle app source
COPY . .

RUN yarn build

CMD [ "yarn", "start" ]