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

## File formatting

We use a human-readable format for directories and filenames.
	
	[Show Name]/Season ##/Episode ## - [Show Title].ext
Season and Episode numbers always have leading zeroes.

In the case of multipart episodes, the format is expanded
	
	[Show Name]/Season ##/Episode ##-## - [Part 1 Title; Part 2 Title].ext
For example:

	Falling Skies/Season 01/Episode 01-02 - Live and Learn; The Armory.avi

## RegExp

We use the following Regular Expressions to detect the Season/Episode numbers in the filenames.
We welcome any improvements you can suggest!

### Episodic content
	
	(S|Season)?\s?(\d{1,2})[\/\s]?(E|Episode|x)?\s?([\d\-]{2,})

Which supports the following formats:
	
	Season 01/Episode 02
	Season 01/Episode 02-03
	S01E02
	S01E02-03
	1x02
	1x02-03
It does *NOT* support:

	S01E02E03
but it does need to be added at some point.

Any episodes which are similar to:	

	102
	10203
are ignored because that format is incredibly stupid.

### Daily Shows/Air-by-date

Shows that are aired daily (e.g The Colbert Report, The Daily Show, Conan) don't have season or episode numbers in the conventional sense.
	
	(\d{4})\D?(\d{2})\D?(\d{2})
Which will match:
	
	2013.08.01
	20130801
	
with any separator in place of the dot.

### Specials / Miniseries

We need to create expressions for miniseries

						
## Acknowledgments

Nessa utilises the following third-party data sources:

- [TVShowsApp](http://tvshowsapp.com): If you like our software, please donate to them so they can keep up their fantastic work.
- [The TVDB](http://thetvdb.com): Extended show information and artwork
- [TV Rage](http://www.tvrage.com): Episode data

## Licence

This software is distributed under a Modified BSD License. Please see LICENCE.txt for full details

## Disclaimer

The authors of this software not condone, or approve of the illegal downloading and/or sharing of copyrighted material. You, the end user, are solely responsible for any legal actions against you that may occur as a result of using this software.

