import {
    Source,
    Manga,
    Chapter,
    ChapterDetails,
    HomeSection,
    SearchRequest,
    PagedResults,
    SourceInfo,
    MangaStatus,
    ContentRating,
    Request,
    Response,
    MangaTile,
    Tag,
    TagSection
} from '@paperback/types'

import * as cheerio from 'cheerio'

const BASE_URL = "https://starboundscans.com";

// Metadonnées exportées pour la toolchain
export const StarboundScansInfo: SourceInfo = {
    version: '1.2.1',
    name: 'Starbound Scans',
    icon: 'icon.png',
    author: 'MaksOuw',
    authorWebsite: 'https://github.com/MaksOuw',
    description: 'Extension pour le site Starbound Scans',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    sourceTags: [
        {
            text: 'Français',
            type: 'language'
        },
        {
            text: 'Webtoon',
            type: 'info'
        }
    ]
}

export class StarboundScans implements Source {

    private readonly requestManager = App.createRequestManager({
        requestsPerSecond: 4,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    'Referer': BASE_URL
                }
                return request
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response
            }
        }
    });

    // Requis par l'interface Source, mais pas utilisé ici car la recherche
    // est gérée par getSearchResults
    getMangaShareUrl(mangaId: string): string {
        return `${BASE_URL}/series/${mangaId}`;
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = App.createRequest({
            url: `${BASE_URL}/series/${mangaId}`,
            method: 'GET'
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = cheerio.load(response.data as string);

        const title = $('h1').first().text().trim();
        const style = $('div.bg-cover').attr('style') ?? '';
        const imageUrlMatch = style.match(/--photoURL:url\((.*?)\)/);
        const image = imageUrlMatch ? imageUrlMatch[1] : '';
        const synopsis = $("div:contains('Synopsis')").next().find('p').text().trim();

        const genres: Tag[] = [];
        $('h1').next('div').find('a').each((_, el) => {
            const genre = $(el).attr('title')?.trim();
            if (genre) {
                genres.push(App.createTag({ id: genre, label: genre }));
            }
        });
        const tagSections: TagSection[] = [App.createTagSection({ id: 'genres', label: 'Genres', tags: genres })];

        let author = '';
        let artist = '';
        let status: MangaStatus = MangaStatus.ONGOING;

        const infoContainer = $('h1').next().next().next();
        infoContainer.children('div').each((_, el) => {
            const label = $(el).find('span').text().trim();
            const value = $(el).find('span').parent().next('div').text().trim();
            switch (label) {
                case 'Author': author = value; break;
                case 'Artist': artist = value; break;
                case 'Status': status = (value.toLowerCase() === 'completed') ? MangaStatus.COMPLETED : MangaStatus.ONGOING; break;
            }
        });
        
        return App.createManga({
            id: mangaId,
            titles: [title],
            image: image,
            author: author,
            artist: artist,
            desc: synopsis,
            status: status,
            tags: tagSections,
            contentRating: ContentRating.MATURE // Le site ne le précise pas, on reste prudent
        });
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${BASE_URL}/series/${mangaId}`,
            method: 'GET'
        });
        
        const response = await this.requestManager.schedule(request, 1);
        const $ = cheerio.load(response.data as string);

        const chapters: Chapter[] = [];
        $('#chapters a').each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href') ?? '';
            const chapterIdRaw = href.split('/').filter(Boolean).pop() ?? '';
            // L'ID du chapitre est la partie numérique après le mangaId
            // Ex: /series/manga-slug-1234 -> id: 1234
            const chapterId = chapterIdRaw.replace(`${mangaId}-`, '');
            const title = $el.attr('title')?.trim() ?? '';
            const chapNumMatch = title.match(/Chapter\s*([\d\.]+)/i);
            const chapNum = chapNumMatch ? Number(chapNumMatch[1]) : 0;
            
            const dateStr = $el.find('span > span').text().trim() ?? ''; // La date est dans un span intérieur
            let time: Date;
            
            if (dateStr.includes('ago')) {
                const [value, unit] = dateStr.split(' ');
                const numValue = parseInt(value);
                const date = new Date();
                if (unit.startsWith('day')) {
                    date.setDate(date.getDate() - numValue);
                } else if (unit.startsWith('hour')) {
                    date.setHours(date.getHours() - numValue);
                } // Ajouter d'autres cas si nécessaire
                time = date;
            } else {
                 // Gérer les formats de date comme "MMM DD, YYYY"
                time = new Date(dateStr);
            }
            
            chapters.push(App.createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: chapNum,
                name: title,
                time: time,
                langCode: 'fr'
            }));
        });
        
        return chapters;
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: `${BASE_URL}/series/${mangaId}-${chapterId}/`,
            method: 'GET'
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = cheerio.load(response.data as string);

        interface PageData { order: number, url: string }
        const pagesData: PageData[] = [];

        $('#pages img').each((_, el) => {
            const $img = $(el);
            const pageUrl = $img.attr('src');
            const pageOrder = parseInt($img.attr('count') ?? '0', 10);
            if (pageUrl) {
                pagesData.push({ order: pageOrder, url: pageUrl });
            }
        });

        // Trier les pages par leur ordre
        pagesData.sort((a, b) => a.order - b.order);
        const pages = pagesData.map(page => page.url);

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages,
            longStrip: true
        });
    }

    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        const request = App.createRequest({
            url: `${BASE_URL}/series/?q=${encodeURIComponent(query.title ?? '')}`,
            method: 'GET'
        });
        
        const response = await this.requestManager.schedule(request, 1);
        const $ = cheerio.load(response.data as string);
        
        const results: MangaTile[] = [];
        $('div#searched_series_page button:not(.hidden)').each((_, el) => {
            const link = $(el).find('a');
            
            const href = link.attr('href');
            if (!href) return;

            const mangaId = href.split('/').filter(Boolean).pop() ?? '';
            const title = link.attr('title')?.trim() ?? '';
            
            const imageDiv = link.find('div > div');
            const style = imageDiv.attr('style') ?? '';
            const imageUrlMatch = style.match(/url\((.*?)\)/);
            const image = imageUrlMatch ? imageUrlMatch[1] : '';

            if (mangaId && title) {
                results.push(App.createMangaTile({
                    id: mangaId,
                    title: App.createIconText({ text: title }),
                    image: image
                }));
            }
        });

        return App.createPagedResults({
            results: results
        });
    }

    // Les fonctions suivantes sont requises par l'interface mais peuvent rester vides
    // si le site ne propose pas de section "Nouveautés", "Populaires", etc.
    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        // Le site ne semble pas avoir de section "homepage" claire via l'URL de recherche.
        // Laisser vide pour le moment.
        return;
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        return App.createPagedResults({ results: [] });
    }
}