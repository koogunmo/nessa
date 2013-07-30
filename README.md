# Nessa for Node
Automated TV Torrent grabber for Shows & Movies

## System Requirements

- Linux/OS X
- Node.js 0.10.x
- Transmission with RPC Enabled
- Plenty of storage space

## "Optional" Third-party software
Nessa doesn't handle uPNP/AV (yet), so you'll need a MediaServer to stream your content. I've used the following, with various degrees of success

- [minidlna](minidlna.sourceforge.net) (Open-source)
- [Twonky 7](http://twonky.com/downloads) (Commercial)


## Running nessa

> /usr/bin/node /path/to/nessa/server.js

You can then access the interface at [http://localhost:6377](http://localhost:6377)  
Alternatively, you could use a reverse proxy like nginx on port 80:

	server {
		listen 80;
		root /opt/nessa;
		index index.html index.htm;
		server_name _;
		location / {
		        proxy_pass http://localhost:6377;
		        proxy_http_version 1.1;
		        proxy_set_header Upgrade $http_upgrade;
		        proxy_set_header Connection "upgrade";
		        proxy_set_header Host $host;
		}
	}

## Project Goal

To build a system that functions in a similar manner to SickBeard, using torrents only.
UI should be responsive, and use AJAX for content changes, etc

### Phase 1
- ~~Populate a database of known shows~~
	- (We're piggybacking TVShowsApp's XML feeds for now)
	- ~~Retrieve TVRage and TVDB data per show~~
		- TVDB: Full title, Synopsis, IMDB ID
		- TVRage: ID
	- Poll for updates weekly
- ~~Scan local filesystem for directories~~
	- ~~Match show with database entry, flag as enabled~~
		- ~~Retrieve episode listings from TVRage~~
- ~~Scan show directories for episodes~~
	- ~~Update database and rename episode file if necessary~~
		- (Default format: [BASEDIR]/[SHOWNAME]/Season ##/Episode ## - Title.ext)
	- Flag episodes as available
- Schedule for grabbing torrents/magnets
	- (Again, we're using TVShowsApp's feed for this)
	- Parse and reformat the magnet link to add a few extra trackers
	- Automatically add to Transmission
		- Copy and rename when download completes
		- Delete from Transmission directory when seeding is complete

At this point, Nessa will be capable of running 24/7, but limited to downloading new episodes of existing shows only.

### Phase 2
- ~~Automatic update by schedule~~
	- Pulls latest version from Github then sends SIGUSR2
- Build responsive HTML5 interface
	- Need to find a good templating system (Any suggestions?)
	- MUST work on mobile devices (iPad/iPhone)
		- Mobile-first approach
	- Use Socket.IO
- Browse show list
	- Seasons, Episodes - Flag available/missing/downloading
- Add new show via web
	- Use existing shows database
		- Create folder using show name
	- Pick the episode to start from (or next available)
	- Start downloading

### Phase 3
- Twilio for SMS download notifications
- Global Settings interface
	- File/Folder formatting
	- Global Quality Preference (HD/SD)
- Show Settings
	- As per Global Settings
	- SMS Notifications on/off

### Phase 4
- Ants. Ants EVERYWHERE!
- Simple torrent management?
- Setup wizard

### Phase 5
- Implement uPNP/DLNA MediaServer?
	- Removes dependency on Twonky
		- Need to find/write a good uPnP/AV module?

## Acknowledgments

Nessa utilises the following third-party data sources:

- [TVShowsApp](http://tvshowsapp.com): If you like our software, please donate to them so they can keep up their fantastic work.
- [The TVDB](http://thetvdb.com): Extended show information and artwork
- [TV Rage](http://www.tvrage.com): Episode data

## Disclaimer

The authors of this software not condone, or approve of the illegal downloading and/or sharing of copyrighted material. You, the end user, are solely responsible for any legal actions against you that may occur as a result of using this software.

---

## Helpful RegExp

Standard Episodic Content

	^(.*?)\.S?(\d{1,2})[Ex]?(\d{2})\.(.*)$  
	0. Name, 1. Season, 2. Episode, 3. Everything else
	
Daily Shows

	^(.*?)\.(\d{4})\.(\d{2})\.(\d{2})\.(.*)$  
	0. Name, 1. Year, 2. Month, 3. Day, 4. Everything Else

Specials

	^(.*?)\.(\d)of(\d).(\w+)

"Everything Else":
	
	(Episode Name || Guest)?.(REPACK || PROPER).(720p || HDTV).(x264 || XviD)
