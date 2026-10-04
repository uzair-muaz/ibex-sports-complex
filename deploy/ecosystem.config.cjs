/**
 * PM2 process file for IBEX Sports Complex (staging / VPS).
 *
 * Usage (from repo root):
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 reload deploy/ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "ibex-sports-complex",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3000",
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
