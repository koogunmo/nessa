var socket = io.connect('localhost:3000', {
	'connect timeout': 2000,
	'max reconnection attempts': 5,
	'sync disconnect on unload': true
});

socket.on('hello', function(data){
	console.log(data);
});