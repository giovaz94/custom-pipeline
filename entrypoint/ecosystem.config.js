module.exports = {
    apps: [{
        name: 'entrypoint',
        script: './dist/index.js',
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        max_memory_restart: '200M',
        kill_timeout: 120000
    }]
};