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
        { title: "Seven Samurai", id: 346, difficultyMult: 1, poster_path: "/8OKmBV5BUFzmozIC3pPWKHy17kx.jpg", overview: "A village of farmers hire seven masterless samurai to help them defend themselves against bandits." },
        { title: "Yojimbo", id: 11878, difficultyMult: 1.25, overview: "A nameless ronin arrives in a town divided by two warring gangs." },
        { title: "Rashomon", id: 548, difficultyMult: 1.5, overview: "The stories of a murder and a rape are told from four different perspectives." },
        { title: "Ran", id: 11645, difficultyMult: 1.75, overview: "An aging warlord decides to abdicate as ruler and divide his domain among his three sons." },
        { title: "Dreams", id: 12516, difficultyMult: 2, poster_path: "/eVo6ewq4akfyJYy3GXkMsLNzEJc.jpg", overview: "A collection of short films based on actual dreams that director Akira Kurosawa claimed to have had." }
    ],
    "Agnès Varda": [
        { title: "Cléo from 5 to 7", id: 499, difficultyMult: 1, overview: "Cléo, a singer, awaits the results of a medical test.", poster_path: null },
        { title: "Vagabond", id: 44018, difficultyMult: 1.25, overview: "A young woman wanders through the French countryside during a cold winter.", poster_path: null },
        { title: "Le Bonheur", id: 53023, difficultyMult: 1.5, overview: "A happily married carpenter falls in love with a woman at the post office.", poster_path: null },
        { title: "Faces Places", id: 451995, difficultyMult: 1.75, overview: "Varda and JR travel through rural France, creating large-scale portraits of the people they encounter.", poster_path: null },
        { title: "The Gleaners & I", id: 44379, difficultyMult: 2, overview: "A documentary about people who forage for food and discarded items.", poster_path: null }
    ],
    "Satyajit Ray": [
        { title: "Pather Panchali", id: 5801, difficultyMult: 1, overview: "The childhood of Apu in a rural Bengali village.", poster_path: "/92zR1w365t184o9Yg58z1sK4X6K.jpg" },
        { title: "Aparajito", id: 897, difficultyMult: 1.25, overview: "Apu's life as a student in Varanasi and Calcutta." },
        { title: "The World of Apu", id: 896, difficultyMult: 1.5, overview: "Apu's adulthood, marriage, and relationship with his son." },
        { title: "Charulata", id: 35790, difficultyMult: 1.75, overview: "A lonely woman in 19th-century Bengal falls in love with her husband's cousin." },
        { title: "The Music Room", id: 822, difficultyMult: 2, overview: "A landlord spends the last of his fortune on music concerts to maintain his social status." }
    ],
    "Spike Lee": [
        { title: "Do the Right Thing", id: 925, difficultyMult: 1, overview: "On the hottest day of the year on a street in Bedford-Stuyvesant, Brooklyn, everyone's hate and bigotry smolders and builds until it explodes into violence.", poster_path: "/6yqL95yDkGj7r5N04r3v245lG.jpg" },
        { title: "Malcolm X", id: 1883, difficultyMult: 1.25, overview: "A tribute to the controversial Black nationalist leader." },
        { title: "BlacKkKlansman", id: 487558, difficultyMult: 1.5, overview: "An African American police officer from Colorado Springs successfully manages to infiltrate the local Ku Klux Klan branch." },
        { title: "25th Hour", id: 1429, difficultyMult: 1.75, overview: "A man has 24 hours to say goodbye to his family and friends before he begins a seven-year prison sentence." },
        { title: "Bamboozled", id: 24664, difficultyMult: 2, overview: "A frustrated African American TV writer proposes a blackface minstrel show in protest, but to his horror, it becomes a smash hit." }
    ],
    "Jane Campion": [
        { title: "The Piano", id: 713, difficultyMult: 1, overview: "A mute woman and her daughter are sent to New Zealand for an arranged marriage.", poster_path: "/vH3P31x4J47V0d3o0hG18iR3gK.jpg" },
        { title: "Bright Star", id: 29963, difficultyMult: 1.25, overview: "The three-year romance between 19th-century poet John Keats and Fanny Brawne.", poster_path: null },
        { title: "The Power of the Dog", id: 600583, difficultyMult: 1.5, overview: "A domineering but charismatic rancher wages a war of intimidation on his brother's new wife and her son.", poster_path: null },
        { title: "In the Cut", id: 10944, difficultyMult: 1.75, overview: "A lonely writer becomes obsessed with a gruesome murder and the detective investigating it.", poster_path: null },
        { title: "An Angel at My Table", id: 2891, difficultyMult: 2, overview: "A film based on the autobiographies of New Zealand writer Janet Frame.", poster_path: null }
    ],
    "Bong Joon-ho": [
        { title: "Parasite", id: 496243, difficultyMult: 1, overview: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.", poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
        { title: "Snowpiercer", id: 110415, difficultyMult: 1.25, overview: "In a future where a failed climate-change experiment has killed all life except for the lucky few who boarded the Snowpiercer, a new class system emerges.", poster_path: null },
        { title: "Memories of Murder", id: 11423, difficultyMult: 1.5, overview: "In 1986, two small-town detectives struggle with the case of a multiple-murderer who they have no way of identifying.", poster_path: null },
        { title: "The Host", id: 1255, difficultyMult: 1.75, overview: "A monster emerges from Seoul's Han River and begins attacking people.", poster_path: null },
        { title: "Barking Dogs Never Bite", id: 21531, difficultyMult: 2, overview: "An idle part-time lecturer is annoyed by the barking of a dog in his apartment complex.", poster_path: null }
    ],
    "Guillermo del Toro": [
        { title: "Pan's Labyrinth", id: 1417, difficultyMult: 1, overview: "In the Phalangist Spain of 1944, the young stepdaughter of a sadistic army officer escapes into an eerie but captivating fantasy world.", poster_path: "/d535nU76F6V2H0773zW1j8Yg0QW.jpg" },
        { title: "Hellboy", id: 456740, difficultyMult: 1.25, overview: "A demon, raised from infancy after being conjured by and rescued from the Nazis, grows up to become a defender against the forces of darkness.", poster_path: null },
        { title: "The Shape of Water", id: 399055, difficultyMult: 1.5, overview: "At a top-secret research facility in the 1960s, a lonely janitor forms a unique relationship with an amphibious creature that is being held in captivity.", poster_path: null },
        { title: "Crimson Peak", id: 201085, difficultyMult: 1.75, overview: "After a family tragedy, an aspiring author is torn between love for her childhood friend and the temptation of a mysterious outsider.", poster_path: null },
        { title: "The Devil's Backbone", id: 1433, difficultyMult: 2, overview: "After his father is killed in the Spanish Civil War, ten-year-old Carlos is sent to a remote orphanage where he discovers the school is haunted.", poster_path: null }
    ],
    "John Singleton": [
        { title: "Boyz n the Hood", id: 650, difficultyMult: 1, overview: "Follows the lives of three young males living in the Crenshaw ghetto of Los Angeles, dissecting questions of race, relationships, violence, and future prospects.", poster_path: "/z7HlPqJvT3w7v6zN1o9y2Fk6y4z.jpg" },
        { title: "Poetic Justice", id: 8291, difficultyMult: 1.25, overview: "A woman grieving for her murdered boyfriend goes on a road trip from South Central L.A. to Oakland.", poster_path: null },
        { title: "Baby Boy", id: 16161, difficultyMult: 1.5, overview: "A young street-smart man with two children from different mothers lives with his mother while struggling to make a life for himself.", poster_path: null },
        { title: "Higher Learning", id: 16295, difficultyMult: 1.75, overview: "People from all different walks of life, races, and social backgrounds meet at Columbus University.", poster_path: null },
        { title: "Rosewood", id: 25624, difficultyMult: 2, overview: "A dramatization of a 1923 horrific racist lynch mob attack on an African American community.", poster_path: null }
    ],
    "Ava DuVernay": [
        { title: "Selma", id: 273895, difficultyMult: 1, overview: "A chronicle of Dr. Martin Luther King, Jr.'s campaign to secure equal voting rights via an epic march from Selma to Montgomery, Alabama, in 1965.", poster_path: null },
        { title: "13th", id: 13207, difficultyMult: 1.25, overview: "An in-depth look at the prison system in the United States and how it reveals the nation's history of racial inequality.", poster_path: null },
        { title: "Middle of Nowhere", id: 19688, difficultyMult: 1.5, overview: "When her husband is sentenced to eight years in prison, Ruby drops out of medical school to focus on his well-being while he's incarcerated.", poster_path: null },
        { title: "I Will Follow", id: 72946, difficultyMult: 1.75, overview: "A chronicle of a woman's life as she moves out of the home she shared with her aunt.", poster_path: null },
        { title: "This is the Life", id: 97399, difficultyMult: 2, overview: "A documentary on the alternative hip-hop scene in Los Angeles during the 1990s.", poster_path: null }
    ],
    "Chloe Zhao": [
        { title: "Nomadland", id: 581734, difficultyMult: 1, overview: "A woman in her sixties, after losing everything in the Great Recession, embarks on a journey through the American West, living as a van-dwelling modern-day nomad.", poster_path: "/6M7P4sW1eKx5uJ3oN2m2rQyQ2s.jpg" },
        { title: "Eternals", id: 524434, difficultyMult: 1.25, overview: "The saga of the Eternals, a race of immortal beings who lived on Earth and shaped its history and civilizations.", poster_path: null },
        { title: "The Rider", id: 453278, difficultyMult: 1.5, overview: "After a riding accident leaves him unable to compete, a young cowboy searches for a new identity and what it means to be a man in the heartland of America.", poster_path: null },
        { title: "Songs My Brothers Taught Me", id: 308640, difficultyMult: 1.75, overview: "A portrait of the modern-day Lakota on the Pine Ridge Indian Reservation.", poster_path: null },
        { title: "Daughters", id: 739556, difficultyMult: 2, overview: "A documentary following four young girls as they prepare for a special Daddy Daughter Dance with their incarcerated fathers.", poster_path: null }
    ]
};

const DIRECTOR_PROFILE_FALLBACKS = {
    'Akira Kurosawa': {
        birthday: '1910-03-23',
        place_of_birth: 'Shinagawa, Tokyo, Japan',
        biography: 'Akira Kurosawa was a Japanese filmmaker whose dynamic editing, weather-lashed action, and moral sweep helped shape modern world cinema.'
    },
    'Agnès Varda': {
        birthday: '1928-05-30',
        place_of_birth: 'Ixelles, Brussels, Belgium',
        biography: 'Agnès Varda was a Belgian-born French director, photographer, and essayist whose playful, personal films helped define the Left Bank of the French New Wave.'
    },
    'Satyajit Ray': {
        birthday: '1921-05-02',
        place_of_birth: 'Calcutta, Bengal Presidency, British India',
        biography: 'Satyajit Ray was an Indian filmmaker, writer, and composer celebrated for humane storytelling, observational detail, and the Apu Trilogy.'
    },
    'Spike Lee': {
        birthday: '1957-03-20',
        place_of_birth: 'Atlanta, Georgia, USA',
        biography: 'Spike Lee is an American director, writer, and producer whose films fuse political urgency, neighborhood specificity, and direct visual address.'
    },
    'Jane Campion': {
        birthday: '1954-04-30',
        place_of_birth: 'Wellington, New Zealand',
        biography: 'Jane Campion is a New Zealand filmmaker known for psychologically rich dramas centered on desire, power, and women living against social constraint.'
    },
    'John Singleton': {
        birthday: '1968-01-06',
        place_of_birth: 'Los Angeles, California, USA',
        biography: 'John Singleton was an American filmmaker whose work brought South Los Angeles to mainstream cinema with urgency, empathy, and generational perspective.'
    },
    'Bong Joon-ho': {
        birthday: '1969-09-14',
        place_of_birth: 'Daegu, South Korea',
        biography: 'Bong Joon-ho is a South Korean filmmaker celebrated for sliding between satire, suspense, and social critique without losing emotional clarity.'
    },
    'Ava DuVernay': {
        birthday: '1972-08-24',
        place_of_birth: 'Long Beach, California, USA',
        biography: 'Ava DuVernay is an American filmmaker whose work explores Black history, structural injustice, and intimate character struggle with moral force.'
    },
    'Guillermo del Toro': {
        birthday: '1964-10-09',
        place_of_birth: 'Guadalajara, Jalisco, Mexico',
        biography: 'Guillermo del Toro is a Mexican filmmaker known for merging horror, fairy tale imagery, and deep sympathy for monsters and outsiders.'
    },
    'Chloe Zhao': {
        birthday: '1982-03-31',
        place_of_birth: 'Beijing, China',
        biography: 'Chloe Zhao is a Chinese-born filmmaker whose spare, lyrical work often blends non-professional performers, landscape, and lived experience.'
    }
};

function getFallbackDirectorProfile(name) {
    return DIRECTOR_PROFILE_FALLBACKS[name] || {
        birthday: null,
        place_of_birth: null,
        biography: ''
    };
}

export const TMDB = {
    CAMPAIGN_DATA,
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

        // If we already have posters and overviews hardcoded, we can skip the TMDB fetch for speed
        const hasAllDetails = campaign.every(f => f.poster_path && f.overview);
        if (hasAllDetails) return campaign;

        if (!this.isConfigured()) {
            console.warn("TMDB API Key missing! Returning partial campaign data.");
            return campaign;
        }

        // Fetch full details for the campaign movies in parallel
        try {
            const movies = await Promise.all(campaign.map(async (movie) => {
                // Only fetch if data is missing
                if (movie.poster_path && movie.overview) return movie;

                const data = await tmdbFetch(`/movie/${movie.id}`);
                return {
                    ...movie,
                    release_date: data.release_date,
                    genre_ids: data.genres ? data.genres.map(g => g.id) : [],
                    poster_path: data.poster_path,
                    popularity: data.popularity,
                    overview: data.overview || movie.overview
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
                id: 5026,
                tmdbId: 5026,
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

    async getDirectorProfile(personId, personName = '') {
        const fallback = getFallbackDirectorProfile(personName);
        if (!this.isConfigured()) {
            return {
                profile_path: null,
                birthday: fallback.birthday,
                place_of_birth: fallback.place_of_birth,
                biography: fallback.biography
            };
        }
        try {
            const data = await tmdbFetch(`/person/${personId}`);
            return {
                profile_path: data.profile_path || null,
                birthday: data.birthday || fallback.birthday,
                place_of_birth: data.place_of_birth || fallback.place_of_birth,
                biography: data.biography || fallback.biography
            };
        } catch(e) {
            return {
                profile_path: null,
                birthday: fallback.birthday,
                place_of_birth: fallback.place_of_birth,
                biography: fallback.biography
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
