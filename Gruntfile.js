module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		
		concurrent: {
			build: ['sass'],
			run: {
				tasks: ['watch'], //'nodemon'],
				options: {
					logConcurrentOutput: true
				}
			}
		},
		nodemon: {
			dev: {}
		},
		release: {
			options: {
				npm: false
			}
		},
		sass: {
			dev: {
				options: {
					style: 'compressed'
				},
				files: [{
					expand: true,
					cwd: 'app/assets/css/scss',
					src: ['*.scss'],
					dest: 'app/assets/css',
					ext: '.min.css'
				}]
			}
		},
		watch: {
			sass: {
				files: ['app/assets/css/scss/*.{scss,sass}'],
				tasks: ['sass:dev']
			},
		}
	});
	
	grunt.loadNpmTasks('grunt-concurrent');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-nodemon');
	grunt.loadNpmTasks('grunt-release');
	
//	grunt.registerTask('default', ['sass','nodemon','watch']);
	grunt.registerTask('default', ['concurrent']);
	
};