module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		
		concurrent: {
			build: ['sass'],
			run: {
				tasks: ['watch','nodemon'],
				options: {
					logConcurrentOutput: true
				}
			}
		},
		watch: {
			sass: {
				files: ['app/assets/css/scss/*.{scss,sass}'],
				tasks: ['sass:dev']
			},
		},
		nodemon: {
			dev: {}
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
		}
	});
	
	grunt.loadNpmTasks('grunt-concurrent');
	grunt.loadNpmTasks('grunt-nodemon');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-watch');
	
//	grunt.registerTask('default', ['sass','nodemon','watch']);
	grunt.registerTask('default', ['concurrent']);
	
};