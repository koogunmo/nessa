module.exports = function(grunt){
	grunt.initConfig({
		sass: {
			dist: {
				options: {
					style: 'expanded'
				},
				files: [{
					expand: true,
					cwd: 'assets/css',
					src: ['*.scss'],
					dest: 'assets/css',
					ext: '.css'
				}]
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-contrib-sass');
	
	grunt.registerTask('default', ['sass']);
	
	
	
};