# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Sem --omit=dev: o build é `tsc -b && vite build`, e tanto o TypeScript
# quanto o Vite são devDependencies.
RUN npm ci
COPY . .

# Vazio de propósito. Sem VITE_API_URL o cliente usa /api relativo e o nginx
# deste mesmo contêiner encaminha para a API — o bundle deixa de ficar preso
# a um domínio escolhido no build. Só preencha se o frontend for servido num
# host diferente da API (por exemplo, em S3 + CloudFront).
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
