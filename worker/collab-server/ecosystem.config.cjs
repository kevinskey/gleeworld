// pm2 entry for the collaboration server. Deployed at
// /opt/gleeworld-collab on the droplet; see README.md.
module.exports = {
  apps: [{
    name: 'gleeworld-collab',
    script: 'index.js',
    cwd: '/opt/gleeworld-collab',
    instances: 1,
    // Yjs state is held in memory per open document, so this CANNOT be
    // cluster-moded — two workers would each hold a different copy of the
    // same document and never reconcile.
    exec_mode: 'fork',
    max_memory_restart: '600M',
    env: {
      NODE_ENV: 'production',
      COLLAB_PORT: '1234',
    },
  }],
};
