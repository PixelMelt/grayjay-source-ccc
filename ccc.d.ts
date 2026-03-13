declare interface CCCRecording {
    size: number;
    length: number;
    mime_type: string;
    language: string;
    filename: string;
    state: string;
    folder: string;
    high_quality: boolean;
    width: number;
    height: number;
    updated_at: string;
    recording_url: string;
    url: string;
    event_url: string;
    conference_url: string;
}

declare interface CCCEventDetail extends CCCEvent {
    recordings: CCCRecording[];
    related: CCCEvent[];
}

declare interface CCCEvent {
    guid: string;
    title: string;
    subtitle: string | null;
    slug: string;
    link: string;
    description: string;
    original_language: string;
    persons: string[];
    tags: string[];
    view_count: number;
    promoted: boolean;
    date: string;
    release_date: string;
    updated_at: string;
    length: number;
    duration: number;
    thumb_url: string;
    poster_url: string;
    timeline_url: string;
    thumbnails_url: string;
    frontend_link: string;
    url: string;
    conference_title: string;
    conference_url: string;
}

declare interface CCCConference {
    acronym: string;
    aspect_ratio: string;
    updated_at: string;
    title: string;
    schedule_url: string;
    slug: string;
    event_last_released_at: string;
    link: string;
    description: string | null;
    webgen_location: string;
    logo_url: string;
    images_url: string;
    recordings_url: string;
    url: string;
}

declare interface CCCConferenceDetail extends CCCConference {
    events: CCCEvent[];
}
