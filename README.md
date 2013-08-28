# Nessa for Node
Automated TV Torrent grabber for Shows & Movies

## System Requirements

- Linux/OS X
- Node.js 0.10.x
- Transmission with RPC Enabled
- Plenty of storage space

## "Optional" Third-party software
Nessa doesn't handle uPNP/AV (yet), so you'll need a MediaServer if you want to stream your content. I've used the following, with various degrees of success

- [minidlna](minidlna.sourceforge.net) (Open-source)
- [Twonky 7](http://twonky.com/downloads) (Commercial)

These work reasonably well with VLC and my XBOX 360.

## Running nessa

> /usr/bin/node /path/to/nessa/server.js

You'll probably want to daemonize the process, I use [forever](https://github.com/nodejitsu/forever).

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

"Build a system that functions in a similar manner to SickBeard, but using torrents only."

I tried to use SickBeard, but it wouldn't easily let me arrange my files in a way I liked.  
It was also heavily skewed towards using newsgroups, which I don't use.

### Phase 1 - **COMPLETE**
- Populate a database of known shows
	- We're piggybacking TVShowsApp's XML feeds for now
- Retrieve TVRage and TVDB data per show
	- TVDB: Full title, Synopsis, IMDB ID
	- TVRage: ID
- Update show list weekly
- Scan local filesystem for directories
	- Match show with database entry, flag as enabled
	- Retrieve episode listings from TVRage
- Scan show directories for episodes
	- Update database and rename episode file if necessary
- Automatically grab new torrents by schedule.
	- Again, we're using TVShowsApp's feeds for this
	- Parse and reformat the magnet link to add a few extra trackers
	- Add to Transmission
	- Copy and rename when download completes
	- Delete from Transmission directory when seeding is complete

**Nessa is now capable of running 24/7, but limited to downloading new episodes of existing shows only.**

### Phase 2 - CURRENT
- ~~Automatic update by schedule~~
	- Pulls latest version from Github then sends SIGUSR2
- Build responsive HTML5 interface
	- Use Socket.IO
	- Handlebars for templating
	- MUST work on mobile devices (iPad/iPhone)
		- Mobile-first approach
- Support for unmatched shows
	- Find shows without TVShows data, retrieve TVDB/TVRage data
	- Scan filesystem for episodes
- Browse show list
	- Seasons, Episodes - Flag available/missing/downloading
- Add new show via web
	- Use existing shows database
		- Create folder using show name
	- Pick the episode to start from (or next available)
	- Start downloading

UI should be responsive, and use AJAX/Sockets for content changes, etc

### Phase 3
- Twilio for SMS download notifications
- Miso integration
	- Automatically check in when downloading the file
- Global Settings interface
	- File/Folder formatting
	- Global Quality Preference (HD/SD)
	- TVShow check interval
		- 30m, 1hr, 3hr, 6hr, 12hr, 1day
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

We chose this format due to it's tidy structure, ease of navigation, and legibility. We may, in future, add the ability to customise this on a global and per-show basis.

## RegExp

We use the following Regular Expressions to detect the Season/Episode numbers in the filenames.
We welcome any improvements you can suggest!

### Episodic content
	
	(?:S|Season)?\s?(\d{1,2})[\/\s]?(?:E|Episode|x)?\s?([\d]{2,})(?:(?:E|-)\s?([\d]{2,})){0,}

Which supports the following formats:
	
	Season 01/Episode 02
	Season 01/Episode 02-03
	S01E02
	S01E02-03
	S01E02E03
	1x02
	1x02-03
	
It also supports episode spans of any size. For example, it would handle a file that contains Episodes 1 through 12, although it's unlikely that such a file would ever be released.

Any episodes which are similar to:	

	102
	10203
	
are ignored because that format is unbelievably stupid. Sorry folks, but you'll have to rename them yourselves.

### Daily Shows/Air-by-date

Shows that are aired daily (e.g The Colbert Report, The Daily Show, Conan) don't have season or episode numbers in the conventional sense.
	
	(\d{4})\D?(\d{2})\D?(\d{2})
Which will match:
	
	2013.08.01
	20130801
	
with any separator in place of the dot.
At the time of writing, daily shows have not been tested at all.

### Specials / Miniseries

We need to create expressions for miniseries.						
## Acknowledgments

Nessa utilises the following third-party data sources:

- [TVShowsApp](http://tvshowsapp.com): If you like *our* software, please donate to *them* so they can keep up their fantastic work (and providing us with data)
- [The TVDB](http://thetvdb.com): Extended show information and artwork
- [TV Rage](http://www.tvrage.com): Episode data

## Licence

This software is distributed under a Modified BSD License. Please see LICENCE.txt for full details

## Disclaimer

The authors of this software not condone, or approve of the illegal downloading and/or sharing of copyrighted material. You, the end user, are solely responsible for any legal actions against you that may occur as a result of using this software.

