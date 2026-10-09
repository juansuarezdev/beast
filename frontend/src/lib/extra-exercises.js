// Beast's own additions to the exercise catalogue: the sports and loaded carries the original
// dataset lacks (swimming, rowing machine, outdoor cycling and running, landmine presses, sled work,
// sandbag and kettlebell carries). They carry no picture or animation, and no translated name:
// the name falls back to English. The ids start with `bx-` so they never meet a dataset id.
// The dataset itself stays untouched; exercises.js appends these to the catalogue.

export const EXTRA_EXERCISES = [
  {
    "id": "bx-swim-free",
    "n": "swimming (freestyle)",
    "bp": "cardio",
    "eq": "body weight",
    "tg": "cardiovascular system",
    "mg": "shoulders",
    "sm": [
      "latissimus dorsi",
      "triceps",
      "core",
      "quadriceps"
    ],
    "st": [
      "Push off the wall and swim front crawl, rotating your body with each stroke.",
      "Breathe to one side every two or three strokes and keep a steady kick.",
      "Log the time and the distance you swam."
    ]
  },
  {
    "id": "bx-swim-back",
    "n": "swimming (backstroke)",
    "bp": "cardio",
    "eq": "body weight",
    "tg": "cardiovascular system",
    "mg": "latissimus dorsi",
    "sm": [
      "shoulders",
      "core",
      "glutes"
    ],
    "st": [
      "Float on your back and swim with alternating arm strokes and a steady flutter kick.",
      "Keep your hips high and your head still.",
      "Log the time and the distance you swam."
    ]
  },
  {
    "id": "bx-swim-breast",
    "n": "swimming (breaststroke)",
    "bp": "cardio",
    "eq": "body weight",
    "tg": "cardiovascular system",
    "mg": "chest",
    "sm": [
      "quadriceps",
      "shoulders",
      "inner thighs"
    ],
    "st": [
      "Pull the water back with both arms together, then kick the legs out and around.",
      "Glide for a moment before the next stroke.",
      "Log the time and the distance you swam."
    ]
  },
  {
    "id": "bx-swim-fly",
    "n": "swimming (butterfly)",
    "bp": "cardio",
    "eq": "body weight",
    "tg": "cardiovascular system",
    "mg": "shoulders",
    "sm": [
      "chest",
      "latissimus dorsi",
      "core"
    ],
    "st": [
      "Swim with both arms together and a dolphin kick from the hips.",
      "Breathe forward every one or two strokes.",
      "Log the time and the distance you swam."
    ]
  },
  {
    "id": "bx-swim-mix",
    "n": "swimming (mixed)",
    "bp": "cardio",
    "eq": "body weight",
    "tg": "cardiovascular system",
    "mg": "shoulders",
    "sm": [
      "latissimus dorsi",
      "chest",
      "core",
      "quadriceps"
    ],
    "st": [
      "Swim any mix of strokes at a steady effort.",
      "Log the time and the distance you swam."
    ]
  },
  {
    "id": "bx-rower",
    "n": "rowing machine",
    "bp": "cardio",
    "eq": "rowing machine",
    "tg": "cardiovascular system",
    "mg": "latissimus dorsi",
    "sm": [
      "quadriceps",
      "hamstrings",
      "glutes",
      "biceps",
      "core"
    ],
    "st": [
      "Sit on the rower with your feet strapped in and your arms straight.",
      "Drive with the legs first, then lean back slightly and pull the handle to your lower ribs.",
      "Return in reverse order: arms, then body, then legs. Log the time and the distance."
    ]
  },
  {
    "id": "bx-bike-out",
    "n": "cycling (outdoor)",
    "bp": "cardio",
    "eq": "bicycle",
    "tg": "cardiovascular system",
    "mg": "quadriceps",
    "sm": [
      "hamstrings",
      "glutes",
      "calves"
    ],
    "st": [
      "Ride at a steady cadence, standing on climbs and seated on the flat.",
      "Log the time and the distance you rode."
    ]
  },
  {
    "id": "bx-bike-in",
    "n": "cycling (indoor)",
    "bp": "cardio",
    "eq": "stationary bike",
    "tg": "cardiovascular system",
    "mg": "quadriceps",
    "sm": [
      "hamstrings",
      "glutes",
      "calves"
    ],
    "st": [
      "Set the seat so your knee is slightly bent at the bottom of the pedal stroke.",
      "Hold a steady cadence and log the time and the distance on the console."
    ]
  },
  {
    "id": "bx-run-out",
    "n": "running (outdoor)",
    "bp": "cardio",
    "eq": "body weight",
    "tg": "cardiovascular system",
    "mg": "quadriceps",
    "sm": [
      "hamstrings",
      "calves",
      "glutes"
    ],
    "st": [
      "Run at an even effort on a flat or rolling route, landing under your hips.",
      "Log the time and the distance you ran."
    ]
  },
  {
    "id": "bx-run-tread",
    "n": "running (treadmill)",
    "bp": "cardio",
    "eq": "leverage machine",
    "tg": "cardiovascular system",
    "mg": "quadriceps",
    "sm": [
      "hamstrings",
      "calves",
      "glutes"
    ],
    "st": [
      "Start the belt slowly and build to your pace, keeping your stride short and relaxed.",
      "Log the time and the distance on the console."
    ]
  },
  {
    "id": "bx-lm-press",
    "n": "landmine press",
    "bp": "shoulders",
    "eq": "barbell",
    "tg": "delts",
    "mg": "chest",
    "sm": [
      "triceps",
      "core",
      "serratus anterior"
    ],
    "st": [
      "Wedge one end of a barbell in a corner or landmine and hold the other end at your chest with both hands.",
      "Press up and forward until your arms are straight, then lower under control.",
      "Keep your ribs down and your hips square."
    ]
  },
  {
    "id": "bx-lm-press1",
    "n": "landmine press (single arm)",
    "bp": "shoulders",
    "eq": "barbell",
    "tg": "delts",
    "mg": "chest",
    "sm": [
      "triceps",
      "core",
      "serratus anterior",
      "obliques"
    ],
    "st": [
      "Hold the free end of the barbell at your shoulder with one hand, feet staggered.",
      "Press up and forward to full reach, then lower. Repeat on the other side."
    ]
  },
  {
    "id": "bx-lm-row",
    "n": "landmine row",
    "bp": "back",
    "eq": "barbell",
    "tg": "lats",
    "mg": "upper back",
    "sm": [
      "biceps",
      "rear deltoids",
      "lower back"
    ],
    "st": [
      "Straddle the bar and hinge forward with a flat back, holding the end with a V-handle or both hands.",
      "Row the end to your chest, squeeze your shoulder blades, and lower slowly."
    ]
  },
  {
    "id": "bx-lm-squat-press",
    "n": "landmine squat to press",
    "bp": "upper legs",
    "eq": "barbell",
    "tg": "quads",
    "mg": "glutes",
    "sm": [
      "shoulders",
      "triceps",
      "core"
    ],
    "st": [
      "Hold the end of the bar at your chest and squat with your chest tall.",
      "Drive up and press the bar forward and up in one motion."
    ]
  },
  {
    "id": "bx-lm-rdl",
    "n": "landmine romanian deadlift",
    "bp": "upper legs",
    "eq": "barbell",
    "tg": "hamstrings",
    "mg": "glutes",
    "sm": [
      "lower back"
    ],
    "st": [
      "Hold the end of the bar in front of your thighs and hinge at the hips with soft knees.",
      "Lower until you feel the hamstrings stretch, then drive the hips forward to stand."
    ]
  },
  {
    "id": "bx-sled-push",
    "n": "sled push",
    "bp": "upper legs",
    "eq": "sled",
    "tg": "quads",
    "mg": "glutes",
    "sm": [
      "calves",
      "hamstrings",
      "core"
    ],
    "st": [
      "Load the sled, grip the posts low and lean into it with a flat back.",
      "Drive with short, powerful steps for the set distance. Log the load and the metres."
    ]
  },
  {
    "id": "bx-sled-drag",
    "n": "sled drag (backward walk)",
    "bp": "upper legs",
    "eq": "sled",
    "tg": "quads",
    "mg": "calves",
    "sm": [
      "glutes",
      "hamstrings"
    ],
    "st": [
      "Face the sled with the harness or straps in your hands and walk backwards, leaning slightly away.",
      "Keep tension on the strap for the whole distance. Log the load and the metres."
    ]
  },
  {
    "id": "bx-sandbag-carry",
    "n": "sandbag carry",
    "bp": "back",
    "eq": "sandbag",
    "tg": "traps",
    "mg": "core",
    "sm": [
      "forearms",
      "glutes",
      "quadriceps"
    ],
    "st": [
      "Hug the sandbag against your chest or hold it on one shoulder.",
      "Walk with short, quick steps and an upright chest for the set distance. Log the load and the metres."
    ]
  },
  {
    "id": "bx-sandbag-shoulder",
    "n": "sandbag shouldering",
    "bp": "upper legs",
    "eq": "sandbag",
    "tg": "glutes",
    "mg": "quadriceps",
    "sm": [
      "lower back",
      "core",
      "shoulders"
    ],
    "st": [
      "Lift the sandbag from the floor to a lap carry, then explode up and roll it onto one shoulder.",
      "Lower and alternate shoulders."
    ]
  },
  {
    "id": "bx-suitcase-carry",
    "n": "suitcase carry",
    "bp": "waist",
    "eq": "dumbbell",
    "tg": "abs",
    "mg": "obliques",
    "sm": [
      "forearms",
      "traps",
      "glutes"
    ],
    "st": [
      "Hold a heavy dumbbell or kettlebell in one hand at your side.",
      "Walk tall without leaning to the load. Log the load and the metres, then switch hands."
    ]
  },
  {
    "id": "bx-kb-farmers",
    "n": "kettlebell farmers walk",
    "bp": "upper legs",
    "eq": "kettlebell",
    "tg": "quads",
    "mg": "calves",
    "sm": [
      "forearms",
      "core",
      "traps"
    ],
    "st": [
      "Hold a kettlebell in each hand at your sides and stand tall.",
      "Walk with short, steady steps for the set distance. Log the load and the metres."
    ]
  },
  {
    "id": "bx-trap-farmers",
    "n": "trap bar farmers walk",
    "bp": "upper legs",
    "eq": "trap bar",
    "tg": "quads",
    "mg": "calves",
    "sm": [
      "forearms",
      "core",
      "traps"
    ],
    "st": [
      "Stand inside the trap bar, hinge down and lift it with a flat back.",
      "Walk the set distance upright with a firm grip. Log the load and the metres."
    ]
  },
  {
    "id": "bx-rack-carry",
    "n": "front rack carry (kettlebell)",
    "bp": "waist",
    "eq": "kettlebell",
    "tg": "abs",
    "mg": "core",
    "sm": [
      "shoulders",
      "forearms",
      "quadriceps"
    ],
    "st": [
      "Rack one or two kettlebells against your chest and upper arms.",
      "Walk tall with a braced core for the set distance. Log the load and the metres."
    ]
  },
  {
    "id": "bx-oh-carry",
    "n": "overhead carry (kettlebell)",
    "bp": "shoulders",
    "eq": "kettlebell",
    "tg": "delts",
    "mg": "core",
    "sm": [
      "triceps",
      "traps",
      "forearms"
    ],
    "st": [
      "Press a kettlebell overhead with the arm locked next to your ear.",
      "Walk the set distance without letting the ribs flare. Log the load and the metres, then switch."
    ]
  },
  {
    "id": "bx-ruck",
    "n": "ruck march",
    "bp": "upper legs",
    "eq": "weighted",
    "tg": "quads",
    "mg": "calves",
    "sm": [
      "glutes",
      "hamstrings",
      "core",
      "traps"
    ],
    "st": [
      "Load a rucksack and shoulder it high on your back.",
      "Walk at a brisk pace over the set distance. Log the load and the metres."
    ]
  }
]
