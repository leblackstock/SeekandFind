export const emberCommands = [
  {
    name: "ember-seek",
    description: "Generate an Ember seek-page pack",
    options: [
      { name: "page", description: "Page number", type: 4, required: true },
      { name: "location", description: "Seek page location", type: 3, required: true },
      { name: "mission", description: "Mission item", type: 3, required: true }
    ]
  },
  {
    name: "ember-title",
    description: "Generate an Ember title-page prompt",
    options: [
      { name: "book", description: "Book title", type: 3, required: false },
      { name: "theme", description: "Title page theme", type: 3, required: true }
    ]
  },
  {
    name: "ember-storyboard",
    description: "Generate an Ember storyboard pack",
    options: [
      { name: "seconds", description: "Clip length", type: 3, required: false },
      { name: "scene", description: "Scene", type: 3, required: true },
      { name: "goal", description: "Goal", type: 3, required: false }
    ]
  },
  {
    name: "ember-marketing",
    description: "Generate Ember marketing copy",
    options: [
      { name: "platform", description: "Platform", type: 3, required: false },
      { name: "asset", description: "Asset", type: 3, required: true },
      { name: "goal", description: "Goal", type: 3, required: false }
    ]
  },
  {
    name: "ember-qa",
    description: "Run Ember KDP QA",
    options: [{ name: "file", description: "File path", type: 3, required: true }]
  },
  {
    name: "ember-status",
    description: "Show Ember production status",
    options: [{ name: "book", description: "Book", type: 3, required: false }]
  }
];
