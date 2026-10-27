/**
 * Original, light-hearted quiz questions for Mindful Moments.
 *
 * Every question uses well-established facts, has exactly one correct choice and
 * three plausible distractors. `answerIndex` points into `choices` as written here;
 * the quiz engine shuffles choices per session and tracks the new index.
 */

export type QuizCategory = "general" | "nature" | "animals" | "science" | "space";

export const QUIZ_CATEGORY_LABELS: Record<QuizCategory, string> = {
  general: "General knowledge",
  nature: "Nature",
  animals: "Animals",
  science: "Science",
  space: "Space",
};

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  prompt: string;
  choices: readonly [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  // General knowledge
  {
    id: "gk-hexagon",
    category: "general",
    prompt: "How many sides does a hexagon have?",
    choices: ["Five", "Six", "Seven", "Eight"],
    answerIndex: 1,
    explanation: "“Hex” comes from the Greek word for six. Honeycomb cells are a familiar hexagon.",
  },
  {
    id: "gk-minutes-day",
    category: "general",
    prompt: "How many minutes are in one full day?",
    choices: ["1,240", "1,400", "1,440", "1,640"],
    answerIndex: 2,
    explanation: "A day has 24 hours, and 24 × 60 minutes = 1,440 minutes.",
  },
  {
    id: "gk-blue-yellow",
    category: "general",
    prompt: "Mixing blue and yellow paint together makes which color?",
    choices: ["Purple", "Orange", "Green", "Brown"],
    answerIndex: 2,
    explanation: "With paints, blue and yellow combine to make green.",
  },
  {
    id: "gk-piano-keys",
    category: "general",
    prompt: "How many keys does a standard modern piano have?",
    choices: ["76", "88", "96", "100"],
    answerIndex: 1,
    explanation: "A standard modern piano has 88 keys: 52 white and 36 black.",
  },
  {
    id: "gk-violin-strings",
    category: "general",
    prompt: "How many strings does a standard violin have?",
    choices: ["Three", "Four", "Five", "Six"],
    answerIndex: 1,
    explanation: "A standard violin has four strings, usually tuned to G, D, A and E.",
  },
  {
    id: "gk-right-angle",
    category: "general",
    prompt: "How many degrees are in a right angle?",
    choices: ["45", "90", "180", "360"],
    answerIndex: 1,
    explanation: "A right angle is 90 degrees, like the corner of a square.",
  },

  // Nature
  {
    id: "nature-photosynthesis",
    category: "nature",
    prompt: "What do we call the process plants use to make food from sunlight, water and air?",
    choices: ["Pollination", "Germination", "Photosynthesis", "Evaporation"],
    answerIndex: 2,
    explanation:
      "In photosynthesis, plants use light energy to turn water and carbon dioxide into sugar, releasing oxygen.",
  },
  {
    id: "nature-roots",
    category: "nature",
    prompt: "Which part of a plant mainly takes in water from the soil?",
    choices: ["The petals", "The roots", "The seeds", "The pollen"],
    answerIndex: 1,
    explanation: "Roots absorb water and minerals from the soil and anchor the plant in place.",
  },
  {
    id: "nature-amber",
    category: "nature",
    prompt: "What is fossilized tree resin called?",
    choices: ["Jade", "Coral", "Obsidian", "Amber"],
    answerIndex: 3,
    explanation:
      "Amber is ancient tree resin that hardened over a very long time. Coral comes from sea animals, and obsidian is volcanic glass.",
  },
  {
    id: "nature-rainbow",
    category: "nature",
    prompt: "A rainbow appears when sunlight shines through what?",
    choices: ["Water droplets", "Dust particles", "Pollen grains", "Volcanic ash"],
    answerIndex: 0,
    explanation:
      "Water droplets bend and reflect sunlight, splitting it into its colors, which is why rainbows often follow rain.",
  },
  {
    id: "nature-deciduous",
    category: "nature",
    prompt: "What makes a tree “deciduous”?",
    choices: [
      "It keeps green needles all year",
      "It sheds its leaves each year",
      "It only grows in deserts",
      "It never produces seeds",
    ],
    answerIndex: 1,
    explanation:
      "Deciduous trees, like maples and oaks, shed their leaves each year, often in autumn.",
  },
  {
    id: "nature-igneous",
    category: "nature",
    prompt: "Which type of rock forms when melted rock (magma or lava) cools and hardens?",
    choices: ["Igneous", "Sedimentary", "Metamorphic", "Sandstone"],
    answerIndex: 0,
    explanation:
      "Igneous rock, like granite or basalt, forms from cooled magma or lava. Sandstone is a sedimentary rock.",
  },

  // Animals
  {
    id: "animals-spider-legs",
    category: "animals",
    prompt: "How many legs does a spider have?",
    choices: ["Six", "Eight", "Ten", "Twelve"],
    answerIndex: 1,
    explanation: "Spiders have eight legs. Insects, by comparison, have six.",
  },
  {
    id: "animals-joey",
    category: "animals",
    prompt: "What is a baby kangaroo called?",
    choices: ["A kit", "A cub", "A joey", "A calf"],
    answerIndex: 2,
    explanation: "Baby kangaroos are called joeys, and they grow inside their mother’s pouch.",
  },
  {
    id: "animals-dolphin",
    category: "animals",
    prompt: "Which of these sea animals is a mammal?",
    choices: ["Shark", "Dolphin", "Salmon", "Octopus"],
    answerIndex: 1,
    explanation:
      "Dolphins are mammals: they breathe air through a blowhole and feed their young milk.",
  },
  {
    id: "animals-octopus-hearts",
    category: "animals",
    prompt: "How many hearts does an octopus have?",
    choices: ["One", "Two", "Three", "Four"],
    answerIndex: 2,
    explanation:
      "An octopus has three hearts: two pump blood through the gills and one pumps it around the body.",
  },
  {
    id: "animals-pride",
    category: "animals",
    prompt: "What is a group of lions called?",
    choices: ["A pack", "A herd", "A flock", "A pride"],
    answerIndex: 3,
    explanation: "A group of lions living together is called a pride.",
  },
  {
    id: "animals-herbivore",
    category: "animals",
    prompt: "What do we call an animal that eats only plants?",
    choices: ["A carnivore", "A herbivore", "An omnivore", "A predator"],
    answerIndex: 1,
    explanation:
      "Herbivores, like cows and rabbits, eat plants. Carnivores eat meat, and omnivores eat both.",
  },

  // Science
  {
    id: "science-boiling",
    category: "science",
    prompt: "At sea level, about what temperature does water boil at?",
    choices: ["90 °C", "100 °C", "120 °C", "212 °C"],
    answerIndex: 1,
    explanation:
      "At sea-level air pressure, water boils at about 100 °C, which is the same as 212 °F.",
  },
  {
    id: "science-gold",
    category: "science",
    prompt: "What is the chemical symbol for gold?",
    choices: ["Ag", "Gd", "Go", "Au"],
    answerIndex: 3,
    explanation: "Gold’s symbol, Au, comes from its Latin name, aurum. Ag is silver.",
  },
  {
    id: "science-gravity",
    category: "science",
    prompt: "Which force pulls objects toward the ground when you drop them?",
    choices: ["Magnetism", "Friction", "Gravity", "Static electricity"],
    answerIndex: 2,
    explanation: "Gravity pulls objects toward Earth, which is why a dropped apple falls down.",
  },
  {
    id: "science-nucleus",
    category: "science",
    prompt: "What is the dense center of an atom called?",
    choices: ["The nucleus", "The electron", "The molecule", "The orbit"],
    answerIndex: 0,
    explanation:
      "The nucleus sits at the center of an atom and holds its protons and neutrons. Electrons move around it.",
  },
  {
    id: "science-sound-steel",
    category: "science",
    prompt: "Sound travels fastest through which of these?",
    choices: ["Air", "Water", "Steel", "Empty space"],
    answerIndex: 2,
    explanation:
      "Sound moves much faster through solids like steel than through water or air, and it cannot travel through empty space at all.",
  },
  {
    id: "science-nitrogen",
    category: "science",
    prompt: "Which gas makes up most of the air in Earth’s atmosphere?",
    choices: ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"],
    answerIndex: 1,
    explanation: "About 78% of the air is nitrogen. Oxygen makes up about 21%.",
  },

  // Space
  {
    id: "space-red-planet",
    category: "space",
    prompt: "Which planet is often called the Red Planet?",
    choices: ["Venus", "Mars", "Jupiter", "Mercury"],
    answerIndex: 1,
    explanation: "Mars looks reddish because its surface dust is rich in iron oxide, or rust.",
  },
  {
    id: "space-closest-star",
    category: "space",
    prompt: "What is the closest star to Earth?",
    choices: ["Proxima Centauri", "Sirius", "The Sun", "Polaris"],
    answerIndex: 2,
    explanation:
      "The Sun is a star, and it is by far the closest one to us. Proxima Centauri is the next closest.",
  },
  {
    id: "space-earth-orbit",
    category: "space",
    prompt: "About how long does Earth take to travel once around the Sun?",
    choices: ["About 24 hours", "About 30 days", "About 365 days", "About 1,000 days"],
    answerIndex: 2,
    explanation:
      "One trip around the Sun takes about 365¼ days, which is why calendars add a leap day almost every four years.",
  },
  {
    id: "space-jupiter",
    category: "space",
    prompt: "Which is the biggest planet in our solar system?",
    choices: ["Saturn", "Neptune", "Earth", "Jupiter"],
    answerIndex: 3,
    explanation: "Jupiter is the biggest planet in our solar system, both in width and in mass.",
  },
  {
    id: "space-moon-phases",
    category: "space",
    prompt: "What causes the Moon’s phases, like crescent and full?",
    choices: [
      "Earth’s shadow covering part of the Moon",
      "Seeing different amounts of its sunlit side as it orbits Earth",
      "Clouds drifting in front of the Moon",
      "The Moon changing its actual shape",
    ],
    answerIndex: 1,
    explanation:
      "Half of the Moon is always lit by the Sun. As it orbits Earth, we see different amounts of that lit half. Earth’s shadow only matters during an eclipse.",
  },
  {
    id: "space-milky-way",
    category: "space",
    prompt: "What is the name of the galaxy our solar system is in?",
    choices: ["Andromeda", "The Milky Way", "Triangulum", "The Whirlpool"],
    answerIndex: 1,
    explanation: "Our solar system is in the Milky Way. Andromeda is a neighboring galaxy.",
  },
];
