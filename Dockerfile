FROM oven/bun:alpine

WORKDIR /app

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "start"]
