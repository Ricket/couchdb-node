module.exports = function (grunt) {
    "use strict";

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        jshint: {
            all: {
                options: {
                    jshintrc: "build/all.jshintrc"
                },
                src: ["src/**/*.js", "Gruntfile.js"]
            }
        },
        nodeunit: {
            all: ["test/**/*.js"]
        }
    });

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-nodeunit");
};
