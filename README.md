# media.ccc.de Grayjay Plugin

A Grayjay plugin for [media.ccc.de](https://media.ccc.de), the video portal of the Chaos Computer Club.

## Installation

Scan this QR code in Grayjay (Sources > Add Source > QR):

![Install QR Code](install-qr.png)

Or add a new source manually with this URL:

```
https://raw.githubusercontent.com/PixelMelt/grayjay-source-ccc/master/MediaCCCConfig.json
```

## Features

- Home feed with pagination into the full 15,000+ event archive
- Full-text search across all events
- Conferences as channels, with conference search and per-conference filtering
- Video recommendations from the same conference
- Multi-quality video (H.264, VP9, AV1) and audio-only tracks (MP3, Opus)
- VTT subtitles with language labels
- Multi-language recordings, filterable via settings
- Rich descriptions with speakers, tags, and event page links
- Bitrate estimation from file size metadata

## Settings

Preferred Language: All Languages (default), English, Deutsch, or Français.

## Development

Start any HTTP server in this directory:

```shell
python -m http.server
```

Then open Grayjay, install a new source, and paste:

```
http://localhost:8000/MediaCCCConfig.dev.json
```

Use the DevServer (Settings > Developer Settings > Start Server) at
`http://<phone-ip>:11337/dev` for interactive testing of individual methods.

## API Reference

This plugin uses the [media.ccc.de public API](https://api.media.ccc.de):

- `GET /events/recent` -- Home feed (first page)
- `GET /events?page=N&per_page=N` -- Home feed (subsequent pages)
- `GET /events/search?q=...` -- Search
- `GET /events/{guid-or-slug}` -- Video detail + recommendations
- `GET /conferences` -- Conference listing
- `GET /conferences/{acronym}` -- Conference detail + events list

## Attributions

Forked from the original [media.ccc.de Grayjay plugin][original-repo] by
OnlinePersona, hosted on Radicle. Thank you for the foundation!

That project was itself based on the official Grayjay plugin for [TED Talks].

[original-repo]: https://app.radicle.xyz/nodes/seed.radicle.garden/rad:zWzu5sgdan7wuErGDRz1u4JTFEF7
[TED Talks]: https://gitlab.futo.org/videostreaming/plugins/tedtalks
