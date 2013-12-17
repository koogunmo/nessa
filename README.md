# NodeTV
Automated TV Torrenting acquisition

## Project Goal

"Build a system that functions in a similar manner to SickBeard, but using torrents only."

I tried [SickBeard](http://sickbeard.com/), but it wouldn't easily let me arrange/name my files in a way I liked. It was also heavily skewed towards using newsgroups, which I don't use, thus NodeTV was born.


## Requirements

- Compatible operating systems
	- Linux: Tested on Ubuntu
	- OS X: 10.6 or later
	- Windows users: You're on your own for now
		- Please see the note at the bottom of this document
- [Node.js](http://nodejs.org) 0.10.x
- [MongoDB](http://mongodb.org) 2.4.x
- [Transmission](http://transmissionbt.com) with RPC Enabled
- A free [Trakt](http://trakt.tv) account


## Optional Third-party software
NodeTV doesn't handle uPNP/DLNA (yet), so if you want to stream your content, you'll need a MediaServer. I've used the following, with various degrees of success

- [ReadyMedia](minidlna.sourceforge.net) (Open-source)
- [Twonky 7](http://twonky.com/downloads) (Commercial)

These work reasonably well with VLC and my XBOX 360. Your mileage may vary.


## Browser Support

NodeTV works in all current browsers. IE 8.0 and earlier are not supported.


## Installing

Clone the repository
> git clone https://github.com/greebowarrior/nessa.git /opt/nodetv

Next, you'll need to install the dependencies
> npm install


## Running NodeTV

On the command line, run the following
> /usr/bin/node /path/to/nodetv/server.js

You'll probably want to daemonize the process, I use [forever](https://github.com/nodejitsu/forever).

You can then access the interface at [http://localhost:6377](http://localhost:6377)  

### Ubuntu
An upstart job can be found at scripts/upstart.conf
> sudo cp scripts/upstart.conf /etc/init/nodetv.conf  
> sudo initctl reload-configuration


## File formatting

We use a human-readable format for directories and filenames.
>[Show Name]/Season ##/Episode ## - [Show Title].ext

Season and Episode numbers always have leading zeroes.

In the case of multipart episodes, the format is expanded:
> [Show Name]/Season ##/Episode ##-## - [Part 1 Title; Part 2 Title].ext

For example:

> Falling Skies/Season 01/Episode 01-02 - Live and Learn; The Armory.avi

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
	
	American Horror Story/Season 02: Asylum/Episode 01 - Welcome to Briarcliff.mp4
	American Horror Story/Season 02 - Asylum/Episode 01 - Welcome to Briarcliff.mp4

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

NodeTV utilises the following third-party data sources:

- [TVShowsApp](http://tvshowsapp.com): Show list and RSS feeds
- [Trakt.tv](http://trakt.tv): Show information, artwork and social functions



## Licence

This software is distributed under a Modified BSD License. Please see LICENCE.txt for full details



## Disclaimer

The authors of this software not condone, or approve of the illegal downloading and/or sharing of copyrighted material. You, the end user, are solely responsible for any legal actions against you that may occur as a result of using this software.



## Windows Users

There's no specific reason why NodeTV won't work on your system, but we just don't have the means to test it.

You'll need to install [Transmission-QT](http://sourceforge.net/projects/trqtw/)
