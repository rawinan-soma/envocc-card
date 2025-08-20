FROM oven/bun:1

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lockb* ./

RUN bun install

COPY . .

RUN sed -i '/DATABASE_URL=/d' .env

RUN echo '\n' >> .env 

RUN echo 'DATABASE_URL="postgres://postgres:root@envocc-services-db/envocc-card?schema=public"' >> .env

RUN sed -i '/SERVER_PORT=/d' .env

RUN cat .env

RUN bunx prisma generate

RUN bun run build

# RUN ls -la dist/src/ || echo "No dist folder"

EXPOSE 3000

CMD ["bun", "run", "start:prod"]