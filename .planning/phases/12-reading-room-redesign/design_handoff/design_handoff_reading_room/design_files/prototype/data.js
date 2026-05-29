// Book catalog — the corpus rendered as a small library.
// Each book has stable scatter coordinates (kept deterministic via id-derived seeds)
// and a short shelfmark in Library of Congress style, because it's a Reading Room.

window.BOOKS = [
  // ── Gothic Horror ───────────────────────────────────────────
  { id: 'wh', t: 'Wuthering Heights', a: 'Brontë, E.', y: 1847, g: 'gothic', words: 118400, vocab: 6914, call: 'PR 4172 .W8 1847', x: 0.18, y: 0.62, kw: ['moor','hearth','ghost','kin','wuther','cliff','master','cold','window','linton'] },
  { id: 'dr', t: 'Dracula', a: 'Stoker, B.', y: 1897, g: 'gothic', words: 160800, vocab: 8112, call: 'PR 5494 .D7 1897', x: 0.12, y: 0.55, kw: ['count','crucifix','transylvania','blood','coffin','wolf','jonathan','mina','undead','garlic'] },
  { id: 'fr', t: 'Frankenstein', a: 'Shelley, M.', y: 1818, g: 'gothic', words: 75000, vocab: 5210, call: 'PR 5397 .F7 1818', x: 0.20, y: 0.50, kw: ['creature','geneva','lightning','laboratory','wretch','arctic','elizabeth','victor','spark'] },
  { id: 'ts', t: 'The Turn of the Screw', a: 'James, H.', y: 1898, g: 'gothic', words: 43000, vocab: 4001, call: 'PS 2116 .T8 1898', x: 0.16, y: 0.66, kw: ['governess','flora','miles','spectre','bly','window','silence','grey','quint'] },
  { id: 'do', t: 'The Picture of Dorian Gray', a: 'Wilde, O.', y: 1890, g: 'gothic', words: 78000, vocab: 6700, call: 'PR 5819 .D7 1890', x: 0.22, y: 0.45, kw: ['portrait','vice','beauty','sin','attic','basil','henry','wither','dorian'] },
  { id: 'cm', t: 'Carmilla', a: 'Le Fanu, J. S.', y: 1872, g: 'gothic', words: 27000, vocab: 3300, call: 'PR 4879 .C3 1872', x: 0.14, y: 0.60, kw: ['styria','carmilla','schloss','laura','vampire','dream','night','pale'] },

  // ── Mystery ─────────────────────────────────────────────────
  { id: 'hb', t: 'The Hound of the Baskervilles', a: 'Doyle, A. C.', y: 1902, g: 'mystery', words: 60200, vocab: 5200, call: 'PR 4622 .H6 1902', x: 0.78, y: 0.72, kw: ['moor','dartmoor','hound','tor','baronet','footprint','telegram','holmes','watson'] },
  { id: 'mn', t: 'The Moonstone', a: 'Collins, W.', y: 1868, g: 'mystery', words: 192000, vocab: 7800, call: 'PR 4494 .M7 1868', x: 0.74, y: 0.66, kw: ['diamond','butler','servant','india','steward','clue','testimony','will'] },
  { id: 'ss', t: 'A Study in Scarlet', a: 'Doyle, A. C.', y: 1887, g: 'mystery', words: 43400, vocab: 4400, call: 'PR 4622 .S8 1887', x: 0.80, y: 0.68, kw: ['holmes','watson','baker','street','telegram','clue','revolver','poison','utah'] },
  { id: 'ww', t: 'The Woman in White', a: 'Collins, W.', y: 1859, g: 'mystery', words: 245000, vocab: 8400, call: 'PR 4494 .W6 1859', x: 0.72, y: 0.78, kw: ['asylum','identity','glyde','letter','secret','marian','laura','footstep'] },
  { id: 'mr', t: 'The Murders in the Rue Morgue', a: 'Poe, E. A.', y: 1841, g: 'mystery', words: 13800, vocab: 2700, call: 'PS 2618 .M8 1841', x: 0.76, y: 0.62, kw: ['paris','dupin','orangutan','window','clue','razor','testimony','reason'] },
  { id: 'mb', t: 'The Mystery of Edwin Drood', a: 'Dickens, C.', y: 1870, g: 'mystery', words: 95000, vocab: 6800, call: 'PR 4569 .E3 1870', x: 0.82, y: 0.76, kw: ['cloisterham','choirmaster','opium','jasper','rosa','crypt','vault','unfinished'] },

  // ── Literary ────────────────────────────────────────────────
  { id: 'mm', t: 'Middlemarch', a: 'Eliot, G.', y: 1871, g: 'literary', words: 316000, vocab: 11400, call: 'PR 4662 .M5 1871', x: 0.50, y: 0.44, kw: ['parish','reform','vocation','marriage','provincial','study','casaubon','dorothea'] },
  { id: 'pp', t: 'Pride and Prejudice', a: 'Austen, J.', y: 1813, g: 'literary', words: 122000, vocab: 6300, call: 'PR 4034 .P7 1813', x: 0.46, y: 0.40, kw: ['estate','entail','ball','letter','accomplished','daughter','prejudice','manners'] },
  { id: 'jn', t: 'Jane Eyre', a: 'Brontë, C.', y: 1847, g: 'literary', words: 183000, vocab: 8400, call: 'PR 4167 .J3 1847', x: 0.42, y: 0.50, kw: ['orphan','thornfield','governess','attic','reader','rochester','sister','fire'] },
  { id: 'tt', t: 'Tess of the d’Urbervilles', a: 'Hardy, T.', y: 1891, g: 'literary', words: 165000, vocab: 7900, call: 'PR 4748 .T4 1891', x: 0.40, y: 0.46, kw: ['dairy','wessex','milkmaid','letter','altar','stonehenge','angel','clare'] },
  { id: 'mw', t: 'Mrs. Dalloway', a: 'Woolf, V.', y: 1925, g: 'literary', words: 64000, vocab: 6100, call: 'PR 6045 .D3 1925', x: 0.52, y: 0.36, kw: ['flowers','party','clarissa','bond','street','war','septimus','clock'] },
  { id: 'bh', t: 'Bleak House', a: 'Dickens, C.', y: 1853, g: 'literary', words: 360000, vocab: 12200, call: 'PR 4556 .B5 1853', x: 0.56, y: 0.48, kw: ['chancery','fog','ward','solicitor','jarndyce','tulkinghorn','soot'] },

  // ── Romance ─────────────────────────────────────────────────
  { id: 'na', t: 'Northanger Abbey', a: 'Austen, J.', y: 1817, g: 'romance', words: 78000, vocab: 5600, call: 'PR 4034 .N6 1817', x: 0.32, y: 0.22, kw: ['bath','curate','assembly','novel','catherine','tilney','rooms','ball'] },
  { id: 'pe', t: 'Persuasion', a: 'Austen, J.', y: 1817, g: 'romance', words: 83000, vocab: 5700, call: 'PR 4034 .P5 1817', x: 0.30, y: 0.18, kw: ['anne','wentworth','navy','letter','bath','elliot','second','attachment'] },
  { id: 'em', t: 'Emma', a: 'Austen, J.', y: 1815, g: 'romance', words: 156000, vocab: 7100, call: 'PR 4034 .E5 1815', x: 0.34, y: 0.16, kw: ['emma','knightley','highbury','match','harriet','ball','letter','village'] },
  { id: 'sa', t: 'Sense and Sensibility', a: 'Austen, J.', y: 1811, g: 'romance', words: 119000, vocab: 6500, call: 'PR 4034 .S4 1811', x: 0.36, y: 0.20, kw: ['elinor','marianne','attachment','willoughby','barton','letter','engagement'] },
  { id: 'ag', t: 'Agnes Grey', a: 'Brontë, A.', y: 1847, g: 'romance', words: 70000, vocab: 5000, call: 'PR 4163 .A3 1847', x: 0.28, y: 0.24, kw: ['governess','curate','horton','pupil','rectory','prayer','attachment'] },

  // ── Adventure ───────────────────────────────────────────────
  { id: 'ti', t: 'Treasure Island', a: 'Stevenson, R. L.', y: 1883, g: 'adventure', words: 70000, vocab: 5500, call: 'PR 5485 .T7 1883', x: 0.78, y: 0.20, kw: ['island','treasure','schooner','silver','parrot','map','jim','flint','pieces'] },
  { id: 'ck', t: 'King Solomon’s Mines', a: 'Haggard, H. R.', y: 1885, g: 'adventure', words: 89000, vocab: 6300, call: 'PR 4732 .K5 1885', x: 0.82, y: 0.22, kw: ['veld','tribe','mine','quatermain','elephant','spear','desert','ivory'] },
  { id: 'cr', t: 'Robinson Crusoe', a: 'Defoe, D.', y: 1719, g: 'adventure', words: 122000, vocab: 5900, call: 'PR 3404 .R6 1719', x: 0.80, y: 0.18, kw: ['island','goat','pages','providence','musket','footprint','solitude'] },
  { id: 'kg', t: 'Kim', a: 'Kipling, R.', y: 1901, g: 'adventure', words: 105000, vocab: 7600, call: 'PR 4854 .K5 1901', x: 0.76, y: 0.16, kw: ['lahore','lama','road','grand','trunk','spy','river','arrow'] },

  // ── Western ─────────────────────────────────────────────────
  { id: 'vr', t: 'The Virginian', a: 'Wister, O.', y: 1902, g: 'western', words: 132000, vocab: 7000, call: 'PS 3328 .V5 1902', x: 0.92, y: 0.46, kw: ['cowpuncher','ranch','trampas','wyoming','schoolma’am','stranger','poker'] },
  { id: 'ri', t: 'Riders of the Purple Sage', a: 'Grey, Z.', y: 1912, g: 'western', words: 105000, vocab: 6200, call: 'PS 3513 .R6 1912', x: 0.94, y: 0.50, kw: ['rustler','utah','cottonwood','venters','jane','rim','sage','stallion'] },
  { id: 'tx', t: 'The Texan', a: 'Mulford, C. E.', y: 1922, g: 'western', words: 92000, vocab: 5500, call: 'PS 3525 .T4 1922', x: 0.96, y: 0.42, kw: ['cattle','herd','ranger','panhandle','colt','remuda','trail','rio'] },

  // ── Historical ──────────────────────────────────────────────
  { id: 'tc', t: 'A Tale of Two Cities', a: 'Dickens, C.', y: 1859, g: 'historical', words: 138000, vocab: 7100, call: 'PR 4571 .T2 1859', x: 0.60, y: 0.78, kw: ['guillotine','revolution','paris','carton','manette','tribunal','bastille'] },
  { id: 'iv', t: 'Ivanhoe', a: 'Scott, W.', y: 1819, g: 'historical', words: 195000, vocab: 9100, call: 'PR 5316 .I8 1819', x: 0.58, y: 0.82, kw: ['saxon','norman','tourney','templar','rebecca','crusade','sherwood','knight'] },
  { id: 'lc', t: 'The Last of the Mohicans', a: 'Cooper, J. F.', y: 1826, g: 'historical', words: 145000, vocab: 8000, call: 'PS 1408 .L3 1826', x: 0.62, y: 0.74, kw: ['huron','mohican','musket','tomahawk','wilderness','fort','scout','william'] },
  { id: 'be', t: 'Ben-Hur', a: 'Wallace, L.', y: 1880, g: 'historical', words: 207000, vocab: 9400, call: 'PS 3138 .B4 1880', x: 0.56, y: 0.80, kw: ['rome','chariot','jerusalem','galley','messala','golgotha','centurion'] },

  // ── Speculative ─────────────────────────────────────────────
  { id: 'tm', t: 'The Time Machine', a: 'Wells, H. G.', y: 1895, g: 'speculative', words: 32000, vocab: 4000, call: 'PR 5774 .T5 1895', x: 0.40, y: 0.88, kw: ['eloi','morlock','sphinx','crystal','epoch','traveller','aeon','dial'] },
  { id: 'wm', t: 'The War of the Worlds', a: 'Wells, H. G.', y: 1898, g: 'speculative', words: 60000, vocab: 5200, call: 'PR 5774 .W3 1898', x: 0.36, y: 0.92, kw: ['martian','tripod','heat-ray','surrey','red','weed','artilleryman'] },
  { id: 'mi', t: 'The Island of Doctor Moreau', a: 'Wells, H. G.', y: 1896, g: 'speculative', words: 42000, vocab: 4400, call: 'PR 5774 .I8 1896', x: 0.38, y: 0.86, kw: ['vivisection','island','beast','law','sayer','prendick','moreau'] },
  { id: 'fl', t: 'Flatland', a: 'Abbott, E. A.', y: 1884, g: 'speculative', words: 32000, vocab: 3600, call: 'PA 3947 .F5 1884', x: 0.42, y: 0.90, kw: ['polygon','sphere','dimension','square','line','solid','romance'] },
  { id: 'ee', t: 'Erewhon', a: 'Butler, S.', y: 1872, g: 'speculative', words: 90000, vocab: 6900, call: 'PR 4344 .E7 1872', x: 0.34, y: 0.84, kw: ['machine','college','musical','bank','citizen','reformer','colonel'] },
];

window.GENRE_DESC = {
  gothic:       'Houses with weather. Dread as inheritance.',
  mystery:      'Reason walking a closed corridor.',
  literary:     'The fine grain of provincial life.',
  romance:      'Letters, ballrooms, second attachments.',
  adventure:    'Maps with edges. Vessels and weather.',
  western:      'Open range, fewer adjectives.',
  historical:   'Costume; consequence.',
  speculative:  'Premise as protagonist.',
};
