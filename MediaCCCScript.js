// media.ccc.de Plugin for Grayjay

const PLATFORM = 'media.ccc.de';
const BASE_URL = 'https://media.ccc.de';
const API_URL = 'https://api.media.ccc.de/public';
const PAGE_SIZE = 50;
const HEADERS = { Accept: 'application/json' };

const LANG_OPTIONS = ['', 'eng', 'deu', 'fra'];
const LANG_NAMES = {
	eng: 'English',
	deu: 'Deutsch',
	fra: 'Français',
	spa: 'Español',
	ita: 'Italiano',
	por: 'Português',
	rus: 'Русский',
	jpn: '日本語',
	zho: '中文',
	kor: '한국어',
	nld: 'Nederlands',
	pol: 'Polski',
	ara: 'العربية',
	tur: 'Türkçe',
};
const LANG_TO_2 = {
	eng: 'en',
	deu: 'de',
	fra: 'fr',
	spa: 'es',
	ita: 'it',
	por: 'pt',
	rus: 'ru',
	jpn: 'ja',
	zho: 'zh',
	kor: 'ko',
	nld: 'nl',
	pol: 'pl',
	ara: 'ar',
	tur: 'tr',
	ukr: 'uk',
	hin: 'hi',
	ind: 'id',
	vie: 'vi',
	tha: 'th',
	ces: 'cs',
	dan: 'da',
	fin: 'fi',
	ell: 'el',
	hun: 'hu',
	nor: 'no',
	ron: 'ro',
	swe: 'sv',
	cat: 'ca',
	hrv: 'hr',
	slk: 'sk',
	srp: 'sr',
	bul: 'bg',
	heb: 'he',
	lit: 'lt',
	lav: 'lv',
	est: 'et',
	slv: 'sl',
	gle: 'ga',
	eus: 'eu',
	glg: 'gl',
};

let _config = {};
let _settings = {};
var _logoCache = {};

function getConferenceLogo(acronym) {
	if (!acronym) return '';
	if (_logoCache[acronym] !== undefined) return _logoCache[acronym];
	var resp = http.GET(API_URL + '/conferences/' + encodeURIComponent(acronym), HEADERS);
	if (resp.isOk) {
		var conf = JSON.parse(resp.body);
		_logoCache[acronym] = conf.logo_url || '';
	} else {
		_logoCache[acronym] = '';
	}
	return _logoCache[acronym];
}

// Lifecycle

source.enable = function (conf, settings) {
	_config = conf;
	_settings = settings ?? {};
};
source.disable = function () {};
source.saveState = function () {
	return '';
};

// Home / Search

source.getHome = function () {
	return new CCCHomePager(1);
};
source.searchSuggestions = function () {
	return [];
};

const BASIC_CAPS = function () {
	return new ResultCapabilities([Type.Feed.Mixed], [Type.Order.Chronological], []);
};
source.getSearchCapabilities = BASIC_CAPS;
source.getSearchChannelContentsCapabilities = BASIC_CAPS;
source.getChannelCapabilities = BASIC_CAPS;

source.search = function (query) {
	return new CCCSearchPager(query);
};
source.searchChannels = function (query) {
	return new CCCConferencePager(query);
};

source.searchChannelContents = function (channelUrl, query) {
	var acronym = extractConferenceAcronym(channelUrl);
	if (!acronym) throw new ScriptException('Invalid conference URL');
	return new CCCConferenceEventPager(acronym, query);
};

// Channels

source.isChannelUrl = function (url) {
	return /media\.ccc\.de\/c\/[^/?#]+/.test(url) || /api\.media\.ccc\.de\/public\/conferences\/[^/?#]+/.test(url);
};

source.getChannel = function (url) {
	var acronym = extractConferenceAcronym(url);
	if (!acronym) throw new ScriptException('Invalid conference URL');

	var resp = http.GET(API_URL + '/conferences/' + encodeURIComponent(acronym), HEADERS);
	if (!resp.isOk) throw new ScriptException('Failed to fetch conference: HTTP ' + resp.code);

	var conf = JSON.parse(resp.body);
	if (conf.acronym && conf.logo_url) _logoCache[conf.acronym] = conf.logo_url;
	var links = {};
	if (conf.link) links['Website'] = conf.link;
	if (conf.schedule_url) links['Schedule'] = conf.schedule_url;

	return new PlatformChannel({
		id: new PlatformID(PLATFORM, conf.acronym, _config.id),
		name: conf.title || conf.acronym,
		thumbnail: conf.logo_url || '',
		banner: conf.logo_url || '',
		subscribers: (conf.events && conf.events.length) || 0,
		description: conf.description || '',
		url: BASE_URL + '/c/' + conf.acronym,
		links: links,
	});
};

source.getChannelContents = function (url) {
	var acronym = extractConferenceAcronym(url);
	if (!acronym) throw new ScriptException('Invalid conference URL');
	return new CCCConferenceEventPager(acronym);
};

// Content Details

source.isContentDetailsUrl = function (url) {
	return /media\.ccc\.de\/v\/[^/?#]+/.test(url);
};

source.getContentDetails = function (url) {
	var identifier = extractEventIdentifier(url);
	if (!identifier) throw new ScriptException('Invalid event URL: ' + url);

	var resp = http.GET(API_URL + '/events/' + encodeURIComponent(identifier), HEADERS);
	if (!resp.isOk) throw new ScriptException('Failed to fetch event: HTTP ' + resp.code);

	var event = JSON.parse(resp.body);
	var frontendUrl = event.frontend_link || BASE_URL + '/v/' + event.slug;

	var details = new PlatformVideoDetails({
		id: new PlatformID(PLATFORM, event.guid, _config.id),
		name: event.title || 'Untitled',
		thumbnails: buildThumbnails(event),
		author: buildAuthorLink(event),
		datetime: toUnixTimestamp(event.release_date || event.date),
		duration: event.length || 0,
		viewCount: event.view_count || 0,
		url: frontendUrl,
		shareUrl: frontendUrl,
		isLive: false,
		description: buildDescription(event),
		video: buildVideoSources(event),
		rating: new RatingLikes(event.view_count || 0),
		subtitles: buildSubtitles(event),
	});

	var confAcronym = event.conference_url ? extractConferenceAcronymFromApiUrl(event.conference_url) : null;
	var eventGuid = event.guid;

	if (confAcronym) {
		details.getContentRecommendations = function () {
			var confResp = http.GET(API_URL + '/conferences/' + encodeURIComponent(confAcronym), HEADERS);
			if (!confResp.isOk) return new ContentPager([], false);

			var confData = JSON.parse(confResp.body);
			if (confData.logo_url) _logoCache[confAcronym] = confData.logo_url;
			var siblings = (confData.events || []).filter(function (e) {
				return e.guid !== eventGuid;
			});
			for (var i = siblings.length - 1; i > 0; i--) {
				var j = Math.floor(Math.random() * (i + 1));
				var tmp = siblings[i];
				siblings[i] = siblings[j];
				siblings[j] = tmp;
			}
			return new ContentPager(siblings.slice(0, 25).map(mapEventToVideo), false);
		};
	}

	return details;
};

source.getComments = function () {
	return new CommentPager([], false);
};
source.getSubComments = function () {
	return new CommentPager([], false);
};

// Pagers

class CCCHomePager extends VideoPager {
	constructor(page) {
		var events = [];
		var resp = http.GET(API_URL + '/events?page=' + page + '&per_page=' + PAGE_SIZE, HEADERS);
		if (resp.isOk) events = JSON.parse(resp.body).events || [];
		super(events.map(mapEventToVideo), events.length >= PAGE_SIZE);
		this._page = page;
	}
	nextPage() {
		return new CCCHomePager(this._page + 1);
	}
}

class CCCSearchPager extends VideoPager {
	constructor(query) {
		var events = [];
		var resp = http.GET(API_URL + '/events/search?q=' + encodeURIComponent(query), HEADERS);
		if (resp.isOk) events = JSON.parse(resp.body).events || [];
		super(events.map(mapEventToVideo), false);
	}
	nextPage() {
		return new VideoPager([], false);
	}
}

class CCCConferencePager extends ChannelPager {
	constructor(query) {
		var conferences = [];
		var resp = http.GET(API_URL + '/conferences', HEADERS);
		if (resp.isOk) conferences = JSON.parse(resp.body).conferences || [];
		if (query) {
			var q = query.toLowerCase();
			conferences = conferences.filter(function (c) {
				return (
					(c.title && c.title.toLowerCase().includes(q)) ||
					(c.acronym && c.acronym.toLowerCase().includes(q)) ||
					(c.description && c.description.toLowerCase().includes(q))
				);
			});
		}
		conferences.sort(function (a, b) {
			return (
				(b.event_last_released_at ? new Date(b.event_last_released_at).getTime() : 0) -
				(a.event_last_released_at ? new Date(a.event_last_released_at).getTime() : 0)
			);
		});
		super(conferences.map(mapConferenceToChannel), false);
	}
	nextPage() {
		return new ChannelPager([], false);
	}
}

class CCCConferenceEventPager extends VideoPager {
	constructor(acronym, query) {
		var events = [];
		var resp = http.GET(API_URL + '/conferences/' + encodeURIComponent(acronym), HEADERS);
		if (resp.isOk) {
			var conf = JSON.parse(resp.body);
			if (conf.logo_url) _logoCache[acronym] = conf.logo_url;
			events = conf.events || [];
		}
		if (query) {
			var q = query.toLowerCase();
			events = events.filter(function (e) {
				return (
					(e.title && e.title.toLowerCase().includes(q)) ||
					(e.description && e.description.toLowerCase().includes(q)) ||
					(e.persons &&
						e.persons.some(function (p) {
							return p.toLowerCase().includes(q);
						})) ||
					(e.tags &&
						e.tags.some(function (t) {
							return t.toLowerCase().includes(q);
						}))
				);
			});
		}
		events.sort(function (a, b) {
			return (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0);
		});
		super(events.map(mapEventToVideo), false);
	}
	nextPage() {
		return new VideoPager([], false);
	}
}

// Mapping

function mapEventToVideo(event) {
	return new PlatformVideo({
		id: new PlatformID(PLATFORM, event.guid, _config.id),
		name: event.title || 'Untitled',
		thumbnails: buildThumbnails(event),
		author: buildAuthorLink(event),
		datetime: toUnixTimestamp(event.release_date || event.date),
		duration: event.length || 0,
		viewCount: event.view_count || 0,
		url: event.frontend_link || BASE_URL + '/v/' + event.slug,
		isLive: false,
	});
}

function mapConferenceToChannel(conf) {
	return new PlatformChannel({
		id: new PlatformID(PLATFORM, conf.acronym, _config.id),
		name: conf.title || conf.acronym,
		thumbnail: conf.logo_url || '',
		banner: conf.logo_url || '',
		subscribers: 0,
		description: conf.description || '',
		url: BASE_URL + '/c/' + conf.acronym,
	});
}

// Video sources (CCC files are muxed video+audio; uses VideoSourceDescriptor)

function buildVideoSources(event) {
	if (!event.recordings || !event.recordings.length) return new VideoSourceDescriptor([]);

	var filterLang = LANG_OPTIONS[parseInt(_settings.preferredLanguage || '0', 10)] || '';
	var sources = [];

	for (var i = 0; i < event.recordings.length; i++) {
		var rec = event.recordings[i];
		var mime = rec.mime_type || '';
		if (!mime.startsWith('video/')) continue;
		if (filterLang && rec.language && rec.language.indexOf(filterLang) === -1) continue;

		sources.push(
			new VideoUrlSource({
				url: rec.recording_url,
				name: buildVideoLabel(rec),
				width: rec.width || 0,
				height: rec.height || 0,
				container: stripMimeParams(mime),
				codec: codecFromFolder(rec.folder, mime),
				bitrate: estimateBitrate(rec),
				duration: rec.length || event.length || 0,
			}),
		);
	}

	sources.sort(function (a, b) {
		return (b.height || 0) - (a.height || 0);
	});
	return new VideoSourceDescriptor(sources);
}

function buildSubtitles(event) {
	if (!event.recordings || !event.recordings.length) return [];
	return event.recordings
		.filter(function (r) {
			return r.mime_type === 'text/vtt' || r.mime_type === 'application/x-subrip';
		})
		.map(function (rec) {
			var lang3 = rec.language || '';
			var label = formatLanguage(lang3);
			if (rec.state === 'auto') label += ' (auto)';
			if (rec.state === 'translated') label += ' (translated)';
			return { name: label, url: rec.recording_url, format: rec.mime_type, language: LANG_TO_2[lang3] || lang3 };
		});
}

// Labels & codec detection

var FOLDER_FORMAT_MAP = [
	[/h264/i, 'H.264'],
	[/av1/i, 'AV1'],
	[/webm/i, 'WebM'],
	[/opus/i, 'Opus'],
	[/mp3/i, 'MP3'],
	[/vorbis/i, 'Vorbis'],
	[/aac/i, 'AAC'],
	[/ogg/i, 'Ogg'],
];
var MIME_FORMAT_MAP = [
	[/mp4/, 'MP4'],
	[/webm/, 'WebM'],
	[/mpeg/, 'MP3'],
	[/opus/, 'Opus'],
	[/ogg/, 'Ogg'],
	[/flac/, 'FLAC'],
];
var FOLDER_VCODEC_MAP = [
	[/h264/i, 'h264'],
	[/av1/i, 'av1'],
	[/webm/i, 'vp9'],
	[/ogg/i, 'theora'],
];

function matchFirst(table, value) {
	if (!value) return '';
	for (var i = 0; i < table.length; i++) if (table[i][0].test(value)) return table[i][1];
	return '';
}

function formatFromFolder(folder, mime) {
	return matchFirst(FOLDER_FORMAT_MAP, folder) || matchFirst(MIME_FORMAT_MAP, mime) || folder || mime || '';
}

function codecFromFolder(folder, mime) {
	var c = matchFirst(FOLDER_VCODEC_MAP, folder);
	if (c) return c;
	if (mime) {
		if (mime.includes('av01') || mime.includes('av1')) return 'av1';
		if (mime.includes('webm')) return 'vp9';
		if (mime.includes('ogg')) return 'theora';
	}
	return '';
}

function stripMimeParams(mime) {
	var idx = mime.indexOf(';');
	return idx === -1 ? mime : mime.substring(0, idx);
}

function estimateBitrate(rec) {
	if (!rec.size || !rec.length) return 0;
	return Math.round((rec.size * 8 * 1024 * 1024) / rec.length);
}

function buildVideoLabel(rec) {
	var parts = [];
	var folder = rec.folder || '';
	if (rec.width && rec.height) parts.push(rec.height + 'p');
	if (/slides/i.test(folder)) parts.push('Slides');
	parts.push(formatFromFolder(folder, rec.mime_type));
	if (/\bweb\b/i.test(folder)) parts.push('Web');
	if (rec.high_quality) parts.push('HQ');
	if (rec.language) parts.push(formatRecordingLangs(rec.language));
	return parts.join(' ') || rec.filename || 'Unknown';
}

function formatRecordingLangs(langField) {
	if (!langField) return '';
	return '[' + langField.split('-').map(formatLanguage).join(' / ') + ']';
}

// UI / metadata

function buildThumbnails(event) {
	var t = [];
	if (event.poster_url) t.push(new Thumbnail(event.poster_url, 1080));
	if (event.thumb_url) t.push(new Thumbnail(event.thumb_url, 720));
	return new Thumbnails(t.length ? t : [new Thumbnail('', 0)]);
}

function buildAuthorLink(event) {
	var confTitle = event.conference_title || 'Unknown Conference';
	var acronym = event.conference_url ? extractConferenceAcronymFromApiUrl(event.conference_url) : '';
	var confUrl = acronym ? BASE_URL + '/c/' + acronym : BASE_URL;
	var logo = getConferenceLogo(acronym);
	return new PlatformAuthorLink(new PlatformID(PLATFORM, acronym || confTitle, _config.id), confTitle, confUrl, logo);
}

function buildDescription(event) {
	var parts = [];
	if (event.subtitle) parts.push(event.subtitle, '');
	if (event.persons && event.persons.length) {
		parts.push('Speakers:');
		for (var i = 0; i < event.persons.length; i++) {
			var name = event.persons[i];
			var searchUrl = BASE_URL + '/search/?q=' + encodeURIComponent('speakers:"' + name + '"');
			parts.push('  ' + name + ' - ' + searchUrl);
		}
	}
	if (event.original_language) parts.push('Language: ' + formatLanguage(event.original_language));
	if (event.tags && event.tags.length) {
		var meaningful = event.tags.filter(function (t) {
			return !/^\d+$/.test(t) && t.length > 2;
		});
		if (meaningful.length) parts.push('Tags: ' + meaningful.join(', '));
	}
	if (event.link) parts.push('Event page: ' + event.link);
	if (parts.length && event.description) parts.push('', '---', '');
	if (event.description) parts.push(event.description);
	return parts.join('\n');
}

function formatLanguage(code) {
	return LANG_NAMES[code] || code;
}

// URL extraction

function extractConferenceAcronym(url) {
	var m = url.match(/media\.ccc\.de\/c\/([^/?#]+)/);
	if (m) return decodeURIComponent(m[1]);
	m = url.match(/api\.media\.ccc\.de\/public\/conferences\/([^/?#]+)/);
	return m ? decodeURIComponent(m[1]) : null;
}

function extractConferenceAcronymFromApiUrl(apiUrl) {
	var m = apiUrl.match(/\/conferences\/([^/?#]+)/);
	return m ? decodeURIComponent(m[1]) : '';
}

function extractEventIdentifier(url) {
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(url)) return url;
	var m = url.match(/media\.ccc\.de\/v\/([^/?#]+)/);
	if (m) return decodeURIComponent(m[1]);
	m = url.match(/api\.media\.ccc\.de\/public\/events\/([^/?#]+)/);
	return m ? decodeURIComponent(m[1]) : null;
}

// Utilities

function toUnixTimestamp(dateStr) {
	if (!dateStr) return 0;
	try {
		return Math.floor(new Date(dateStr).getTime() / 1000);
	} catch (e) {
		return 0;
	}
}
