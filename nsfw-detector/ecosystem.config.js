module.exports = {
    apps: [{
        name: 'entrypoint',
        script: './dist/index.js',
        instances: 1,
        exec_mode: 'cluster',
        watch: false,
        kill_timeout: 600000
    }]
};