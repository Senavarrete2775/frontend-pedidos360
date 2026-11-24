# Etapa 1: compilación de Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# URLs que quedan fijas en el build (se reemplazan en src/environments/environment.ts)
ARG API_BASE_URL=http://localhost:8080
ARG RABBIT_ADMIN_URL=http://localhost:8082
ARG KAFKA_ADMIN_URL=http://localhost:8083
ARG NOTIFICACIONES_URL=http://localhost:8081
ARG REDIRECT_URI=http://localhost:4200
RUN sed -i \
    -e "s|apiBaseUrl: '[^']*'|apiBaseUrl: '${API_BASE_URL}'|" \
    -e "s|rabbitAdminApiUrl: '[^']*'|rabbitAdminApiUrl: '${RABBIT_ADMIN_URL}'|" \
    -e "s|kafkaAdminApiUrl: '[^']*'|kafkaAdminApiUrl: '${KAFKA_ADMIN_URL}'|" \
    -e "s|notificacionesApiUrl: '[^']*'|notificacionesApiUrl: '${NOTIFICACIONES_URL}'|" \
    -e "s|redirectUri: '[^']*'|redirectUri: '${REDIRECT_URI}'|" \
    src/environments/environment.ts
RUN npx ng build

# Etapa 2: servidor Node (Angular SSR)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/frontend-pedidos360-tnt/server/server.mjs"]
