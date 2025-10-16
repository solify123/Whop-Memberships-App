module.exports = {
  apps: [
    {
      name: "whop-backend",
      script: "src/server.ts",
      interpreter: "node",
      node_args: ["-r", "ts-node/register/transpile-only"],
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: "3000",
      },
    },
    {
      name: "whop-updater",
      script: "src/updater.ts",
      interpreter: "node",
      node_args: ["-r", "ts-node/register/transpile-only"],
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};


