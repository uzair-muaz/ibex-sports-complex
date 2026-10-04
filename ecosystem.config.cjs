/** PM2 process file for the staging Next.js server. */
module.exports = {
  apps: [
    {
      name: "ibex-staging-next",
      cwd: "/home/ubuntu/ibex-sports-complex",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "700M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
