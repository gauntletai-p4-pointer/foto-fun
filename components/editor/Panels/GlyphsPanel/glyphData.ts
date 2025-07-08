interface EmojiData {
  char: string
  name: string
}

interface CategoryData {
  name: string
  icon: string
  emojis: EmojiData[]
}

interface SpecialCharData {
  char: string
  name: string
}

export const EMOJI_CATEGORIES: Record<string, CategoryData> = {
  smileys: {
    name: 'Smileys',
    icon: '😊',
    emojis: [
      { char: '😀', name: 'grinning face' },
      { char: '😃', name: 'grinning face with big eyes' },
      { char: '😄', name: 'grinning face with smiling eyes' },
      { char: '😁', name: 'beaming face with smiling eyes' },
      { char: '😆', name: 'grinning squinting face' },
      { char: '😅', name: 'grinning face with sweat' },
      { char: '🤣', name: 'rolling on the floor laughing' },
      { char: '😂', name: 'face with tears of joy' },
      { char: '🙂', name: 'slightly smiling face' },
      { char: '🙃', name: 'upside-down face' },
      { char: '😉', name: 'winking face' },
      { char: '😊', name: 'smiling face with smiling eyes' },
      { char: '😇', name: 'smiling face with halo' },
      { char: '🥰', name: 'smiling face with hearts' },
      { char: '😍', name: 'smiling face with heart-eyes' },
      { char: '🤩', name: 'star-struck' },
      { char: '😘', name: 'face blowing a kiss' },
      { char: '😗', name: 'kissing face' },
      { char: '😚', name: 'kissing face with closed eyes' },
      { char: '😙', name: 'kissing face with smiling eyes' },
      { char: '😋', name: 'face savoring food' },
      { char: '😛', name: 'face with tongue' },
      { char: '😜', name: 'winking face with tongue' },
      { char: '🤪', name: 'zany face' },
      { char: '😝', name: 'squinting face with tongue' },
      { char: '🤑', name: 'money-mouth face' },
      { char: '🤗', name: 'hugging face' },
      { char: '🤭', name: 'face with hand over mouth' },
      { char: '🤫', name: 'shushing face' },
      { char: '🤔', name: 'thinking face' }
    ]
  },
  people: {
    name: 'People',
    icon: '👋',
    emojis: [
      { char: '👋', name: 'waving hand' },
      { char: '🤚', name: 'raised back of hand' },
      { char: '🖐️', name: 'hand with fingers splayed' },
      { char: '✋', name: 'raised hand' },
      { char: '🖖', name: 'vulcan salute' },
      { char: '👌', name: 'OK hand' },
      { char: '🤌', name: 'pinched fingers' },
      { char: '🤏', name: 'pinching hand' },
      { char: '✌️', name: 'victory hand' },
      { char: '🤞', name: 'crossed fingers' },
      { char: '🤟', name: 'love-you gesture' },
      { char: '🤘', name: 'sign of the horns' },
      { char: '🤙', name: 'call me hand' },
      { char: '👈', name: 'backhand index pointing left' },
      { char: '👉', name: 'backhand index pointing right' },
      { char: '👆', name: 'backhand index pointing up' },
      { char: '👇', name: 'backhand index pointing down' },
      { char: '☝️', name: 'index pointing up' },
      { char: '👍', name: 'thumbs up' },
      { char: '👎', name: 'thumbs down' },
      { char: '✊', name: 'raised fist' },
      { char: '👊', name: 'oncoming fist' },
      { char: '🤛', name: 'left-facing fist' },
      { char: '🤜', name: 'right-facing fist' }
    ]
  },
  nature: {
    name: 'Nature',
    icon: '🌸',
    emojis: [
      { char: '🌸', name: 'cherry blossom' },
      { char: '💮', name: 'white flower' },
      { char: '🏵️', name: 'rosette' },
      { char: '🌹', name: 'rose' },
      { char: '🥀', name: 'wilted flower' },
      { char: '🌺', name: 'hibiscus' },
      { char: '🌻', name: 'sunflower' },
      { char: '🌼', name: 'blossom' },
      { char: '🌷', name: 'tulip' },
      { char: '🌱', name: 'seedling' },
      { char: '🌲', name: 'evergreen tree' },
      { char: '🌳', name: 'deciduous tree' },
      { char: '🌴', name: 'palm tree' },
      { char: '🌵', name: 'cactus' },
      { char: '🌾', name: 'sheaf of rice' },
      { char: '🌿', name: 'herb' },
      { char: '☘️', name: 'shamrock' },
      { char: '🍀', name: 'four leaf clover' },
      { char: '🍁', name: 'maple leaf' },
      { char: '🍂', name: 'fallen leaf' },
      { char: '🍃', name: 'leaf fluttering in wind' }
    ]
  },
  food: {
    name: 'Food',
    icon: '🍕',
    emojis: [
      { char: '🍕', name: 'pizza' },
      { char: '🍔', name: 'hamburger' },
      { char: '🍟', name: 'french fries' },
      { char: '🌭', name: 'hot dog' },
      { char: '🥪', name: 'sandwich' },
      { char: '🌮', name: 'taco' },
      { char: '🌯', name: 'burrito' },
      { char: '🥙', name: 'stuffed flatbread' },
      { char: '🧆', name: 'falafel' },
      { char: '🥚', name: 'egg' },
      { char: '🍳', name: 'cooking' },
      { char: '🥘', name: 'shallow pan of food' },
      { char: '🍲', name: 'pot of food' },
      { char: '🥣', name: 'bowl with spoon' },
      { char: '🥗', name: 'green salad' },
      { char: '🍿', name: 'popcorn' },
      { char: '🧈', name: 'butter' },
      { char: '🧂', name: 'salt' },
      { char: '🥫', name: 'canned food' }
    ]
  },
  objects: {
    name: 'Objects',
    icon: '💡',
    emojis: [
      { char: '💡', name: 'light bulb' },
      { char: '🔦', name: 'flashlight' },
      { char: '🕯️', name: 'candle' },
      { char: '💰', name: 'money bag' },
      { char: '💸', name: 'money with wings' },
      { char: '⏰', name: 'alarm clock' },
      { char: '⌛', name: 'hourglass' },
      { char: '⏳', name: 'hourglass not done' },
      { char: '📱', name: 'mobile phone' },
      { char: '💻', name: 'laptop' },
      { char: '⌨️', name: 'keyboard' },
      { char: '🖥️', name: 'desktop computer' },
      { char: '🖨️', name: 'printer' },
      { char: '🖱️', name: 'computer mouse' },
      { char: '📷', name: 'camera' },
      { char: '📸', name: 'camera with flash' },
      { char: '📹', name: 'video camera' },
      { char: '🎥', name: 'movie camera' },
      { char: '📞', name: 'telephone receiver' },
      { char: '☎️', name: 'telephone' }
    ]
  },
  symbols: {
    name: 'Symbols',
    icon: '❤️',
    emojis: [
      { char: '❤️', name: 'red heart' },
      { char: '🧡', name: 'orange heart' },
      { char: '💛', name: 'yellow heart' },
      { char: '💚', name: 'green heart' },
      { char: '💙', name: 'blue heart' },
      { char: '💜', name: 'purple heart' },
      { char: '🖤', name: 'black heart' },
      { char: '🤍', name: 'white heart' },
      { char: '🤎', name: 'brown heart' },
      { char: '💔', name: 'broken heart' },
      { char: '❣️', name: 'heart exclamation' },
      { char: '💕', name: 'two hearts' },
      { char: '💞', name: 'revolving hearts' },
      { char: '💓', name: 'beating heart' },
      { char: '💗', name: 'growing heart' },
      { char: '💖', name: 'sparkling heart' },
      { char: '💘', name: 'heart with arrow' },
      { char: '💝', name: 'heart with ribbon' },
      { char: '⭐', name: 'star' },
      { char: '🌟', name: 'glowing star' },
      { char: '✨', name: 'sparkles' },
      { char: '⚡', name: 'high voltage' },
      { char: '🔥', name: 'fire' },
      { char: '💥', name: 'collision' },
      { char: '☀️', name: 'sun' }
    ]
  }
}

export const SPECIAL_CHARACTERS: Record<string, SpecialCharData[]> = {
  punctuation: [
    { char: '…', name: 'horizontal ellipsis' },
    { char: '–', name: 'en dash' },
    { char: '—', name: 'em dash' },
    { char: '"', name: 'left double quotation mark' },
    { char: '"', name: 'right double quotation mark' },
    { char: "'", name: 'left single quotation mark' },
    { char: "'", name: 'right single quotation mark' },
    { char: '‚', name: 'single low-9 quotation mark' },
    { char: '„', name: 'double low-9 quotation mark' },
    { char: '«', name: 'left-pointing double angle quotation mark' },
    { char: '»', name: 'right-pointing double angle quotation mark' },
    { char: '¡', name: 'inverted exclamation mark' },
    { char: '¿', name: 'inverted question mark' },
    { char: '§', name: 'section sign' },
    { char: '¶', name: 'pilcrow sign' },
    { char: '†', name: 'dagger' },
    { char: '‡', name: 'double dagger' },
    { char: '•', name: 'bullet' },
    { char: '‰', name: 'per mille sign' }
  ],
  currency: [
    { char: '$', name: 'dollar sign' },
    { char: '¢', name: 'cent sign' },
    { char: '£', name: 'pound sign' },
    { char: '¤', name: 'currency sign' },
    { char: '¥', name: 'yen sign' },
    { char: '€', name: 'euro sign' },
    { char: '₹', name: 'rupee sign' },
    { char: '₽', name: 'ruble sign' },
    { char: '₩', name: 'won sign' },
    { char: '₪', name: 'new shekel sign' },
    { char: '₫', name: 'dong sign' },
    { char: '₴', name: 'hryvnia sign' },
    { char: '₵', name: 'cedi sign' },
    { char: '₸', name: 'tenge sign' },
    { char: '₺', name: 'turkish lira sign' },
    { char: '₼', name: 'manat sign' }
  ],
  math: [
    { char: '±', name: 'plus-minus sign' },
    { char: '×', name: 'multiplication sign' },
    { char: '÷', name: 'division sign' },
    { char: '≈', name: 'almost equal to' },
    { char: '≠', name: 'not equal to' },
    { char: '≤', name: 'less-than or equal to' },
    { char: '≥', name: 'greater-than or equal to' },
    { char: '∞', name: 'infinity' },
    { char: '∑', name: 'n-ary summation' },
    { char: '√', name: 'square root' },
    { char: '∛', name: 'cube root' },
    { char: '∜', name: 'fourth root' },
    { char: '∫', name: 'integral' },
    { char: '∂', name: 'partial differential' },
    { char: 'π', name: 'pi' },
    { char: '°', name: 'degree sign' }
  ],
  arrows: [
    { char: '←', name: 'leftwards arrow' },
    { char: '↑', name: 'upwards arrow' },
    { char: '→', name: 'rightwards arrow' },
    { char: '↓', name: 'downwards arrow' },
    { char: '↔', name: 'left right arrow' },
    { char: '↕', name: 'up down arrow' },
    { char: '↖', name: 'north west arrow' },
    { char: '↗', name: 'north east arrow' },
    { char: '↘', name: 'south east arrow' },
    { char: '↙', name: 'south west arrow' },
    { char: '⇐', name: 'leftwards double arrow' },
    { char: '⇑', name: 'upwards double arrow' },
    { char: '⇒', name: 'rightwards double arrow' },
    { char: '⇓', name: 'downwards double arrow' },
    { char: '⇔', name: 'left right double arrow' },
    { char: '⇕', name: 'up down double arrow' }
  ]
} 