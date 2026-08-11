/* =====================================================================
   Salon Plus Studios, shared directory data
   One source of truth for the /salonplus page and the mobile companion
   at /salonplus/app/. Replaced by the Supabase layer once tenants are
   actually signed up; until then, edits happen right here.

   LAYOUT matches the hallways Anne traced on the directory-board plan:
   - A:  300s west hall, full height
   - T:  top connector, from A across to the right building's top row
   - BW: the breezeway between the buildings, runs to the entrance
   - JX: junction arm connecting the breezeway to hall B
   - B:  300s east hall, lower half (327/328/329 front it)
   - BH: bottom hall above 305/303/302
   - D:  200s hall, EAST of 214/205, wrapping down to 201-204
   - H2: hall north of 201-204
   - H3: hall between 103 and the 101D/C/B row
   - H5: hall between 101/101E/101A and 102
   Rooms carry `cor`, the hallway their door opens onto.
   ===================================================================== */

(function () {

  /* ROSTER holds only VERIFIED tenants. The lobby board is years stale
     (it even had Deuces in the wrong suite), so every other name came off
     until confirmed. To verify a studio: move its line up from UNVERIFIED. */
  const ROSTER = {
    '103':  'Soul and Beauty Day Spa', /* claimed via interest form 8/11/26, Christina */
    '212':  'True Story Tha Barber',   /* claimed via interest form 8/11/26, True */
    '301':  'Deuces Nail Studio',   /* board says 302; really 301, confirmed by Anne */
  };

  /* The old directory-board roster, suspect until someone confirms each
     line (suite AND spelling). Not rendered anywhere. */
  const UNVERIFIED_BOARD_ROSTER = {
    '101A': 'HairCutsByAlex',
    '101B': 'Southpaw Studio',
    '106':  'Royal Laser Med Spa',
    '201':  'DO LA LA Salon',
    '202':  'Primos Fine Cuts',
    '203':  "A Vibe Beaute' Bar",
    '205':  'FinedreadLocs Natural Hair Academy',
    '209':  'Style Beauty Salon',
    '211':  'Braids, Dreds & Beyond',
    '215':  "Ruben's Barber Parlor",
    '302':  'SetsByBecca',
    '304':  'Classy Cuts By Rachel',
    '305':  'Nails By Lily',
    '306':  'Empolished',
    '309':  'Cuts From the Heart',
    '310':  'Gala Hair Salon',
    '311':  'Colour Me Beautiful',
    '312':  'AZ Hair Replacement',
    '316':  'Nekendra Salon de Coiffure',
    '317':  'Aisy Beauty Co, LLC',
    '318':  'Feel Good Hair By Robyn',
    '320':  'House of Lavish LLC',
    '321':  'Dees Beauty Studios',
    '322':  'Celia and Barbie Hair and Nails',
    '326':  'Azariah Lynn Hair Studio',
    '327':  'Thelley Fades',
    '328':  'Francois Salon',
    '329':  "E's Cuts",
  };

  const CORRIDORS = [
    { id: 'A',  band: { x: 150, y:  48, w:  36, h: 842 }, seg: { x1: 168, y1:  48, x2: 168, y2: 872 } },
    { id: 'T',  band: { x: 150, y: 104, w: 710, h:  36 }, seg: { x1: 168, y1: 122, x2: 860, y2: 122 } },
    { id: 'BW', band: { x: 442, y: 104, w:  58, h: 842 }, seg: { x1: 469, y1: 122, x2: 469, y2: 946 } },
    { id: 'JX', band: { x: 296, y: 332, w: 204, h:  36 }, seg: { x1: 314, y1: 350, x2: 469, y2: 350 } },
    { id: 'B',  band: { x: 296, y: 332, w:  36, h: 558 }, seg: { x1: 314, y1: 350, x2: 314, y2: 872 } },
    { id: 'BH', band: { x: 150, y: 854, w: 350, h:  36 }, seg: { x1: 168, y1: 872, x2: 469, y2: 872 } },
    { id: 'D',  band: { x: 734, y: 104, w:  38, h: 374 }, seg: { x1: 753, y1: 122, x2: 753, y2: 460 } },
    { id: 'H2', band: { x: 442, y: 442, w: 418, h:  36 }, seg: { x1: 469, y1: 460, x2: 860, y2: 460 } },
    { id: 'H3', band: { x: 442, y: 676, w: 418, h:  36 }, seg: { x1: 469, y1: 694, x2: 860, y2: 694 } },
    { id: 'H5', band: { x: 442, y: 836, w: 418, h:  36 }, seg: { x1: 469, y1: 854, x2: 860, y2: 854 } },
  ];

  const rooms = [];
  const room = (s, x, y, w, h, cor, common) => rooms.push(common ? { s, x, y, w, h, cor, common: 1 } : { s, x, y, w, h, cor });

  /* 300s wing. The middle+right stacks sit BELOW the top connector, so
     their rows start lower than the left stack's. */
  const rowL = i => 48 + i * 62;              // left stack, no connector above
  const rowM = i => i === 0 ? 48 : 84 + i * 62; // middle/right stacks, shifted under T
  const Lcol = ['321','320','318',"Women's","Men's",'316','Break','312','310','308','306',"Women's",null];
  const Mcol = ['322','319','317','326','315','313','311','309','Break','307','304'];
  const Rcol = ['323','324','325','Waiting',null,'327','328','329','330',null,'301'];
  const isCommon = s => !/^\d/.test(s || '');
  /* Right-stack doors per the traced hallways: top suite opens to the
     connector, most open EAST to the breezeway, 327-329 open WEST to B. */
  const rcolCor = { '323':'T','324':'BW','325':'BW','Waiting':'BW','327':'B','328':'B','329':'B','330':'BW','301':'BW' };
  Lcol.forEach((s, i) => s && room(s,  40, rowL(i), 110, 56, 'A', isCommon(s)));
  Mcol.forEach((s, i) => s && room(s, 186, rowM(i), 110, 56, 'A', isCommon(s)));
  Rcol.forEach((s, i) => s && room(s, 332, rowM(i), 110, 56, rcolCor[s] || 'B', isCommon(s)));
  /* the Electric/Utility room fills the bottom-left corner, tall and narrow,
     exactly as the floor plan shows; the 305/303/302 row sits to its right
     and opens north onto the bottom hall */
  room('Electric', 40, 792, 110, 154, 'A', 1);
  room('305', 186, 890, 80, 56, 'BH');
  room('303', 272, 890, 80, 56, 'BH');
  room('302', 358, 890, 84, 56, 'BH');

  /* 200s block. West stack opens onto the breezeway; 214/205 open EAST
     onto hall D, which wraps down toward 201-204. */
  room('211', 500, 48, 104, 56, 'T');
  room('210', 616, 48, 104, 56, 'T');
  room('209', 732, 48, 104, 56, 'T');
  room('212', 500, 146, 104, 52, 'BW');
  room('213', 500, 204, 104, 52, 'BW');
  room('215', 500, 262, 104, 52, 'BW');
  room('Waiting', 500, 320, 104, 52, 'BW', 1);
  room('214', 640, 146, 94, 52, 'D');
  room('205', 640, 204, 94, 110, 'D');
  room('Break', 772, 146, 88, 52, 'D', 1);
  room('207', 772, 204, 88, 52, 'D');
  room('206', 772, 262, 88, 52, 'D');
  room('Restroom', 772, 320, 88, 52, 'D', 1);
  room('201', 500, 478, 104, 58, 'H2');
  room('202', 646, 478, 64, 58, 'H2');
  room('203', 716, 478, 64, 58, 'H2');
  room('204', 786, 478, 74, 58, 'H2');

  /* 100s block. 103 opens south onto H3; the service rooms open west
     onto the breezeway; the 101 cluster hangs off H3 and H5. */
  room('103', 500, 560, 104, 116, 'H3');
  room('Break', 500, 718, 104, 52, 'BW', 1);
  room('Laundry', 500, 776, 104, 52, 'BW', 1);
  /* One suite 101 in the 100s block (per Anne 8/11/26); the subdivided
     101A-E letters and the separate 102 came off the old stale board. */
  room('101',  716, 872, 64, 58, 'H5');

  window.SALONPLUS = {
    ROSTER,
    UNVERIFIED: UNVERIFIED_BOARD_ROSTER,
    LAYOUT: {
      W: 900, H: 990,
      entrance: { x: 469, y: 928 },   // the breezeway mouth, the star on the board
      corridors: CORRIDORS,
      rooms,
      labels: [
        { text: '300s WING',        x:  40, y: 36 },
        { text: '200s',             x: 560, y: 36 },
        { text: '100s',             x: 510, y: 552 },
        { text: 'MAIN ENTRANCE',    x: 350, y: 976 },
      ],
    },
  };

})();
