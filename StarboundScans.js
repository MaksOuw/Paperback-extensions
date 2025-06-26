// ==Paperback Extension Information==
//
// Name: Starbound Scans
// Author: MaksOuw
// Language: fr
// Source ID: starbound-scans
// Version: 1.2.1
// Website: https://starboundscans.com/
// Description: Extension pour le site Starbound Scans
//
// ==/Paperback Extension Information==

// Création de la source
const StarboundScans = createSource({
    // --- Informations Générales ---
    name: "Starbound Scans",
    author: "MaksOuw",
    language: "fr",
    version: "1.2.1",
    sourceTags: [
        {
            "text": "Français",
            "type": "language"
        },
        {
            "text": "Webtoon",
            "type": "info"
        }
    ],
    // --- Configuration de Base ---
    baseURL: "https://starboundscans.com",

    // --- Fonctions Principales ---

    /**
     * Récupère les détails d'un manga (série) à partir de son ID.
     * @param {string} mangaId - L'identifiant de la série (partie de l'URL).
     */
    getMangaDetails: async (mangaId) => {
        const request = createRequestObject({
            url: `${StarboundScans.baseURL}/series/${mangaId}`,
            method: 'GET'
        });

        const response = await App.network.send(request);
        const $ = cheerio.load(response.data);

        const title = $('h1').first().text().trim();
        const style = $('div.bg-cover').attr('style') ?? '';
        const imageUrlMatch = style.match(/--photoURL:url\((.*?)\)/);
        const image = imageUrlMatch ? imageUrlMatch[1] : '';
        const synopsis = $("div:contains('Synopsis')").next().find('p').text().trim();

        const genres = [];
        $('h1').next('div').find('a').each((_, el) => {
            const genre = $(el).attr('title')?.trim();
            if (genre) {
                genres.push(createTag({ id: genre, label: genre }));
            }
        });

        let author = '', artist = '', status = 'ONGOING';
        const infoContainer = $('h1').next().next().next();
        infoContainer.children('div').each((_, el) => {
            const label = $(el).find('span').text().trim();
            const value = $(el).find('span').parent().next('div').text().trim();
            switch (label) {
                case 'Author': author = value; break;
                case 'Artist': artist = value; break;
                case 'Status': status = (value.toLowerCase() === 'completed') ? 'COMPLETED' : 'ONGOING'; break;
            }
        });
        
        return createManga({
            id: mangaId,
            titles: [title],
            image: image,
            author: author,
            artist: artist,
            desc: synopsis,
            status: status,
            tags: [createTagSection({ id: 'genres', label: 'Genres', tags: genres })]
        });
    },

    /**
     * Récupère la liste des chapitres pour une série.
     * @param {string} mangaId - L'identifiant de la série.
     */
    getChapters: async (mangaId) => {
        const request = createRequestObject({
            url: `${StarboundScans.baseURL}/series/${mangaId}`,
            method: 'GET'
        });
        
        const response = await App.network.send(request);
        const $ = cheerio.load(response.data);

        const chapters = [];
        $('#chapters a').each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href') ?? '';
            const chapterIdRaw = href.split('/').filter(Boolean).pop() ?? '';
            const chapterId = chapterIdRaw.replace(`${mangaId}-`, '');
            const title = $el.attr('title')?.trim() ?? '';
            const chapNumMatch = title.match(/Chapter\s*([\d\.]+)/i);
            const chapNum = chapNumMatch ? Number(chapNumMatch[1]) : 0;
            const dateStr = $el.attr('d')?.trim() ?? '';
            let time;
            if (dateStr.includes('ago')) {
                const days = parseInt(dateStr.split(' ')[0]);
                const date = new Date();
                date.setDate(date.getDate() - days);
                time = date;
            } else {
                time = new Date(dateStr);
            }
            
            chapters.push(createChapter({ id: chapterId, mangaId: mangaId, chapNum: chapNum, name: title, time: time }));
        });
        
        return chapters;
    },

    /**
     * Récupère les détails d'un chapitre (la liste des pages).
     * @param {string} mangaId - L'identifiant de la série.
     * @param {string} chapterId - L'identifiant du chapitre.
     */
    getChapterDetails: async (mangaId, chapterId) => {
        const request = createRequestObject({
            url: `${StarboundScans.baseURL}/series/${mangaId}-${chapterId}/`,
            method: 'GET'
        });

        const response = await App.network.send(request);
        const $ = cheerio.load(response.data);

        const pagesData = [];
        $('#pages img').each((_, el) => {
            const $img = $(el);
            const pageUrl = $img.attr('src');
            const pageOrder = parseInt($img.attr('count') ?? '0', 10);
            if (pageUrl) {
                pagesData.push({ order: pageOrder, url: pageUrl });
            }
        });

        pagesData.sort((a, b) => a.order - b.order);
        const pages = pagesData.map(page => page.url);

        return createChapterDetails({ id: chapterId, mangaId: mangaId, pages: pages, longStrip: true });
    },

    /**
     * Exécute une recherche sur le site et retourne les résultats.
     * @param {SearchRequest} query - La requête de recherche de l'utilisateur.
     */
    getSearchResults: async (query) => {
        const request = createRequestObject({
            url: `${StarboundScans.baseURL}/series/?q=${encodeURIComponent(query.title)}`,
            method: 'GET'
        });
        
        const response = await App.network.send(request);
        const $ = cheerio.load(response.data);
        
        const results = [];
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
                results.push(createMangaTile({
                    id: mangaId,
                    title: createIconText({ text: title }),
                    image: image
                }));
            }
        });

        return createPagedResults({
            results: results
        });
    }
});