# NodeTV
Automated TV Torrenting acquisition

## System Requirements

- Compatible operating system
	- Linux: Tested on Ubuntu
	- OS X *should* work too
	- Windows users: You're on your own for now.
- Node.js 0.10.x
- Transmission with RPC Enabled
- Plenty of storage space

## "Optional" Third-party software
Nessa doesn't handle uPNP/AV (yet), so you'll need a MediaServer if you want to stream your content. I've used the following, with various degrees of success

- [minidlna](minidlna.sourceforge.net) (Open-source)
- [Twonky 7](http://twonky.com/downloads) (Commercial)

These work reasonably well with VLC and my XBOX 360. Your mileage may vary.

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

## Roadmap

### Phase 1 - **COMPLETE**
- Populate a database of known shows
	- We're piggybacking TVShowsApp's XML feeds for now
- Retrieve TVDB data
	- TVDB: Full title, Synopsis, IMDB ID
- Update show list weekly
- Scan local filesystem for directories
	- Match show with database entry, flag as enabled
	- Retrieve episode listings from TVDB
- Scan show directories for episodes
	- Update database and rename episode files if necessary
- Automatically grab new torrents by schedule.
	- Again, we're using TVShowsApp's feeds for this
	- Parse and reformat the magnet link to add a few extra trackers
	- Add to Transmission
	- Copy and rename when download completes
	- Delete from Transmission directory when seeding is complete

**NodeTV is now capable of running 24/7, but limited to downloading new episodes of existing shows only.**

---

### Phase 2 - COMPLETE
- ~~Automatic update by schedule~~
	- ~~Pull latest version from Github then send SIGUSR2~~
- *Build responsive HTML5 interface (Ongoing)*
	- ~~Use Socket.IO~~
	- ~~Handlebars for templating~~
	- ~~Responsive layout (Mobile-first)~~
- ~~Browse show list~~
- ~~Get show artwork from TVDB~~
- ~~Display show information~~
	- ~~Modal window~~
	- ~~Use artwork banner or poster~~
	- ~~list episodes~~
- ~~Add Show~~
	- ~~Use existing shows database~~
	- ~~Autocomplete style search~~
	- ~~Create folder using show name~~
- ~~Support for unmatched shows~~
	- ~~Find shows without TVShows data, retrieve TVDB data~~
	- ~~Interface for matching with TVDB~~
	- ~~Trigger filesystem scan for episodes~~

**NodeTV now has a usable, if basic, interface**

---

### Phase 3 - *CURRENT*

- ~~Improve show modal~~
	- ~~Trigger rescan/info update~~
	- ~~Settings tab/section~~
	- ~~Episode list needs to scroll~~
- Authentication
	- ~~User/Pass~~
		- Need interface to manage users
	- ~~IP Whitelisting~~
- Dashboard
	- ~~Show recently downloaded~~
	- Show upcoming episodes (next 7 days)
- Matching UI
	- Use modal window
- ~~trakt integration~~
- Scan Transmission for *manually* added shows
	- Move to right place, rename, etc
- Twilio for SMS download notifications?
- Per-show settings (HD, enabled, etc)
	- ~~SD/HD~~
	- SMS Notifications on/off
- Notification system
	- info bubbles?
- Handle series "specials"
	- e.g. Doctor Who christmas specials


### Phase 4
- Ants. Ants EVERYWHERE!
- Better navigation
- Integration Overrides
	- Trakt
- Simple torrent management?
- Setup wizard
	- Clean install test

### Phase 5
- Custom templates and/or themes
	- I'm sure some people won't like my idea of design
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
	
	(?:S|Season)?\s?(\d{1,2})(?:[\w\s\-\:]+)?[\/\s]?(?:E|Episode|x)?\s?([\d]{2,})(?:(?:E|-)\s?([\d]{2,})){0,}

Which supports the following structures:
	
	Season 01/Episode 02
	Season 01/Episode 02
	Season 01/Episode 02-03
	S01E02
	S01E02-03
	S01E02E03
	1x02
	1x02-03

It also supports episode spans of any size. For example, it would handle a file that contains Episodes 1 through 12, although it's unlikely that such a file would ever be released.	

Optionally, the Season name may have subtitle:
	
	Season 01: Subtitle/Episode 02
	Season 01 - Subtitle/Episode 02

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
- [The TVDB](http://thetvdb.com): Show information, Episodes, and artwork

## Licence

This software is distributed under a Modified BSD License. Please see LICENCE.txt for full details

## Disclaimer

The authors of this software not condone, or approve of the illegal downloading and/or sharing of copyrighted material. You, the end user, are solely responsible for any legal actions against you that may occur as a result of using this software.

