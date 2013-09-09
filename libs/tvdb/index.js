var parser	= new(require('xml2js')).Parser(),
	request	= require('request')
//	tvdb	= new (require('tvdb'))({apiKey: nconf.get('tvdb:apikey')}),
//	tvrage	= plugin('tvrage')



exports = module.exports = {
	
	update: function(){
		// Enhance each show record with additional TVDB data
		db.each("SELECT * FROM show WHERE status = 1 AND tvdb IS NOT NULL AND imdb IS NULL", function(error, show){
			if (error) console.error(error);
			request.get('http://thetvdb.com/api/'+nconf.get('tvdb:apikey')+'/series/'+show.tvdb+'/all/en.xml', function(error, req, xml){
				parser.parseString(xml, function(error, json){
					if (error) return;					
					var data = json.Data.Series[0];
					var record = {
						id: show.tvdb,
						name: data.SeriesName[0],
						synopsis: data.Overview[0],
						imdb: data.IMDB_ID[0]
					};
					db.run("UPDATE show SET name = ?, synopsis = ?, imdb = ? WHERE tvdb = ?", record.name, record.synopsis, record.imdb, record.id);
				});
			});
		});
	}
	
	
};