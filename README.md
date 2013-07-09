# Nessa for Node
Automatic Torrent grabber for Shows & Movies

## System Requirements

- Linux/OS X
- Node.js 0.10.x
- Transmission with RPC Enabled
- Plenty of HDD space

## Recommendations

[Twonky 7](http://my.twonky.com/user/download) for media sharing (until Phase 5)

## Running nessa

> /usr/bin/node /path/to/nessa/server.js port=6355

You can then access the interface at [http://localhost:6355](http://localhost:6355)

## Project Goal

To build a system that functions in a similar manner to SickBeard, using torrents only.
UI should be responsive, and use AJAX for content changes, etc

### Phase 1
- Populate a database of known shows
	- (We're piggybacking TVShowsApp's XML feeds for now)
	- Retrieve TVRage and TVDB data per show
	- Poll for updates occasionally (once per week?)
- Scan local filesystem for directories
	- Match show with database entry, flag as enabled
		- Retrieve episode listings from TVRage and store.
- Scan show directories for episodes
	- Update database and rename episode file if necessary
		- Default format: SHOW/Season ##/Episode ## - Title.ext
	- Flag episodes as available
- Schedule for grabbing torrents/magnets
	- Again, we're using TVShowsApp's feed for this
	- Automatically add to Transmission
		- Copy and rename when download completes
		- Delete from Transmission directory when seeding is complete

At this point, Nessa will be capable of running 24/7, but limited to downloading new episodes of existing shows only.

### Phase 2
- Automatic Update by schedule (03:00 daily?)
	- Pull latest version of Nessa from Github
		- Restart node (SIGUSR2 and forever)
- Build responsive HTML5 interface
	- Need to find a good templating system
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
	- Need to find/write a good uPnP/AV module

### Phase 6
- ???
- Profit!
- Ability to search and add movie torrents

---

## Data Sources
###TV Shows

- TVRage (show & episode information)
- TVDB (artwork)
- TVShowsApp.com

## Magnet link format

	magnet:?xt=urn:sha1:<HASH>&dn=<DISPLAY NAME>&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.istole.it:80...


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


##To do

	Add setup/config wizard
	
	Templating?
	Interface
	API