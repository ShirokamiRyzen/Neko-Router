FROM oven/bun:alpine

WORKDIR /app

EXPOSE 3000

CMD ["bun", "src/index.ts"]
