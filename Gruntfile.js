module.exports = function(grunt){
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		
		watch: {
			compass: {
				files: ['app/assets/css/scss/*.{scss,sass}'],
				tasks: ['sass:dev']
			},
		},
		
		compass: {
			dev: {
				options: {
					sassDir: ['app/assets/css/scss'],
					cssDir: ['app/assets/css'],
					outputStyle: 'compressed',
					environment: 'development'
				}
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
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-sass');
	
	grunt.registerTask('default', ['sass','watch']);
	
};