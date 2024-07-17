module.exports = {
    apps: [{
        name: 'entrypoint',
        script: './dist/index.js',
        instances: 'max',
        exec_mode: 'cluster',
        watch: false,
        max_memory_restart: '200M',
        kill_timeout: 30000
    }]
};