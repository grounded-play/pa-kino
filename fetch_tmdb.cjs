const fs = require('fs');

const API_KEY = 'd1f33fc8e796a5132c8afe4400aa1632';

const directors = {
  "Akira Kurosawa": ["Seven Samurai", "Yojimbo", "Rashomon", "Ran", "Dreams"],
  "Agnès Varda": ["Cléo from 5 to 7", "Vagabond", "Le Bonheur", "Faces Places", "The Gleaners & I"],
  "Satyajit Ray": ["Pather Panchali", "Aparajito", "The World of Apu", "Charulata", "The Music Room"],
  "Spike Lee": ["Do the Right Thing", "Malcolm X", "BlacKkKlansman", "25th Hour", "Bamboozled"],
  "Jane Campion": ["The Piano", "Bright Star", "The Power of the Dog", "In the Cut", "An Angel at My Table"],
  "Bong Joon-ho": ["Parasite", "Snowpiercer", "Memories of Murder", "The Host", "Barking Dogs Never Bite"],
  "Guillermo del Toro": ["Pan's Labyrinth", "Hellboy", "The Shape of Water", "Crimson Peak", "The Devil's Backbone"],
  "John Singleton": ["Boyz n the Hood", "Poetic Justice", "Baby Boy", "Higher Learning", "Rosewood"],
  "Ava DuVernay": ["Selma", "13th", "Middle of Nowhere", "I Will Follow", "This is the Life"],
  "Chloe Zhao": ["Nomadland", "Eternals", "The Rider", "Songs My Brothers Taught Me", "Daughters"]
};

const output = {};

async function fetchMovie(title, director) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return data.results[0].id;
  }
  return null;
}

async function run() {
  for (const [dir, movies] of Object.entries(directors)) {
    output[dir] = [];
    for (let i = 0; i < movies.length; i++) {
      const id = await fetchMovie(movies[i], dir);
      output[dir].push({
        title: movies[i],
        id: id,
        difficultyMult: 1 + (i * 0.25)
      });
    }
  }
  fs.writeFileSync('campaign_data.json', JSON.stringify(output, null, 2));
}

run();
