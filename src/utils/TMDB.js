// Please remember to add TMDB attribution in the game credits to comply with their non-commercial API terms.
// E.g., "This product uses the TMDB API but is not endorsed or certified by TMDB."

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_READ_ACCESS_TOKEN = import.meta.env.VITE_TMDB_READ_ACCESS_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';

function buildTmdbUrl(path, query = {}) {
    const url = new URL(`${BASE_URL}${path}`);

    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    if (!TMDB_READ_ACCESS_TOKEN && TMDB_API_KEY) {
        url.searchParams.set('api_key', TMDB_API_KEY);
    }

    return url.toString();
}

async function tmdbFetch(path, query = {}) {
    const headers = {};
    if (TMDB_READ_ACCESS_TOKEN) {
        headers.Authorization = `Bearer ${TMDB_READ_ACCESS_TOKEN}`;
    }
    headers.Accept = 'application/json';

    const response = await fetch(buildTmdbUrl(path, query), { headers });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Invalid TMDB response type: ${contentType || 'unknown'}`);
    }

    try {
        return await response.json();
    } catch (error) {
        throw new Error(`TMDB JSON parse failed: ${error.message}`);
    }
}

const CAMPAIGN_DATA = {
    "Akira Kurosawa": [
        { title: "Seven Samurai", id: 346, difficultyMult: 1 },
        { title: "Yojimbo", id: 11878, difficultyMult: 1.25 },
        { title: "Rashomon", id: 548, difficultyMult: 1.5 },
        { title: "Ran", id: 11645, difficultyMult: 1.75 },
        { title: "Dreams", id: 1117857, difficultyMult: 2 }
    ],
    "Agnès Varda": [
        { title: "Cléo from 5 to 7", id: 499, difficultyMult: 1 },
        { title: "Vagabond", id: 44018, difficultyMult: 1.25 },
        { title: "Le Bonheur", id: 53023, difficultyMult: 1.5 },
        { title: "Faces Places", id: 451995, difficultyMult: 1.75 },
        { title: "The Gleaners & I", id: 44379, difficultyMult: 2 }
    ],
    "Satyajit Ray": [
        { title: "Pather Panchali", id: 5801, difficultyMult: 1 },
        { title: "Aparajito", id: 897, difficultyMult: 1.25 },
        { title: "The World of Apu", id: 896, difficultyMult: 1.5 },
        { title: "Charulata", id: 35790, difficultyMult: 1.75 },
        { title: "The Music Room", id: 822, difficultyMult: 2 }
    ],
    "Spike Lee": [
        { title: "Do the Right Thing", id: 925, difficultyMult: 1 },
        { title: "Malcolm X", id: 1883, difficultyMult: 1.25 },
        { title: "BlacKkKlansman", id: 487558, difficultyMult: 1.5 },
        { title: "25th Hour", id: 1429, difficultyMult: 1.75 },
        { title: "Bamboozled", id: 24664, difficultyMult: 2 }
    ],
    "Jane Campion": [
        { title: "The Piano", id: 713, difficultyMult: 1 },
        { title: "Bright Star", id: 29963, difficultyMult: 1.25 },
        { title: "The Power of the Dog", id: 600583, difficultyMult: 1.5 },
        { title: "In the Cut", id: 10944, difficultyMult: 1.75 },
        { title: "An Angel at My Table", id: 2891, difficultyMult: 2 }
    ],
    "Bong Joon-ho": [
        { title: "Parasite", id: 496243, difficultyMult: 1 },
        { title: "Snowpiercer", id: 110415, difficultyMult: 1.25 },
        { title: "Memories of Murder", id: 11423, difficultyMult: 1.5 },
        { title: "The Host", id: 1255, difficultyMult: 1.75 },
        { title: "Barking Dogs Never Bite", id: 21531, difficultyMult: 2 }
    ],
    "Guillermo del Toro": [
        { title: "Pan's Labyrinth", id: 1417, difficultyMult: 1 },
        { title: "Hellboy", id: 456740, difficultyMult: 1.25 },
        { title: "The Shape of Water", id: 399055, difficultyMult: 1.5 },
        { title: "Crimson Peak", id: 201085, difficultyMult: 1.75 },
        { title: "The Devil's Backbone", id: 1433, difficultyMult: 2 }
    ],
    "John Singleton": [
        { title: "Boyz n the Hood", id: 650, difficultyMult: 1 },
        { title: "Poetic Justice", id: 8291, difficultyMult: 1.25 },
        { title: "Baby Boy", id: 16161, difficultyMult: 1.5 },
        { title: "Higher Learning", id: 16295, difficultyMult: 1.75 },
        { title: "Rosewood", id: 25624, difficultyMult: 2 }
    ],
    "Ava DuVernay": [
        { title: "Selma", id: 273895, difficultyMult: 1 },
        { title: "13th", id: 13207, difficultyMult: 1.25 },
        { title: "Middle of Nowhere", id: 19688, difficultyMult: 1.5 },
        { title: "I Will Follow", id: 72946, difficultyMult: 1.75 },
        { title: "This is the Life", id: 97399, difficultyMult: 2 }
    ],
    "Chloe Zhao": [
        { title: "Nomadland", id: 581734, difficultyMult: 1 },
        { title: "Eternals", id: 524434, difficultyMult: 1.25 },
        { title: "The Rider", id: 453278, difficultyMult: 1.5 },
        { title: "Songs My Brothers Taught Me", id: 308640, difficultyMult: 1.75 },
        { title: "Daughters", id: 739556, difficultyMult: 2 }
    ]
};

export const TMDB = {
    isConfigured() {
        return Boolean(TMDB_READ_ACCESS_TOKEN || TMDB_API_KEY);
    },
    /**
     * Search for a director by name and return their person ID.
     */
    async searchDirector(name) {
        if (!this.isConfigured()) {
            console.warn("TMDB API Key missing! Returning mock data.");
            return 1; // Mock ID
        }

        try {
            const data = await tmdbFetch('/search/person', { query: name });
            
            if (data.results && data.results.length > 0) {
                // Return the first matching person ID
                return data.results[0].id;
            }
            throw new Error('Director not found');
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    /**
     * Get the hardcoded 5-movie campaign progression for a director, 
     * fetching missing TMDB details (like poster and genre) dynamically.
     */
    async getDirectorFilms(personId, personName = '') {
        const campaign = CAMPAIGN_DATA[personName];
        if (!campaign) {
            console.warn(`No campaign data for ${personName}`);
            return [];
        }

        if (!this.isConfigured()) {
            console.warn("TMDB API Key missing! Returning partial campaign data.");
            return campaign;
        }

        // Fetch full details for the campaign movies in parallel
        try {
            const movies = await Promise.all(campaign.map(async (movie) => {
                const data = await tmdbFetch(`/movie/${movie.id}`);
                return {
                    ...movie,
                    release_date: data.release_date,
                    genre_ids: data.genres ? data.genres.map(g => g.id) : [],
                    poster_path: data.poster_path,
                    popularity: data.popularity
                };
            }));
            return movies;
        } catch (error) {
            console.error("Failed to fetch full campaign movie details:", error);
            return campaign;
        }
    },

    /**
     * Quickly fetch just the poster path for a movie ID.
     */
    async getPosterPath(movieId) {
        if (!this.isConfigured()) return null;
        try {
            const data = await tmdbFetch(`/movie/${movieId}`);
            return data.poster_path;
        } catch (e) {
            return null;
        }
    },

    getGreatestHits(name) {
        const hits = {
            'Stanley Kubrick': [
                { id: 62, title: '2001: A Space Odyssey', release_date: '1968-04-10', genre_ids: [18, 878], poster_path: '/9079Wm749mG49uYI8n9pD869pX9.jpg', cast: [{name: 'Keir Dullea'}, {name: 'Gary Lockwood'}, {name: 'William Sylvester'}] },
                { id: 387, title: 'The Shining', release_date: '1980-05-23', genre_ids: [27], poster_path: '/f9ca99fO9uYmS9UuD9S9S9S9S9.jpg', cast: [{name: 'Jack Nicholson'}, {name: 'Shelley Duvall'}, {name: 'Danny Lloyd'}] },
                { id: 600, title: 'Full Metal Jacket', release_date: '1987-06-26', genre_ids: [18, 10752], poster_path: '/k679 Wm749mG49uYI8n9pD869pX9.jpg', cast: [{name: 'Matthew Modine'}, {name: 'Adam Baldwin'}, {name: 'Vincent D\'Onofrio'}] }
            ],
            'Steven Spielberg': [
                { id: 571, title: 'Jurassic Park', release_date: '1993-06-11', genre_ids: [12, 878], cast: [{name: 'Sam Neill'}, {name: 'Laura Dern'}, {name: 'Jeff Goldblum'}] },
                { id: 185, title: 'Saving Private Ryan', release_date: '1998-07-24', genre_ids: [18, 10752], cast: [{name: 'Tom Hanks'}, {name: 'Edward Burns'}, {name: 'Matt Damon'}] },
                { id: 85, title: 'Raiders of the Lost Ark', release_date: '1981-06-12', genre_ids: [12, 28], cast: [{name: 'Harrison Ford'}, {name: 'Karen Allen'}, {name: 'Paul Freeman'}] }
            ]
        };
        return hits[name] || null;
    },

    getHardcodedDirectors() {
        const directorPool = [
            {
                id: 1032,
                tmdbId: 1032,
                portraitKey: 'portrait_akira_kurosawa',
                portraitFrame: 0,
                name: 'Akira Kurosawa',
                cinematicFact: 'Samurai Master.',
                traits: { pegBounce: 0.15, startingBalls: -1 },
                traitLines: ['+15% Bounce / -1 Ball']
            },
            {
                id: 1146,
                tmdbId: 1146,
                portraitKey: 'portrait_agnes_varda',
                portraitFrame: 1,
                name: 'Agnès Varda',
                cinematicFact: 'French New Wave.',
                traits: { targetScoreMult: 0.8, bucketWidthMult: 0.8 },
                traitLines: ['+20% Score / Smaller Buckets']
            },
            {
                id: 14781,
                tmdbId: 14781,
                portraitKey: 'portrait_satyajit_ray',
                portraitFrame: 2,
                name: 'Satyajit Ray',
                cinematicFact: 'Humanist Icon.',
                traits: { startingBalls: 2, gravityMult: 1.2 },
                traitLines: ['+2 Balls / Heavy Gravity']
            },
            {
                id: 110,
                tmdbId: 110,
                portraitKey: 'portrait_spike_lee',
                portraitFrame: 3,
                name: 'Spike Lee',
                cinematicFact: 'Social Visionary.',
                traits: { multiBallSpawnRate: 2, shopPriceMult: 1.1 },
                traitLines: ['Multi-ball x2 / Cost +10%']
            },
            {
                id: 3016,
                tmdbId: 3016,
                portraitKey: 'portrait_jane_campion',
                portraitFrame: 4,
                name: 'Jane Campion',
                cinematicFact: 'Poetic Visuals.',
                traits: { timeScale: 0.8, gravityMult: 0.95 },
                traitLines: ['Slow-Mo / -5% Gravity']
            },
            {
                id: 7856,
                tmdbId: 7856,
                portraitKey: 'portrait_john_singleton',
                portraitFrame: 5,
                name: 'John Singleton',
                cinematicFact: 'Urban Realism.',
                traits: { ballSpeedMult: 1.1, multiplierSpeed: 1.2 },
                traitLines: ['+10% Speed / Fast Multiplier']
            },
            {
                id: 21684,
                tmdbId: 21684,
                portraitKey: 'portrait_bong_joon_ho',
                portraitFrame: 6,
                name: 'Bong Joon-ho',
                cinematicFact: 'Genre Blender.',
                traits: { pegFriction: 0.1, mysteryBuckets: true },
                traitLines: ['High Friction / Mystery Buckets']
            },
            {
                id: 108316,
                tmdbId: 108316,
                portraitKey: 'portrait_ava_duvernay',
                portraitFrame: 7,
                name: 'Ava DuVernay',
                cinematicFact: 'Drama Power.',
                traits: { startingLives: 1, pegBounce: -0.1 },
                traitLines: ['Extra Lives / Low Bounce']
            },
            {
                id: 10828,
                tmdbId: 10828,
                portraitKey: 'portrait_guillermo_del_toro',
                portraitFrame: 8,
                name: 'Guillermo del Toro',
                cinematicFact: 'Monster Maker.',
                traits: { monsterPegs: true, targetScoreMult: 1.1 },
                traitLines: ['Monster Pegs / -10% Score']
            },
            {
                id: 1982736,
                tmdbId: 1982736,
                portraitKey: 'portrait_chloe_zhao',
                portraitFrame: 9,
                name: 'Chloe Zhao',
                cinematicFact: 'Indie Spirit.',
                traits: { bucketWidthMult: 1.25, noMultiplier: true },
                traitLines: ['Wide Buckets / No Multi-ball']
            }
        ];

        if (directorPool.length !== 10) {
            throw new Error(`DIRECTOR_POOL must contain exactly 10 entries. Found ${directorPool.length}.`);
        }

        directorPool.forEach((director, index) => {
            director.portraitFrame = index;
        });

        return directorPool;
    },

    async getDirectorProfile(personId) {
        if (!this.isConfigured()) {
            return {
                profile_path: null,
                birthday: null,
                place_of_birth: null,
                biography: ''
            };
        }
        try {
            const data = await tmdbFetch(`/person/${personId}`);
            return {
                profile_path: data.profile_path || null,
                birthday: data.birthday || null,
                place_of_birth: data.place_of_birth || null,
                biography: data.biography || ''
            };
        } catch(e) {
            return {
                profile_path: null,
                birthday: null,
                place_of_birth: null,
                biography: ''
            };
        }
    },

    /**
     * Fetch cast credits for a movie.
     */
    async getMovieCredits(movieId) {
        if (!this.isConfigured()) return [];
        try {
            const data = await tmdbFetch(`/movie/${movieId}/credits`);
            return (data.cast || []).slice(0, 3).map(actor => ({
                name: actor.name,
                profilePath: actor.profile_path ? `https://image.tmdb.org/t/p/w200${actor.profile_path}` : null
            }));
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    /**
     * Helper to map raw film data to gameplay parameters
     */
    getLevelDataFromFilm(movieData) {
        // Mock default values if we don't do a full movie details fetch
        // (Getting exact budget/runtime usually requires hitting /movie/{id})
        
        let targetScore = 5000;
        let balls = 10;
        let friction = 0.001;
        let themeColor = 0x222222;

        // Simple mock mapping based on genre IDs if available
        if (movieData.genre_ids) {
            if (movieData.genre_ids.includes(27)) { // Horror
                friction = 0.05; // Sticky pegs
                themeColor = 0x4a0e0e;
            } else if (movieData.genre_ids.includes(35)) { // Comedy
                balls += 5; // More balls
                themeColor = 0x0e4a2c;
            } else if (movieData.genre_ids.includes(28)) { // Action
                targetScore += 2000; // Harder score
                themeColor = 0x4a2e0e;
            }
        }

        return {
            title: movieData.title || "Unknown Film",
            posterPath: movieData.posterPath
                || (movieData.poster_path
                    ? (movieData.poster_path.startsWith('http') || movieData.poster_path.startsWith('/src/')
                        ? movieData.poster_path
                        : `https://image.tmdb.org/t/p/w500${movieData.poster_path}`)
                    : null),
            targetScore,
            balls,
            friction,
            themeColor,
            releaseYear: movieData.release_date ? movieData.release_date.split('-')[0] : 'N/A'
        };
    },

    getFallbackSelection() {
        const baseDirector = this.getHardcodedDirectors().find((director) => director.name === 'Akira Kurosawa')
            || this.getHardcodedDirectors()[0];
        const placeholderPath = '/assets/images/Logo.jpg';

        return {
            ...baseDirector,
            name: 'Akira Kurosawa',
            profilePath: placeholderPath,
            birthday: '1910-03-23',
            placeOfBirth: 'Shinagawa, Tokyo Prefecture, Japan',
            biography: 'Offline fallback mode is active. Akira Kurosawa steps in with weather-beaten epics, dynamic motion, and a global film language that still shapes directors today.',
            films: [
                { id: 9101, title: 'Offline Mode: Rashomon Gate', release_date: '1950-08-26', genre_ids: [18], posterPath: placeholderPath },
                { id: 9102, title: 'Offline Mode: Seven Shadows', release_date: '1954-04-26', genre_ids: [28], posterPath: placeholderPath },
                { id: 9103, title: 'Offline Mode: Red Beard Run', release_date: '1965-04-03', genre_ids: [35], posterPath: placeholderPath }
            ]
        };
    },

    getMockFilmography(personId = 1) {
        const mockNames = {
            488: 'Steven Spielberg',
            5602: 'John Carpenter',
            1032: 'Martin Scorsese'
        };
        const name = mockNames[personId] || 'Mock Director';
        
        return [
            { id: 101, title: `${name}'s First Movie`, release_date: '1975-01-01', genre_ids: [28] },
            { id: 102, title: `${name}'s Masterpiece`, release_date: '1985-01-01', genre_ids: [35] },
            { id: 103, title: `${name}'s Comeback`, release_date: '2005-01-01', genre_ids: [27] },
            { id: 104, title: `${name}'s Sequel`, release_date: '2010-01-01', genre_ids: [28] },
            { id: 105, title: `${name}'s Finale`, release_date: '2020-01-01', genre_ids: [35] },
        ];
    }
};
