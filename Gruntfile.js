module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-tsd');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.config.init(grunt.file.readJSON('./config/grunt.config.json'));
    grunt.task.loadTasks('grunt-tasks');

    grunt.registerTask('jasmine', function() {
        var done = this.async();
        var Jasmine = require('jasmine');
        var jasmine = new Jasmine();
        jasmine.loadConfigFile('config/jasmine.config.json');
        jasmine.onComplete(function(passed) {
            if (!passed) {
                grunt.log.error('Jasmine specs failed');
            }
            done();
        });
        jasmine.execute();
    });

    grunt.registerTask('build', ['ts:build']);
    grunt.registerTask('run', []);
    grunt.registerTask('test', ['build', 'jasmine']);
};
