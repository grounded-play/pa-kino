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
        { title: "Seven Samurai", id: 346, difficultyMult: 1, poster_path: "/lOMGc8bnSwQhS4XyE1S99uH8NXf.jpg", overview: "A samurai answers a village's request for protection after he falls on hard times. The town needs protection from bandits, so the samurai gathers six others to help him teach the people how to defend themselves, and the villagers provide the soldiers with food." },
        { title: "Yojimbo", id: 11878, difficultyMult: 1.25, poster_path: "/tN7kYPjRhDolpui9sc9Eq9n5b2O.jpg", overview: "A nameless ronin, or samurai with no master, enters a small village in feudal Japan where two rival businessmen are struggling for control of the local gambling trade. Taking the name Sanjuro Kuwabatake, the ronin convinces both sides to hire him." },
        { title: "Rashomon", id: 548, difficultyMult: 1.5, poster_path: "/vL7Xw04nFMHwnvXRFCmYYAzMUvY.jpg", overview: "Four people recount different versions of the story of a man's murder and the rape of his wife." },
        { title: "Ran", id: 11645, difficultyMult: 1.75, poster_path: "/1gKWXRVgesduqHDfR8siXppfELO.jpg", overview: "Shakespeare's King Lear is reimagined as a singular historical epic set in sixteenth-century Japan where an aging warlord divides his kingdom between his three sons." },
        { title: "Dreams", id: 12516, difficultyMult: 2, poster_path: "/ua17wrOrUjyqxuYmnUrmOVBMf4G.jpg", overview: "Eight visually rich vignettes drawn from Kurosawa's own dreams — fox weddings and vanished orchards, a soldier's ghosts, a walk through Van Gogh's canvases, nuclear nightmares, and a water-mill utopia." }
    ],
    "Agnès Varda": [
        { title: "Cléo from 5 to 7", id: 499, difficultyMult: 1, poster_path: "/oelBStY4xpguaplRv15P3Za7Xsr.jpg", overview: "Agnès Varda captures Paris in the sixties with this real-time portrait of a singer set adrift in the city as she awaits biopsy results. A chronicle of the minutes of one woman's life." },
        { title: "Vagabond", id: 44018, difficultyMult: 1.25, poster_path: "/2KFfwiPct1hwqi9dkKqoom0BenC.jpg", overview: "Mona Bergeron is dead, her frozen body found in a ditch in the French countryside. The film flashes back to the weeks leading up to her death as she travels from place to place." },
        { title: "Le Bonheur", id: 53023, difficultyMult: 1.5, poster_path: "/r6UYog9MruOe4X71AS57EhuJrFq.jpg", overview: "Though married to the beautiful Thérèse, young husband François finds himself falling into an affair with an attractive postal worker. Varda's most provocative film examines happiness with a savage undertow." },
        { title: "Faces Places", id: 451995, difficultyMult: 1.75, poster_path: "/1NX6NTj9FiiJwEgRUmEifSzE7Na.jpg", overview: "Director Agnès Varda and photographer/muralist JR journey through rural France and form an unlikely friendship, creating large-scale portraits of the people they encounter." },
        { title: "The Gleaners & I", id: 44379, difficultyMult: 2, poster_path: "/6IdCTKi4Eu7i897jpe59wIDGCri.jpg", overview: "Varda follows gleaners — those who scour already-reaped fields for the odd potato or turnip — from forgotten corners of the French countryside to off-hours at the green markets of Paris." }
    ],
    "Satyajit Ray": [
        { title: "Pather Panchali", id: 5801, difficultyMult: 1, poster_path: "/frZj5djlU9hFEjMcL21RJZVuG5O.jpg", overview: "Impoverished priest Harihar Ray leaves his rural Bengal village in search of work. His wife looks after their rebellious daughter Durga, young son Apu, and an elderly relative in a story of childhood and poverty." },
        { title: "Aparajito", id: 897, difficultyMult: 1.25, poster_path: "/qvR2Qs42WHwCEcuwhQnterU3gVY.jpg", overview: "Apu and his family move to the holy city of Benares. As he grows from wide-eyed child to intellectually curious teenager, eventually studying in Kolkata, we witness his academic and moral education." },
        { title: "The World of Apu", id: 896, difficultyMult: 1.5, poster_path: "/6Tz1Q69o2n3Zwb0ZffzPL0nFt2T.jpg", overview: "Apu, a jobless ex-student dreaming of a future as a writer, is invited to a village wedding. The journey reshapes his life in ways he could never have anticipated." },
        { title: "Charulata", id: 35790, difficultyMult: 1.75, poster_path: "/uy1x7AFgcurs9twcEw0p0FOVQnx.jpg", overview: "In 1870s India, Charulata is an isolated, artistically inclined woman who sees little of her busy journalist husband. He convinces his cousin Amal to spend time with her, with unforeseen consequences." },
        { title: "The Music Room", id: 822, difficultyMult: 2, poster_path: "/1coINFn9GDeFr09QtkzjgTUbev5.jpg", overview: "An aging, decadent landlord's passion for music becomes the undoing of his legacy as he sacrifices his wealth to compete with the opulent music room of his younger, richer neighbour." }
    ],
    "Spike Lee": [
        { title: "Do the Right Thing", id: 925, difficultyMult: 1, poster_path: "/63rmSDPahrH7C1gEFYzRuIBAN9W.jpg", overview: "On the hottest day of the year in Bedford-Stuyvesant, Brooklyn, everyone's heat and bigotry smolders until it explodes into violence. A neighborhood confrontation at Sal's pizzeria becomes a flashpoint." },
        { title: "Malcolm X", id: 1883, difficultyMult: 1.25, poster_path: "/o2s9ow0uRRm1BcF3teznk5twd90.jpg", overview: "A tribute to the controversial Black activist and leader of the struggle for Black liberation. From street hustler to prison convert to Nation of Islam leader, his legacy reshaped a generation." },
        { title: "BlacKkKlansman", id: 487558, difficultyMult: 1.5, poster_path: "/8jxqAvSDoneSKRczaK8v9X5gqBp.jpg", overview: "Colorado Springs, late 1970s. Ron Stallworth, an African American police officer, and Flip Zimmerman, his Jewish colleague, run an undercover operation to infiltrate the Ku Klux Klan." },
        { title: "25th Hour", id: 1429, difficultyMult: 1.75, poster_path: "/uW7tTRElr2tRhmAVESzvHy4ByXg.jpg", overview: "On the eve of a seven-year prison sentence, a New York drug dealer spends his final day of freedom confronting his past, his relationships, and the choices that led to his downfall in a post-9/11 city." },
        { title: "Bamboozled", id: 24664, difficultyMult: 2, poster_path: "/oAg1mUUxdWJNLa6t1gctbQhXHVN.jpg", overview: "Frustrated when network brass reject his sitcom idea, producer Pierre Delacroix pitches the worst idea he can think of in an attempt to get fired: a 21st-century minstrel show. It becomes a smash hit." }
    ],
    "Jane Campion": [
        { title: "The Piano", id: 713, difficultyMult: 1, poster_path: "/dUxjG6baSzGIgP7R8BQI5rpMuET.jpg", overview: "When an arranged marriage brings Ada and her spirited daughter to the wilderness of nineteenth-century New Zealand, she finds herself locked in a battle of wills with her controlling husband and a rugged frontiersman." },
        { title: "Bright Star", id: 29963, difficultyMult: 1.25, poster_path: "/fHea3yuHjpxSQc9X8LDSMobunz4.jpg", overview: "In 1818, high-spirited young Fanny Brawne finds herself increasingly intrigued by the handsome but aloof poet John Keats, who lives next door. A romance unfolds through letters, poetry, and seasons." },
        { title: "The Power of the Dog", id: 600583, difficultyMult: 1.5, poster_path: "/kEy48iCzGnp0ao1cZbNeWR6yIhC.jpg", overview: "A domineering but charismatic rancher wages a war of intimidation on his brother's new wife and her teen son, until long-hidden secrets come to light on the Montana plains." },
        { title: "In the Cut", id: 10944, difficultyMult: 1.75, poster_path: "/c8Xg0yc8UQwDXooffBNLLs2BvQH.jpg", overview: "A New York City writing professor has an affair with a police detective who is investigating the murder of a beautiful young woman in her neighborhood, blurring desire and danger." },
        { title: "An Angel at My Table", id: 2891, difficultyMult: 2, poster_path: "/sDICHxQRDkS4TvIDcUgO9URJxu1.jpg", overview: "Based on the autobiographies of New Zealand writer Janet Frame, this production depicts the author at various stages of her life — from an impoverished childhood through misdiagnosis and her emergence as a literary voice." }
    ],
    "Bong Joon-ho": [
        { title: "Parasite", id: 496243, difficultyMult: 1, poster_path: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", overview: "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident." },
        { title: "Snowpiercer", id: 110415, difficultyMult: 1.25, poster_path: "/kw6YQudA0TMcNmGUGy5XIw7zbnV.jpg", overview: "In a future where a failed global-warming experiment kills off most life on the planet, a class system evolves aboard the Snowpiercer — a train that travels around the globe via a perpetual-motion engine." },
        { title: "Memories of Murder", id: 11423, difficultyMult: 1.5, poster_path: "/dsEoTJKM1s5OVDkS2P2JdoTxo4K.jpg", overview: "A serial rapist and murderer terrorizes a small province in 1980s South Korea. Three increasingly desperate detectives with conflicting methods race against time to identify the killer." },
        { title: "The Host", id: 1255, difficultyMult: 1.75, poster_path: "/m3OE5bpcGHMWYlPkYvgIrncuuGN.jpg", overview: "A teenage girl is captured by a giant mutated creature that appears from Seoul's Han River after toxic waste was dumped in it, prompting her family into a frantic search for her." },
        { title: "Barking Dogs Never Bite", id: 21531, difficultyMult: 2, poster_path: "/6jTxgTN3rS2p1DH36IsBsVpdF5e.jpg", overview: "An idle part-time college lecturer is annoyed by the yapping of a nearby dog in his apartment complex. He decides to take increasingly drastic action." }
    ],
    "Guillermo del Toro": [
        { title: "Pan's Labyrinth", id: 1417, difficultyMult: 1, poster_path: "/z7xXihu5wHuSMWymq5VAulPVuvg.jpg", overview: "In post–civil war Spain, 10-year-old Ofelia moves with her pregnant mother to live under her cruel stepfather. Drawn into a labyrinth, she meets a faun who reveals she may be a lost princess from an underground kingdom." },
        { title: "Hellboy", id: 1487, difficultyMult: 1.25, poster_path: "/lbaTEneOofwvAyg77R8HbFML2zT.jpg", overview: "In the final days of World War II, the Nazis attempt to use black magic. The Allies raid the ceremony, but not before a baby demon is summoned — rescued by Allied forces and dubbed Hellboy." },
        { title: "The Shape of Water", id: 399055, difficultyMult: 1.5, poster_path: "/9zfwPffUXpBrEP26yp0q1ckXDcj.jpg", overview: "Set against Cold War era America in 1962, a mute janitor working at a top-secret lab falls in love with an amphibious man being held captive there and devises a plan to help him escape." },
        { title: "Crimson Peak", id: 201085, difficultyMult: 1.75, poster_path: "/f9TOb5anVwZeSbYjU1qNxPk3KUk.jpg", overview: "In the aftermath of a family tragedy, an aspiring author is swept away to a house that breathes, bleeds — and remembers. A gothic romance where the ghosts are real but the greatest threat is human." },
        { title: "The Devil's Backbone", id: 1433, difficultyMult: 2, poster_path: "/iP1z1aJzPnkP8FHg77TS7ukqoEZ.jpg", overview: "Spain, 1939. In the last days of the Spanish Civil War, young Carlos arrives at the Santa Lucía orphanage, where he makes friends and enemies as he follows the quiet footsteps of a mysterious presence eager for revenge." }
    ],
    "John Singleton": [
        { title: "Boyz n the Hood", id: 650, difficultyMult: 1, poster_path: "/v4ox4aSCNT5vyLXl4Q71JiWwCXW.jpg", overview: "In the Los Angeles ghetto, drugs, robberies and shootings dominate everyday life. Furious tries to raise his son Tre to be a decent person while Tre's friends drag them toward violence." },
        { title: "Poetic Justice", id: 8291, difficultyMult: 1.25, poster_path: "/6jE7Vzh3edBQtbbDcF4AC5gMX2g.jpg", overview: "Still grieving after the murder of her boyfriend, hairdresser Justice writes poetry to deal with the pain. Unable to get to Oakland, she gets a lift with her friend and the friend's mail-carrier boyfriend." },
        { title: "Baby Boy", id: 16161, difficultyMult: 1.5, poster_path: "/2zhkM2rxCPVLxuZRYejcTiOhzfU.jpg", overview: "Jody, a misguided 20-year-old African-American, is finally forced to face the commitments of real life. Streetwise and jobless, he has fathered two children by two different women while still living with his mother." },
        { title: "Higher Learning", id: 16295, difficultyMult: 1.75, poster_path: "/tuud1Blsdwo1KQRdz5UVwjlLAWQ.jpg", overview: "At Columbus University, students from all walks of life collide — a Black athlete on scholarship, a white freshman seduced by a neo-Nazi recruiter, and a young woman finding her voice amid campus violence." },
        { title: "Rosewood", id: 25624, difficultyMult: 2, poster_path: "/5EeTYDXdrpD9mZSSwsrFbqgok9U.jpg", overview: "Spurred by a white woman's lie, vigilantes destroy a Black Florida town and slay its inhabitants in 1923. A dramatization of the Rosewood massacre." }
    ],
    "Ava DuVernay": [
        { title: "Selma", id: 273895, difficultyMult: 1, poster_path: "/2QyUcitU0hrxy6B2zkyJ0EhNlqm.jpg", overview: "A chronicle of Dr. Martin Luther King Jr.'s campaign to secure equal voting rights via an epic march from Selma to Montgomery, Alabama, in 1965, and the brutal response that forced President Johnson to act." },
        { title: "13th", id: 387344, difficultyMult: 1.25, poster_path: null, overview: "An in-depth look at the prison system in the United States and how it reveals the nation's history of racial inequality — from the 13th Amendment's slavery loophole to mass incarceration." },
        { title: "Middle of Nowhere", id: 83588, difficultyMult: 1.5, poster_path: "/s0Jtw4YYRQ460vo0QfrjrdLqJCf.jpg", overview: "When her husband is sentenced to eight years in prison, Ruby drops out of medical school in order to focus on his well-being while he's incarcerated — leading her on a journey of self-discovery." },
        { title: "I Will Follow", id: 72946, difficultyMult: 1.75, poster_path: "/bAMm9Yc1j9nj0hJHqAdQHJLD7Dq.jpg", overview: "Chronicles a day in the life of a grieving woman, and the twelve visitors who help her move forward after the death of a beloved aunt who raised her." },
        { title: "This is the Life", id: 97399, difficultyMult: 2, poster_path: "/3PC40QmeBWOHEMzmdcBM4VqBOnE.jpg", overview: "In 1989, a collective of young hip-hop artists gathered at a health food café in South Central Los Angeles. Their mandate: reject gang culture and expand the musical boundaries of hip-hop." }
    ],
    "Chloe Zhao": [
        { title: "Nomadland", id: 581734, difficultyMult: 1, poster_path: "/dKT8rGDR55cM1vGn7QZLA9Tg9YC.jpg", overview: "A woman in her sixties embarks on a journey through the western United States after losing everything in the Great Recession, living as a van-dwelling modern-day nomad." },
        { title: "Eternals", id: 524434, difficultyMult: 1.25, poster_path: "/lFByFSLV5WDJEv3KabbdAF959F2.jpg", overview: "The Eternals are a team of ancient aliens living on Earth in secret for thousands of years. When an unexpected tragedy forces them out of the shadows, they must reunite against mankind's oldest enemy." },
        { title: "The Rider", id: 453278, difficultyMult: 1.5, poster_path: "/cFsrA0Is5xode2INrPj1VJcQ18n.jpg", overview: "Once a rising star of the rodeo circuit, young cowboy Brady is warned his riding days are over after a horse crushed his skull. He undertakes a search for a new purpose across the South Dakota Badlands." },
        { title: "Songs My Brothers Taught Me", id: 308640, difficultyMult: 1.75, poster_path: "/2DiiYoVGtNkvvM8mc5UMIalH7OC.jpg", overview: "A complex portrait of modern-day life on the Pine Ridge Indian Reservation, exploring the bond between a brother and his younger sister on separate paths to rediscovering the meaning of home." },
        { title: "Daughters", id: 1214521, difficultyMult: 2, poster_path: "/nPX9mJE3fe3WIRoLNQqJ0uhwUfU.jpg", overview: "Four young girls prepare for a special Daddy Daughter Dance with their incarcerated fathers, as part of a unique fatherhood program in a Washington, D.C., jail." }
    ]
};

const DIRECTOR_PROFILE_FALLBACKS = {
    'Akira Kurosawa': {
        birthday: '1910-03-23',
        place_of_birth: 'Shinagawa, Tokyo Prefecture, Japan',
        biography: 'Akira Kurosawa (1910–1998) was a Japanese filmmaker who directed thirty films over five decades. Widely regarded as one of the greatest filmmakers in cinema history, he displayed a bold, dynamic style — strongly influenced by Western cinema yet distinctly his own. His works ranged from samurai epics to Shakespeare adaptations to personal dreams brought to vivid life.'
    },
    'Agnès Varda': {
        birthday: '1928-05-30',
        place_of_birth: 'Ixelles, Brussels, Belgium',
        biography: 'Agnès Varda (1928–2019) was a Belgian-born French film director and photographer. Her films, photographs, and art installations focus on documentary realism, feminist issues, and social commentary with a distinct experimental style. A key figure of the French New Wave\'s Left Bank group, she remained inventive and prolific into her nineties.'
    },
    'Satyajit Ray': {
        birthday: '1921-05-02',
        place_of_birth: 'Calcutta, Bengal Presidency, British India',
        biography: 'Satyajit Ray (1921–1992) was a Bengali Indian filmmaker widely regarded as one of the greatest of the 20th century. Born in Calcutta, he was drawn to filmmaking after viewing De Sica\'s Bicycle Thieves in London. His Apu Trilogy established him internationally as a humanist master. He directed 36 films before his death.'
    },
    'Spike Lee': {
        birthday: '1957-03-20',
        place_of_birth: 'Brooklyn, New York City, New York, USA',
        biography: 'Shelton Jackson "Spike" Lee (born 1957) is an American filmmaker and actor. His work continually explores race relations, issues within the Black community, the role of media in contemporary life, and urban crime. An Academy Award and BAFTA recipient, he founded 40 Acres and a Mule Filmworks in Brooklyn, where he continues to work.'
    },
    'Jane Campion': {
        birthday: '1954-04-30',
        place_of_birth: 'Wellington, New Zealand',
        biography: 'Jane Campion (born 1954) is a New Zealand filmmaker known for psychologically rich dramas centered on desire, power, and women living against social constraint. The first woman to win the Palme d\'Or at Cannes, she later became the second woman to win the Academy Award for Best Director, for The Power of the Dog.'
    },
    'Bong Joon-ho': {
        birthday: '1969-09-14',
        place_of_birth: 'Daegu, South Korea',
        biography: 'Bong Joon-ho (born 1969) is a South Korean filmmaker celebrated for genre-blending work that slides between satire, suspense, and social critique. His film Parasite won four Academy Awards in 2020, including Best Picture — the first non-English-language film to do so. He is known for dark comedy, sudden tone shifts, and incisive class commentary.'
    },
    'John Singleton': {
        birthday: '1968-01-06',
        place_of_birth: 'Los Angeles, California, USA',
        biography: 'John Daniel Singleton (1968–2019) was an American film director, screenwriter, and producer. A native of South Los Angeles, he became the youngest person ever nominated for the Academy Award for Best Director for Boyz n the Hood. Many of his films considered the implications of inner-city violence and Black urban experience with empathy and urgency.'
    },
    'Ava DuVernay': {
        birthday: '1972-08-24',
        place_of_birth: 'Long Beach, California, USA',
        biography: 'Ava DuVernay (born 1972) is an American filmmaker, screenwriter, and producer. A recipient of Emmy, BAFTA, and Sundance awards, she is the first Black woman to direct a live-action film with a budget over $100 million. She founded her independent distribution company ARRAY in 2011 and continues to expand representation in front of and behind the camera.'
    },
    'Guillermo del Toro': {
        birthday: '1964-10-09',
        place_of_birth: 'Guadalajara, Jalisco, Mexico',
        biography: 'Guillermo del Toro (born 1964) is a Mexican filmmaker, author, and artist. His work blends fairy tales, gothicism, and horror, infusing visual beauty into the grotesque. He has a lifelong fascination with monsters — which he considers symbols of great power. Pan\'s Labyrinth and The Shape of Water, his Oscar-winning film, are considered modern dark fantasy classics.'
    },
    'Chloe Zhao': {
        birthday: '1982-03-31',
        place_of_birth: 'Beijing, China',
        biography: 'Chloé Zhao (born Zhao Ting, 1982) is a Chinese-born filmmaker known for her spare, lyrical independent work that blends non-professional performers with the American landscape. Her film Nomadland won the Academy Award for Best Picture and Best Director in 2021, making her the first woman of color to win the directing Oscar.'
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

        // If poster_path is explicitly set (even null = no poster) and overview exists, skip TMDB fetch
        const hasAllDetails = campaign.every(f => 'poster_path' in f && f.overview);
        if (hasAllDetails) return campaign;

        if (!this.isConfigured()) {
            console.warn("TMDB API Key missing! Returning partial campaign data.");
            return campaign;
        }

        // Fetch full details for the campaign movies in parallel
        try {
            const movies = await Promise.all(campaign.map(async (movie) => {
                // Only fetch if data is missing (explicit null poster_path is fine — it means no poster)
                if ('poster_path' in movie && movie.overview) return movie;

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
                id: 6817,
                tmdbId: 6817,
                portraitKey: 'portrait_agnes_varda',
                portraitFrame: 1,
                name: 'Agnès Varda',
                cinematicFact: 'French New Wave.',
                traits: { targetScoreMult: 0.8, bucketWidthMult: 0.8 },
                traitLines: ['+20% Score / Smaller Buckets']
            },
            {
                id: 12160,
                tmdbId: 12160,
                portraitKey: 'portrait_satyajit_ray',
                portraitFrame: 2,
                name: 'Satyajit Ray',
                cinematicFact: 'Humanist Icon.',
                traits: { startingBalls: 2, gravityMult: 1.2 },
                traitLines: ['+2 Balls / Heavy Gravity']
            },
            {
                id: 5281,
                tmdbId: 5281,
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
                id: 6482,
                tmdbId: 6482,
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
                id: 929825,
                tmdbId: 929825,
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
                id: 1395183,
                tmdbId: 1395183,
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
            // Enrich with DOB/birthplace/bio from fallbacks so the Reel Archive cards can display them
            const profile = DIRECTOR_PROFILE_FALLBACKS[director.name];
            if (profile) {
                director.born = profile.birthday || null;
                director.place = profile.place_of_birth || null;
                director.bio = profile.biography || null;
            }
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
