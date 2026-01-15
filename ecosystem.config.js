module.exports = {
  apps: [
    {
      name: "i24-countdown-prod",
      script: "npm",
      args: "run pm2:build-and-start",
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // This will build first, then start
      pre_start: "npm run build",
    },
    {
      name: "i24-countdown-dev",
      script: "npm",
      args: "run dev",
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
    },
  ],
}
