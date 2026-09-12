# Global streaming coverage research for Ad Accelerator

Research date: **6 September 2026**. Scope: Chrome-accessible video/audio advertising opportunities, with regional and app-first candidates retained for completeness of discovery. This research does not establish that every listed service currently has ads, operates in every country, or works with the extension.

## Deliverables and evidence boundary

- [Full regional inventory](platform-inventory.md): 499 service, brand and regional-player entries, with domain candidates, model classifications, sources where obtained, and qualification notes.
- [Documented advertising subset](documented-ad-offerings.md): 113 entries with documented advertising offerings or inventory. This includes paid-with-ads services and adult ad-network inventory, not just free video services.
- [Second qualification pass](QUALIFICATION-FOLLOWUP.md): 19 entries strengthened, including 15 moved out of the unverified candidate pool, with browser and plan distinctions.
- [Full CSV](platform-inventory.csv), [documented subset CSV](documented-ad-offerings.csv), and [JSON](platform-inventory.json): filterable research inputs for an implementation backlog.
- [Source index](source-index.json): titles and URLs cited by the inventory.

The other **386 entries are discovery/qualification candidates**, not verified current ad-supported Chrome targets. Some have partial evidence of a free service or advertising business; others are deliberately unverified seeds so regional services are not silently omitted. Some may have moved, closed, become subscription-only, or have no useful desktop player. These uncertainties are explicit in each row. The catalog is neither a global popularity ranking nor an exhaustive census. Individual channels, podcasts, local stations, piracy mirrors and white-label player installations number far beyond a useful platform list.

No live playback, sign-in, ad skipping, acceleration, or country-by-country compatibility testing was performed for this inventory. A search result or official plan description confirms only what it says. Native app advertising does not prove that the desktop website carries the same ads. A listed domain is **not a domain to block** and is not yet a verified extension match pattern.

## The most useful market distinctions

| Market type | What the user can actually access | Consequence for the extension |
|---|---|---|
| Free ad-supported VOD | Selected films/episodes without a paid subscription, sometimes with a free account | Best initial expansion pool; verify actual ad state and program restoration |
| Free live TV / FAST | Scheduled channels with commercial breaks | Removing an ad does not make future live programming available sooner |
| Freemium | A free catalog and separate paid titles, tiers or passes | Ad handling must preserve entitlement boundaries |
| Paid with ads | A subscription is required and advertisements still appear | Relevant to ad handling, but must not be advertised as free viewing |
| Social/creator video | Free clips, feeds and live streams, sometimes paid memberships | In-feed sponsored cards, pre-rolls, creator sponsorships and live ads need different treatment |
| Music | Songs separated by advertising on eligible free tiers | Requires audio-specific detection; do not accelerate songs or mistake previews for ads |
| Radio/podcasts | Station commercials, dynamically inserted ads, or sponsor reads within the recording | Often there is no separate ad player or trustworthy skip boundary |
| Adult video/camera sites | Video advertising or promotional UI; public rooms and paid interactions may coexist | Separate advertising from content, pay/tip controls, age checks and private-room access |

Netflix is an example of a **paid** ad-supported service, not free streaming. Its help explains that its normal player does not permit skipping/fast-forwarding ads. That is a product rule, not evidence that our extension can safely override it. [Netflix help](https://help.netflix.com/go/ads)

## Geographic coverage map

These examples show the breadth of the catalog. **This table mixes documented offerings and unverified candidates**; use the per-platform code and evidence in the inventory before deciding a service is an active ad target.

| Market | Platforms and regional surfaces included |
|---|---|
| Global / US | YouTube, Twitch, Kick, Dailymotion, Rumble, Tubi, Pluto TV, Roku Channel, Plex, Xumo Play, Sling Freestream, Philo, Prime Video, Netflix, Disney+, Hulu, HBO Max, Paramount+, Peacock, AMC+, discovery+, Fandango at Home, FilmRise, Cineverse, Fawesome, Filmzie, DistroTV, Local Now, Zeam, The CW, broadcaster sites, Viki, anime services |
| Canada | CBC Gem, CTV, Crave, Global TV, Citytv, Noovo, TVA+, Télé-Québec, ICI TOU.TV, TSN, Sportsnet+ |
| UK / Ireland | ITVX, Channel 4, 5, U, STV Player, RTÉ Player, Virgin Media Play, TG4 Player, NOW, Sky Go |
| France / pan-European | TF1+, M6+, france.tv, Molotov, Rakuten TV, wedotv, rlaxx, Samsung TV Plus, LG Channels, SkyShowtime |
| Germany / Austria / Switzerland | Joyn, RTL+, Zattoo, waipu.tv, ServusTV On, ORF ON, RTLplay Luxembourg |
| Italy / Spain / Portugal | RaiPlay, Mediaset Infinity in Italy and Spain, La7, Atresplayer, Tivify, 3Cat, À Punt, EITB Primeran, RTP Play, OPTO, TVI Player |
| Benelux | NPO Start, KIJK, Videoland, NLZIET, VTM GO, Play, VRT MAX, RTBF Auvio, RTL play Belgium |
| Nordics | TV4 Play, Ruutu, MTV Katsomo, TV 2 Play Denmark, TV 2 Play Norway, Viaplay |
| Central / Eastern Europe / Balkans | Player, TVP VOD, Polsat Box Go, WP Pilot, prima+, Oneplay, JOJ Play, RTL+ Hungary, TV2 Play Hungary, country-specific Voyo services, AntenaPLAY, bTV Plus, Nova Play, EON, ANT1+, MEGA, SKAI |
| Turkey / CIS / Caucasus / Baltics / Ukraine | puhutv, tabii, Exxen, GAIN, TOD, Turkish broadcasters, Ivi, Kinopoisk, Okko, Wink, KION, START, PREMIER, Smotrim, RUTUBE, VK Video, OK Video, Dzen, MEGOGO, SWEET.TV, Kyivstar TV, Go3, Aitube, Mediabay, iTV, Kinodaran, Cavea+, Silk Go |
| India | JioHotstar, MX Player by Prime Video, SonyLIV, ZEE5, JioTV, Airtel Xstream Play, Watcho, ShemarooMe, Hungama, Dangal Play, Sun NXT, aha, hoichoi, ManoramaMAX, Chaupal, STAGE, FanCode |
| Pakistan / Bangladesh / Sri Lanka / Nepal | Tamasha, myco, Tapmad, ARY ZAP, Geo, HUM, Toffee, Bongo, Chorki, Bioscope, Rabbithole, Dialog ViU/ViU+, Hiru, Derana, NETTV, DishHome GO, Kantipur TV |
| Mainland China | Tencent Video, iQIYI, Youku, Mango TV, Bilibili, Sohu Video, Migu, PP Video, Xigua, Douyin, Kuaishou, Huya, DouYu |
| Japan | TVer, ABEMA, Niconico, Lemino, Locipo, FOD, TV Tokyo, MBS video |
| Korea | Coupang Play, TVING, Wavve, CHZZK, SOOP, Naver TV, KakaoTV, SBS, MBC, KBS, JTBC |
| Taiwan / Hong Kong | LINE TV Taiwan, LiTV, 4gTV, ofiii, myVideo, KKTV, Hami Video, ViuTV, myTV SUPER, HOY TV |
| Southeast Asia | Viu, WeTV, international iQIYI/Youku, Vidio, RCTI+, Vision+, mewatch, Tonton, sooka, Astro GO, Unifi TV, TrueID, AIS PLAY, CH3Plus, BUGABOO, oneD, MONOMAX, iWant, Cignal Play, GMA, FPT Play, VieON, TV360, VTVgo, Mahar, Pyone Play, SOYO |
| Australia / New Zealand | 7plus, 9Now, 10, SBS On Demand, TVNZ+, ThreeNow, Māori+, Kayo, Stan Sport |
| Latin America / Caribbean | ViX, Canela.TV, Mercado Play, Globoplay, RecordPlus, Bandplay, +SBT, RedeTV! GO, Claro video, TV Azteca, Las Estrellas, N+, 13GO, Mega GO, TVN Play, Chilevisión, Telefe, eltrece, Flow, DGO, América tvGO, Latina, ATV, Caracol Play, RCN, Ecuavisa, Teleamazonas, Teledoce, Unitel, 1SpotMedia |
| Middle East / North Africa | Shahid, WATCH IT, OSN+, STARZPLAY, Yango Play, stc tv, Awaan, ADtv, Shofha, Arabic news streams, SNRT, 2M, Tunisian and Algerian broadcasters |
| Sub-Saharan Africa | eVOD, SABC+, Openview Stream, DStv Stream, Showmax, StarTimes ON, AfroLandTV, Viusasa, Citizen TV, KTN, NTV Kenya, Afro Mobile, JoyOnline, Channels TV, ARISE, IROKOtv, IbakaTV, SceneOne TV |
| Iran / Israel | Aparat, Filimo, Namava, Telewebion, 12+/mako, 13+/Reshet |
| Audio | Spotify, YouTube Music, SoundCloud, Amazon Music Free, Pandora, iHeartRadio, TuneIn, Audacy, LiveOne, AccuRadio, Global Player, Radioplayer, radio.net, Radio Garden, Live365, DI.FM family, Audiomack, Anghami, Boomplay, JioSaavn, JOOX, TREBEL, Chinese/Korean/Japanese/Vietnamese music services, iVoox, Acast, Podbean, Spreaker and podcast players |
| Adult | Pornhub, YouPorn, RedTube, Tube8, XVideos, XNXX, xHamster, Eporner, SpankBang, Beeg, ThisVid, Chaturbate, Stripchat, LiveJasmin, BongaCams, CAM4, CamSoda, MyFreeCams, Flirt4Free, Streamate |

For adult services, the strongest evidence here comes from official advertising networks, not browsing explicit content: TrafficJunky documents placements for Pornhub, YouPorn, RedTube and Tube8; TrafficStars documents xHamster formats and an Eporner campaign. The remaining adult names are qualification candidates. This does not establish lawful access in a particular location or justify treating private-session controls as advertisements. [TrafficJunky formats](https://www.trafficjunky.com/advertiser/ad-formats), [TrafficStars xHamster](https://trafficstars.com/product/xhamster-ads), [Eporner campaign evidence](https://trafficstars.com/blog/case-study-scaling-an-igaming-offer-in-mena-to-1536-ftd)

## Corrections to older lists

| Old assumption | Research finding and implication |
|---|---|
| Freevee is another independent platform to implement | Amazon says its free content was incorporated into Prime Video. Track the free catalog within Prime Video instead. [Amazon](https://advertising.amazon.com/en-us/library/guides/free-ad-supported-streaming-tv/) |
| MX Player requires a permanent separate adapter | Amazon's July 2026 update describes phased unification with Prime Video, including planned redirection of web/iOS/TV users. Verify the installed user journey before investing in old selectors. [Amazon India](https://www.aboutamazon.in/news/company-news/prime-video-mx-player-india-largest-streaming-service) |
| My5, UKTV Play and All 4 are additional current platforms | Their current service names are 5, U and Channel 4. Preserve aliases for discovery, not inflated coverage counts. [5](https://www.viacomcbs-mediahub.co.uk/press-releases/%E2%80%98it%E2%80%99s-all-on-5%E2%80%99-%E2%80%93-channel-5-and-my5-combine-under-a-single-brand-following-record-growth-in-streaming-viewing-), [U](https://u.co.uk/help/faqs), [Channel 4](https://www.channel4.com/press/news/channel-4-brings-iconic-blocks-back-together-single-brand-streaming-future) |
| Mitele is the current Spanish service name | Mediaset announced its evolution to Mediaset Infinity in June 2025. [Mediaset](https://www.mediaset.es/comunicacion/corporativo/publiespana/20250624/publiespana-ad-infinity_18_015948269.html) |
| PlayPlus is another Brazilian platform alongside RecordPlus | Record identifies RecordPlus as the renamed service. [Record](https://record.r7.com/fala-brasil/video/streaming-da-record-passa-a-se-chamar-recordplus-15082025/) |
| FIFA+ needs an entirely independent new player adapter | FIFA's June 2026 release says FIFA+ launched exclusively on DAZN. Keep the brand in discovery; verify the actual DAZN surface. Older standalone advertising evidence is not proof of current behavior. [FIFA](https://inside.fifa.com/organisation/media-releases/fifa-plus-dazn-global-home-of-football) |
| Kick has no platform ads | Current official help documents ads and explains country/channel variation. [Kick](https://help.kick.com/en/articles/15300357-advertising-on-kick-for-viewers) |
| Coupang Play requires WOW for all viewing | Its current landing page offers free viewing with ads to Coupang members. [Coupang](https://play.coupang.com/en) |
| Samsung TV Plus and LG Channels are necessarily TV-only | Both US pages document browser access. That does not prove availability of their web players in every country. [Samsung](https://www.samsung.com/us/tvs/smart-tv/samsung-tv-plus/), [LG](https://www.lg.com/us/lg-channels) |
| The paid Crunchyroll app and free Crunchyroll Channel are interchangeable | Official help describes the free linear channel separately from the paid on-demand app. Reporting says the old free on-demand tier ended in December 2025. Do not use old free-tier tutorials as current evidence. [Official help](https://help.crunchyroll.com/article/crunchyroll-channel), [reported closure](https://cordcuttersnews.com/crunchyroll-is-shutting-down-its-free-ad-supported-plan/) |
| Crackle belongs on the active implementation list | Sony documents that the service ended. Older lists of Crackle/Popcornflix/Redbox need retirement checks, not automatic reuse. [Sony](https://www.sony.com/electronics/support/televisions-projectors-oled-tvs-android-/k-48a60/articles/00346761) |
| Every free music player has ad breaks | Jango describes no commercial interruptions. Deezer's historical free-ad model should not be assumed to provide full browser tracks today; current community evidence mentions previews. [Jango](https://www.jango.com/faq), [Deezer qualification evidence](https://en.deezercommunity.com/android-47/it-won-t-let-me-play-more-than-the-thirty-second-preview-fortracks-82682) |

## Platforms that should also be negative controls

ABC iview explicitly describes itself as free and ad-free. Apple Music and TIDAL advertise paid ad-free music. Red Bull TV describes an ad-free service, even though the programming prominently features the sponsor's brand. Those are useful checks that our extension leaves ordinary content and branded programming alone. [ABC](https://help.abc.net.au/hc/en-us/articles/8503446177935-What-is-ABC-iview), [Apple Music](https://support.apple.com/guide/music-web-review/subscribe-apdm8de77edb/web), [TIDAL](https://offer.tidal.com/?geo=GB), [Red Bull](https://apps.apple.com/us/app/red-bull-tv-watch-live-events/id364269164?platform=tv)

Also qualify public-service platforms such as BBC iPlayer, ARTE, SVT Play, NRK TV, Yle Areena, DR TV, ARD/ZDF, RTVE Play, ERTFLIX, RTP Play, NHK and PTS+ before adding commercial-ad behavior. Public funding, program promos, sponsorship and channel-level broadcast ads are different things. ARTE itself distinguishes its non-advertising model from sponsorship and certain online commercial arrangements, illustrating why a blanket “all public broadcasters are ad-free” rule would be wrong. These additional public-service names are **not individually verified in this research**. [ARTE funding](https://corporate.arte.tv/en/funding/), [ARTE sponsorship](https://corporate.arte.tv/en/sponsors/)

## Recommended implementation order

This is an engineering recommendation, not a measured popularity or guaranteed-feasibility ranking. Start where authorized testers can access the correct region and tier. Do not buy subscriptions or change region just to fill a row automatically.

| Track | First targets | Why this grouping is useful |
|---|---|---|
| Preserve current behavior | Prime Video, JioHotstar, YouTube | Existing named adapters in current source; each regression can affect already-used behavior |
| Broader on-demand video | Dailymotion, Plex, Tubi, Roku Channel, Rakuten TV, Viki, SonyLIV, WeTV, international iQIYI | Mix of global/regional catalogs and embedded players; investigate real ad state before implementing |
| Regional broadcaster VOD | ITVX, Channel 4, TF1+, M6+, Joyn, RTL+, Mediaset Infinity, 7plus, 9Now, 10, TVNZ+ | Provides several languages and broadcaster implementations without starting with live sport |
| Additional markets | TVer, ABEMA, Coupang Play, Viu, ViX, Canela.TV, Shahid, eVOD | Broadens geographic coverage once suitable local test sessions exist |
| Audio, as its own feature | Spotify, YouTube Music, SoundCloud, JioSaavn, Audiomack | Tests audio detection and song restoration; current video logic should not be assumed sufficient |
| Live/FAST, after on-demand stability | Twitch, Kick, Pluto TV, Xumo Play, Sling Freestream, DAZN, radio streams | Ad removal, waiting at the live edge and buffered catch-up are distinct behaviors |
| Adult and arbitrary embedded players | Documented ad-network player/overlay formats, then selected eligible sites | Cross-site player and popup protection may cover more pages than a separate adapter for every brand |

Do not begin by implementing 499 hostname checks. A useful shared structure is:

`current page → identify active player → determine ad evidence and timeline type → select permitted action → verify return to content`

Use shared player-family handling where runtime evidence supports it, with small site adapters for exceptions. Investigate common SDK/player families such as Google IMA, Video.js, JW Player, Brightcove, Shaka and native HTML media. Their presence alone is **not** proof that an ad is playing, and this research does not map specific platforms to those SDKs. Arbitrary publisher sites and changing embedded hosts can benefit from those shared components without an endless mirror-domain registry.

For an actual Skip Ad button, use the real enabled control. For independently identified finite ad media, evaluate whether the player supports seeking or acceleration without damaging its state. When the ad and program share a timeline, do not jump to the media duration: that can skip the program itself. Google documents dynamic ad insertion that stitches ad and content segments into VOD and live streams, so URL-domain blocking alone is not a universal solution. This is an architecture inference from the documented delivery model, not a claim about a specific service's player. [Google DAI](https://developers.google.com/ad-manager/dynamic-ad-insertion/pod-serving)

For live programming, an extension cannot make the future broadcast arrive earlier. An ad may be replaceable, mutable, or skippable into already-buffered program material, but speeding a live player can simply cause buffering. For podcasts, distinguish a separate inserted ad from a host reading a sponsor message in the same recording. Spotify explicitly documents both inserted ads and creator sponsorships; a Premium music subscription does not imply all podcasts are ad-free. [Spotify](https://support.spotify.com/uk/article/podcasts-and-shows/), [Acast insertion](https://learn-advertising.acast.com/en/articles/8027374-pre-recorded-ads)

The extension's local adaptive learning can help discover recurring unwanted advertising patterns, but a click or redirect alone does not reveal video ad boundaries. Any future learning must distinguish legitimate navigation, authentication and payment from unwanted popups, and keep changes reversible. This research does not propose changing the current learning behavior automatically.

## Qualification checklist for each new adapter

Record the service, exact hostname/path, country, language, subscription, browser version, extension version and media type. Then retain runtime evidence for:

1. A genuine pre-roll or mid-roll appears, including consecutive ads where available.
2. The detector reports an ad from player-owned evidence rather than title, subtitle or page text.
3. Skip/acceleration causes the intended ad transition; absence of an ad by itself is not proof of success.
4. Program playback resumes at the user's original speed, volume and paused/playing state.
5. Site disable and timed pause stop all relevant extension behavior and restore it correctly later.
6. Live content, unknown players, multiple videos, embedded frames, navigation and extension reload fail safely.
7. A failed intervention restores normal playback and does not cause an ad loop, black screen or repeated reload.

Maintain separate statuses: **candidate → ad observed → implemented → fixture checked → real-ad workflow passed**. Only the final state should appear as tested support to users. This research establishes discovery/model evidence, not those later runtime stages.

## Project boundary

Current `sites.js` was inspected and still names Prime Video, JioHotstar and YouTube, with route restrictions and live protections. This research created documents and datasets only. It did not modify extension behavior, publish website changes, or submit a Chrome Web Store release.
