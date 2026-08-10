#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'js', 'data.js');
const DETAIL_ROOT = path.join(ROOT, 'kleurplaat');
const VERCEL_FILE = path.join(ROOT, 'vercel.json');
const SITE = 'https://kidslovecolor.com';

const PAGES = [
  {
    slug: 'puppy-playing-with-a-ball-in-the-garden',
    pageTitle: 'Puppy met een bal in de tuin',
    storyTitle: 'Welke kleur krijgt zijn favoriete bal?',
    scene: 'De puppy rent door de tuin alsof hij de bal voor het eerst ziet. Misschien krijgt hij een goudbruine vacht, zwarte vlekjes of juist een fantasievacht vol regenboogkleuren. Rondom hem staan bloemen, bomen en een houten hek: genoeg kleine plekjes om steeds een nieuwe kleur uit te proberen.'
  },
  {
    slug: 'monster-truck-jumping-over-cars',
    pageTitle: 'Monstertruck springt over auto’s',
    storyTitle: 'Hoe ziet jouw monstertruckshow eruit?',
    scene: 'De enorme banden komen los van de grond en de monstertruck vliegt recht over de rij auto’s. Geef de carrosserie vlammen, bliksems of een zelfbedacht teamlogo en maak van de arena een spectaculaire show met jouw favoriete kleuren.'
  },
  {
    slug: 'trex-dinosaur-roaring-in-a-prehistoric-jungle',
    pageTitle: 'Brullende T-Rex in de prehistorische jungle',
    storyTitle: 'Welke kleuren had de koning van de dino’s?',
    scene: 'Tussen reusachtige varens en oeroude bomen laat deze T-Rex zijn luidste brul horen. Niemand weet precies welke kleuren dinosaurussen hadden, dus jij mag fossielbruin kiezen — of knaloranje, gestreept groen en paarse stekels.'
  },
  {
    slug: 'kawaii-dinosaur-playing-with-balloons',
    pageTitle: 'Lieve dinosaurus met ballonnen',
    storyTitle: 'Naar welk feestje zweeft deze dino?',
    scene: 'Deze vrolijke dino heeft zijn engste brul thuisgelaten en houdt een hele tros ballonnen vast. Maak elke ballon anders, verzin slingers op de achtergrond en geef hem feestelijke stippen of strepen op zijn rug.'
  },
  {
    slug: 'baby-stegosaurus',
    pageTitle: 'Baby Stegosaurus in het oerwoud',
    storyTitle: 'Krijgt deze babydino bonte rugplaten?',
    scene: 'De kleine Stegosaurus stapt nieuwsgierig tussen de bladeren door. Zijn rugplaten zijn perfect voor een kleurpatroon: van licht naar donker, om en om, of allemaal anders. Misschien verstopt er zelfs een piepklein insect tussen de planten.'
  },
  {
    slug: 'dinosaur-brontosaurus',
    pageTitle: 'Brontosaurus tussen de palmbomen',
    storyTitle: 'Hoe hoog kan deze langnek kijken?',
    scene: 'Met zijn lange nek kan de Brontosaurus bij blaadjes waar geen andere dino bij komt. Kleur de lucht, de palmbomen en het prehistorische landschap en bedenk welke kleine dieren beneden tussen zijn poten rondlopen.'
  },
  {
    slug: 'excavator-digging-next-to-a-crane-at-a-busy-construction-site',
    pageTitle: 'Graafmachine en kraan op de bouwplaats',
    storyTitle: 'Wat wordt hier vandaag gebouwd?',
    scene: 'De graafmachine schept aarde terwijl de hoge kraan klaarstaat om zware onderdelen op te tillen. Kies echte bouwplaatskleuren of ontwerp machines voor de toekomst en teken er zelf bij wat straks op deze plek komt te staan.'
  },
  {
    slug: 'fire-truck-with-ladder-driving-to-a-rescue',
    pageTitle: 'Brandweerwagen onderweg naar een redding',
    storyTitle: 'Waar rijdt de brandweer zo snel naartoe?',
    scene: 'Met de ladder op het dak en alle spullen aan boord rijdt de brandweerwagen naar een nieuwe melding. Geef hem opvallende kleuren, laat de zwaailichten stralen en bedenk welk dapper reddingsplan de brandweerlieden straks uitvoeren.'
  },
  {
    slug: 'train-crossing-a-bridge-over-a-river',
    pageTitle: 'Trein rijdt over de brug',
    storyTitle: 'Waar gaat deze trein naartoe?',
    scene: 'De trein dendert over een brug terwijl de rivier rustig onder hem door stroomt. Kleur ieder rijtuig, vul het landschap met bomen en bloemen en fantaseer over de bijzondere bestemming aan het einde van de spoorlijn.'
  },
  {
    slug: 'busy-airport-scene-with-airplanes',
    pageTitle: 'Druk vliegveld vol vliegtuigen',
    storyTitle: 'Welke reis begint op dit vliegveld?',
    scene: 'Op de startbaan gebeurt van alles: vliegtuigen taxiën, koffers gaan aan boord en reizigers kijken naar de vertrekborden. Geef elke luchtvaartmaatschappij een eigen kleur en verzin naar welke landen de toestellen vliegen.'
  },
  {
    slug: 'princess-trying-on-a-glass-slipper',
    pageTitle: 'Prinses past het glazen muiltje',
    storyTitle: 'Past het magische muiltje precies?',
    scene: 'In de grote zaal wordt het glazen muiltje voorzichtig gepast. Laat de schoen schitteren, versier de jurk met patronen en geef het paleis een kleurenpalet dat helemaal bij jouw eigen sprookje past.'
  },
  {
    slug: 'princess-sleeping-in-a-castle-tower',
    pageTitle: 'Slapende prinses in de kasteeltoren',
    storyTitle: 'Waar droomt de prinses over?',
    scene: 'Hoog in de toren ligt de prinses te slapen terwijl het kasteel om haar heen stil is. Kleur haar kamer, de zachte dekens en het uitzicht door het raam en bedenk welk avontuur in haar droom begint.'
  },
  {
    slug: 'princess-castle-with-towers-and-a-garden',
    pageTitle: 'Prinsessenkasteel met torens en tuin',
    storyTitle: 'Wie woont er in jouw droomkasteel?',
    scene: 'Achter de poort wachten hoge torens, kronkelpaden en een koninklijke tuin. Geef elke vlag een eigen ontwerp, plant bloemen in alle kleuren en teken misschien een draak, koets of geheime deur erbij.'
  },
  {
    slug: 'black-african-princess-wearing-a-colorful-traditional-dress-and-beaded-jewelry',
    pageTitle: 'Afrikaanse prinses met kralen en feestelijke kleding',
    storyTitle: 'Welke patronen geef jij haar prachtige kleding?',
    scene: 'Deze trotse prinses draagt een feestelijke jurk en sieraden van kralen. Gebruik warme, heldere kleuren, maak herhalende patronen en laat ieder detail van haar kleding en kroon op een eigen manier stralen.'
  },
  {
    slug: 'mermaid-underwater',
    pageTitle: 'Zeemeermin in de onderwaterwereld',
    storyTitle: 'Welke schatten liggen er onder de golven?',
    scene: 'De zeemeermin zwemt tussen vissen, schelpen en wuivende waterplanten. Geef haar staart glanzende schubben, maak een kleurrijk koraalrif en verstop ergens een piepkleine schat voor wie heel goed kijkt.'
  },
  {
    slug: 'farm-scene-with-cow-pig-and-chicken',
    pageTitle: 'Boerderij met koe, varken en kip',
    storyTitle: 'Wat gebeurt er vandaag op de boerderij?',
    scene: 'De koe, het varken en de kip zijn al vroeg wakker en wachten op een nieuwe dag. Kleur de dieren, de schuur en het landschap en voeg zelf nog een boerderijdier of tractor aan de tekening toe.'
  },
  {
    slug: 'full-body-elephant-walking-in-the-jungle',
    pageTitle: 'Olifant wandelt door de jungle',
    storyTitle: 'Wat ontdekt deze olifant tussen de bomen?',
    scene: 'Rustig loopt de olifant langs grote bladeren en tropische planten. Geef zijn huid zachte grijstinten of fantasiekleuren, laat de jungle bruisen en teken een klein dier dat stiekem met hem meeloopt.'
  },
  {
    slug: 'happy-rabbits-garden',
    pageTitle: 'Vrolijke konijntjes in de tuin',
    storyTitle: 'Welke bloemen vinden de konijntjes het mooist?',
    scene: 'Tussen de bloemen hebben de konijntjes een fijne speelplek gevonden. Geef hun vacht verschillende tinten, vul de tuin met kleur en verstop hier en daar een wortel, lieveheersbeestje of vlinder.'
  },
  {
    slug: 'cute-whale-underwater',
    pageTitle: 'Lieve walvis onder water',
    storyTitle: 'Hoe kleurrijk is de diepe zee?',
    scene: 'De vriendelijke walvis glijdt rustig door het water en blaast straks misschien een fontein boven de golven. Kleur de vissen, bubbels en planten en geef de zee verschillende lagen blauw, groen of paars.'
  },
  {
    slug: 'dolphins-ocean',
    pageTitle: 'Dolfijnen spelen in de oceaan',
    storyTitle: 'Wie maakt de hoogste sprong?',
    scene: 'De dolfijnen zwemmen samen door de golven en dagen elkaar uit voor een vrolijke sprong. Laat het water schitteren, geef de lucht een zomerse kleur en teken extra spetters rond de snelste dolfijn.'
  },
  {
    slug: 'giraffe-eating-leaves-from-a-tall-tree',
    pageTitle: 'Giraf eet blaadjes uit een hoge boom',
    storyTitle: 'Welk patroon krijgt deze lange giraf?',
    scene: 'Met zijn lange nek kan de giraf precies bij de lekkerste bladeren. Kleur zijn vlekken één voor één, maak een zonnig landschap en voeg vogels of kleine savannedieren toe aan de achtergrond.'
  },
  {
    slug: 'baby-unicorn-playing-in-a-flower-meadow',
    pageTitle: 'Baby-eenhoorn in een bloemenweide',
    storyTitle: 'Welke magische kleuren groeien in deze wei?',
    scene: 'De jonge eenhoorn huppelt tussen de bloemen alsof de hele weide van hem is. Geef zijn manen zachte regenboogkleuren, laat zijn hoorn fonkelen en maak van ieder bloemetje een klein kleurfeest.'
  },
  {
    slug: 'sunflower-field-under-a-smiling-sun',
    pageTitle: 'Zonnebloemen onder een lachende zon',
    storyTitle: 'Hoe zonnig kun jij deze kleurplaat maken?',
    scene: 'De zonnebloemen draaien hun grote koppen naar de vrolijke zon. Gebruik geel, oranje en groen of bedenk een compleet fantasieveld waarin elke bloem een andere kleur en een eigen gezicht krijgt.'
  },
  {
    slug: 'forest-scene-with-tall-trees-and-a-stream',
    pageTitle: 'Bos met hoge bomen en een beekje',
    storyTitle: 'Wat leeft er in dit rustige bos?',
    scene: 'Tussen de hoge stammen kronkelt een helder beekje door het bos. Bouw de kleur laag voor laag op: eerst de bladeren, dan het water en daarna alle kleine plekjes waar misschien dieren verscholen zitten.'
  },
  {
    slug: 'summer-beach-crab',
    pageTitle: 'Zomerse krab op het strand',
    storyTitle: 'Wat heeft de krab op het strand gevonden?',
    scene: 'De krab scharrelt door het warme zand, vlak bij de schelpen en de golven. Geef hem een fel rood, oranje of fantasiekleurig schild en teken een zandkasteel waar hij straks naast kan poseren.'
  },
  {
    slug: 'cheerful-bee-family-in-flower-garden',
    pageTitle: 'Vrolijke bijenfamilie in een bloementuin',
    storyTitle: 'Naar welke bloem vliegt de bijenfamilie?',
    scene: 'Drie vrolijke bijen zoemen tussen de grote bloemen door. Geef iedere bij een eigen strepenpatroon, maak alle bloemblaadjes anders en bedenk welke bloem de lekkerste nectar heeft.'
  },
  {
    slug: 'mermaid-reading-in-underwater-library',
    pageTitle: 'Zeemeermin leest in een onderwaterbibliotheek',
    storyTitle: 'Welk verhaal leest de zeemeermin?',
    scene: 'Tussen de koraalboekenkasten heeft de zeemeermin een spannend verhaal gevonden. Kleur haar staart, de vissen en alle boeken en bedenk welke magische avonturen er op de volgende bladzijde staan.'
  },
  {
    slug: 'children-at-skateboard-park',
    pageTitle: 'Kinderen op de skatebaan',
    storyTitle: 'Wie rijdt als eerste van de ramp?',
    scene: 'Met helmen en beschermers aan oefenen twee kinderen rustig op de skatebaan. Ontwerp hun skateboards, geef de kleding sportieve kleuren en maak van de baan een plek waar iedereen veilig nieuwe bewegingen kan proberen.'
  },
  {
    slug: 'adventure-treehouse-with-rope-bridge',
    pageTitle: 'Avontuurlijke boomhut met touwbrug',
    storyTitle: 'Wat zit er in jouw geheime boomhut?',
    scene: 'Hoog tussen de takken verbinden een touwbrug, ladders en een katrol twee bijzondere uitkijkplekken. Kies kleuren voor het hout en de bladeren en bedenk welke schatten in het mandje naar boven worden gehesen.'
  },
  {
    slug: 'japanese-garden-with-koi-pond',
    pageTitle: 'Japanse tuin met koivijver',
    storyTitle: 'Welke kleuren weerspiegelen in de koivijver?',
    scene: 'Vijf koivissen zwemmen rustig onder de gebogen houten brug. Geef elke vis een uniek patroon, kleur de esdoornbladeren en maak van het water een spiegel voor de planten en de stenen lantaarn.'
  },
  {
    slug: 'sleepy-baby-hedgehog-in-a-teacup-with-daisies',
    pageTitle: 'Slaperig baby-egeltje in een theekopje',
    storyTitle: 'Waar droomt het kleine egeltje over?',
    scene: 'Het baby-egeltje heeft tussen de madeliefjes een wel heel knus bed gevonden. Geef het kopje een vrolijk patroon, kleur iedere bloem anders en bedenk welk warm drankje er misschien eerst in het kopje zat.'
  },
  {
    slug: 'red-panda-family-on-tree-branches-in-a-bamboo-forest',
    pageTitle: 'Rode-pandafamilie tussen de bamboe',
    storyTitle: 'Welke route kiezen de rode panda’s door het bos?',
    scene: 'Een volwassen rode panda en haar jong klauteren voorzichtig over stevige takken tussen de bamboe. Geef hun lange ringstaarten een mooi patroon en laat het bladerdak in allerlei groentinten tot leven komen.'
  },
  {
    slug: 'harbor-tugboat-guiding-a-cargo-ship-between-buoys',
    pageTitle: 'Sleepboot begeleidt een vrachtschip',
    storyTitle: 'Hoe helpt de kleine sleepboot het grote schip?',
    scene: 'De sterke sleepboot vaart vlak langs het grote vrachtschip en helpt het veilig tussen de boeien door. Kleur het water, de dekken en de containers en geef ieder schip een eigen opvallende kleur.'
  },
  {
    slug: 'rainforest-canopy-walkway-with-orchids-and-butterflies',
    pageTitle: 'Boomkroonpad in het tropisch regenwoud',
    storyTitle: 'Wat ontdek je hoog tussen de boomtoppen?',
    scene: 'Een stevig hangpad loopt tussen hoge regenwoudbomen, met orchideeën en vlinders vlakbij en een waterval diep beneden. Bouw het groen laag voor laag op en geef iedere bloem en vlinder een eigen kleur.'
  },
  {
    slug: 'tiny-forest-dragon-reading-a-treasure-map-by-a-mushroom-cottage',
    pageTitle: 'Kleine bosdraak leest een schatkaart',
    storyTitle: 'Waar leidt de kaart van de bosdraak naartoe?',
    scene: 'Naast zijn paddenstoelenhuisje bekijkt de kleine bosdraak aandachtig een kaart. Geef zijn schubben een fantasiepatroon, kleur het huisje en verzin welke geheime plek hij straks in het betoverde bos gaat zoeken.'
  }
];

const CATEGORY = {
  dieren: {label: 'Dieren', singular: 'dierenkleurplaat'},
  voertuigen: {label: 'Voertuigen', singular: 'voertuigenkleurplaat'},
  prinsessen: {label: 'Prinsessen', singular: 'prinsessenkleurplaat'},
  natuur: {label: 'Natuur', singular: 'natuurkleurplaat'},
  seizoenen: {label: 'Seizoenen', singular: 'seizoenskleurplaat'},
  sprookjes: {label: 'Sprookjes', singular: 'sprookjeskleurplaat'},
  kawaii: {label: 'Kawaii', singular: 'kawaii kleurplaat'}
};

const DIFFICULTY = {
  easy: {label: 'Makkelijk', adjective: 'makkelijke', dots: '●○○', age: 'Jonge kinderen'},
  medium: {label: 'Gemiddeld', adjective: 'gemiddelde', dots: '●●○', age: 'Kinderen vanaf 6 jaar'},
  hard: {label: 'Uitdagend', adjective: 'uitdagende', dots: '●●●', age: 'Ervaren kleurders'}
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeJson(value) {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

function jpegSize(file) {
  const buffer = fs.readFileSync(file);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7)};
    }
    offset += 2 + length;
  }
  throw new Error(`Geen JPEG-afmetingen gevonden voor ${file}`);
}

function readColorings() {
  const sandbox = {window: {}};
  vm.runInNewContext(fs.readFileSync(DATA_FILE, 'utf8'), sandbox, {filename: DATA_FILE});
  return sandbox.window.COLORINGS;
}

function filenameFor(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function relatedMarkup(items) {
  return items.map((entry) => `
        <a class="related-card" href="/kleurplaat/${escapeHtml(entry.slug)}">
          <img src="${escapeHtml(entry.thumb)}" alt="${escapeHtml(entry.alt)}" width="${entry.thumbWidth}" height="${entry.thumbHeight}" loading="lazy"/>
          <span><small>${escapeHtml(entry.difficultyLabel)}</small>${escapeHtml(entry.pageTitle)}</span>
        </a>`).join('');
}

function detailHtml(page, entry, allPages, entriesBySlug) {
  const category = CATEGORY[entry.category] || {label: entry.category, singular: 'kleurplaat'};
  const difficulty = DIFFICULTY[entry.difficulty] || DIFFICULTY.medium;
  const image = entry.img.replace('..', '');
  const imageFile = path.join(ROOT, image.slice(1));
  const size = jpegSize(imageFile);
  const thumb = image.replace('/kleurplaten/', '/kleurplaten/thumbs/');
  const thumbSize = jpegSize(path.join(ROOT, thumb.slice(1)));
  const canonical = `${SITE}/kleurplaat/${entry.slug}`;
  const orientation = size.width > size.height ? 'liggend' : 'staand';
  const fileBase = filenameFor(page.pageTitle);
  const metaDescription = `Gratis ${category.singular} van ${page.pageTitle.toLowerCase()}. Direct printen of downloaden zonder account, advertenties of pop-ups.`;
  const related = allPages
    .filter((candidate) => candidate.slug !== page.slug && entriesBySlug.get(candidate.slug).category === entry.category)
    .concat(allPages.filter((candidate) => candidate.slug !== page.slug && entriesBySlug.get(candidate.slug).category !== entry.category))
    .slice(0, 3)
    .map((candidate) => {
      const relatedEntry = entriesBySlug.get(candidate.slug);
      const relatedImage = relatedEntry.img.replace('..', '');
      const relatedThumb = relatedImage.replace('/kleurplaten/', '/kleurplaten/thumbs/');
      const relatedThumbSize = jpegSize(path.join(ROOT, relatedThumb.slice(1)));
      return {
        slug: candidate.slug,
        pageTitle: candidate.pageTitle,
        thumb: relatedThumb,
        thumbWidth: relatedThumbSize.width,
        thumbHeight: relatedThumbSize.height,
        alt: relatedEntry.nl.altText,
        difficultyLabel: (DIFFICULTY[relatedEntry.difficulty] || DIFFICULTY.medium).label
      };
    });
  const pageData = {
    slug: entry.slug,
    title: page.pageTitle,
    category: entry.category,
    difficulty: entry.difficulty,
    image,
    alt: entry.nl.altText,
    orientation: size.width > size.height ? 'landscape' : 'portrait',
    jpgFilename: `${fileBase}-kleurplaat-kidslovecolor.jpg`,
    pdfFilename: `${fileBase}-kleurplaat-kidslovecolor.pdf`
  };
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'KidsLoveColor',
        url: `${SITE}/`,
        logo: {'@type': 'ImageObject', url: `${SITE}/img/logo.svg`}
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: 'KidsLoveColor',
        publisher: {'@id': `${SITE}/#organization`}
      },
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: `${page.pageTitle} kleurplaat – gratis printen`,
        description: metaDescription,
        isPartOf: {'@id': `${SITE}/#website`},
        primaryImageOfPage: {'@id': `${canonical}#image`},
        breadcrumb: {'@id': `${canonical}#breadcrumb`},
        inLanguage: 'nl-NL'
      },
      {
        '@type': 'ImageObject',
        '@id': `${canonical}#image`,
        name: `${page.pageTitle} – gratis kleurplaat`,
        caption: page.scene,
        description: metaDescription,
        contentUrl: `${SITE}${image}`,
        thumbnailUrl: `${SITE}${thumb}`,
        encodingFormat: 'image/jpeg',
        width: size.width,
        height: size.height,
        representativeOfPage: true,
        creator: {'@id': `${SITE}/#organization`},
        creditText: 'KidsLoveColor',
        copyrightNotice: 'Gratis voor persoonlijk en educatief gebruik',
        license: `${SITE}/disclaimer`,
        acquireLicensePage: `${SITE}/contact`
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: [
          {'@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/`},
          {'@type': 'ListItem', position: 2, name: `${category.label} kleurplaten`, item: `${SITE}/?cat=${entry.category}`},
          {'@type': 'ListItem', position: 3, name: page.pageTitle}
        ]
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="nl" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8"/>
  <base href="/"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(page.pageTitle)} Kleurplaat – Gratis Printen | KidsLoveColor</title>
  <meta name="description" content="${escapeHtml(metaDescription)}"/>
  <meta name="author" content="KidsLoveColor"/>
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1"/>
  <meta name="theme-color" content="#c96d91"/>
  <link rel="canonical" href="${canonical}"/>
  <meta property="og:type" content="article"/>
  <meta property="og:url" content="${canonical}"/>
  <meta property="og:site_name" content="KidsLoveColor"/>
  <meta property="og:locale" content="nl_NL"/>
  <meta property="og:title" content="${escapeHtml(page.pageTitle)} – Gratis Kleurplaat"/>
  <meta property="og:description" content="${escapeHtml(metaDescription)}"/>
  <meta property="og:image" content="${SITE}${image}"/>
  <meta property="og:image:secure_url" content="${SITE}${image}"/>
  <meta property="og:image:type" content="image/jpeg"/>
  <meta property="og:image:width" content="${size.width}"/>
  <meta property="og:image:height" content="${size.height}"/>
  <meta property="og:image:alt" content="${escapeHtml(entry.nl.altText)}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(page.pageTitle)} – Gratis Kleurplaat"/>
  <meta name="twitter:description" content="Direct gratis printen of downloaden zonder account."/>
  <meta name="twitter:image" content="${SITE}${image}"/>
  <link rel="icon" href="/img/logo.svg" type="image/svg+xml"/>
  <link rel="apple-touch-icon" href="/img/apple-touch-icon.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://use.typekit.net/ovm7wat.css"/>
  <link rel="stylesheet" href="/css/style.css"/>
  <link rel="stylesheet" href="/css/redesign.css?v=20260728e"/>
  <link rel="stylesheet" href="/css/coloring-detail.css?v=20260730a"/>
  <script type="application/ld+json">${safeJson(structured)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-SKLBTW5Z87"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-SKLBTW5Z87');
  </script>
</head>
<body class="coloring-detail-page">
  <a href="#main" class="skip-link">Ga naar de kleurplaat</a>
  <header class="site-header detail-site-header" role="banner">
    <div class="header-top">
      <a href="/" class="logo" aria-label="KidsLoveColor homepage">
        <img src="/img/logo.svg" alt="KidsLoveColor" class="logo-img" width="54" height="54"/>
      </a>
      <nav class="detail-header-nav" aria-label="Hoofdnavigatie">
        <a href="/?cat=${escapeHtml(entry.category)}">${escapeHtml(category.label)}</a>
        <a href="/vandaag-op-aarde">Vandaag op Aarde</a>
        <a class="detail-header-cta" href="/">Alle kleurplaten <span aria-hidden="true">→</span></a>
      </nav>
    </div>
  </header>
  <nav class="coloring-breadcrumb" aria-label="Broodkruimel">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/?cat=${escapeHtml(entry.category)}">${escapeHtml(category.label)}</a></li>
      <li aria-current="page">${escapeHtml(page.pageTitle)}</li>
    </ol>
  </nav>
  <main id="main">
    <article class="coloring-detail">
      <div class="coloring-detail-art">
        <div class="coloring-paper">
          <img src="${image}" alt="${escapeHtml(entry.nl.altText)}" width="${size.width}" height="${size.height}" fetchpriority="high" decoding="async"/>
        </div>
        <p class="coloring-art-caption"><span aria-hidden="true">♡</span> Gratis voor persoonlijk en educatief gebruik</p>
      </div>
      <div class="coloring-detail-copy">
        <p class="detail-eyebrow">${escapeHtml(category.singular)} · ${escapeHtml(difficulty.label.toLowerCase())}</p>
        <h1>${escapeHtml(page.pageTitle)}</h1>
        <p class="detail-lead">Een ${escapeHtml(difficulty.adjective)} kleurplaat vol leuke details. Print hem op A4 of download hem gratis — zonder account, advertenties of vervelende pop-ups.</p>
        <dl class="coloring-facts">
          <div><dt>Moeilijkheid</dt><dd><span aria-hidden="true">${difficulty.dots}</span> ${escapeHtml(difficulty.label)}</dd></div>
          <div><dt>Leuk voor</dt><dd>${escapeHtml(difficulty.age)}</dd></div>
          <div><dt>Formaat</dt><dd>A4 · ${orientation}</dd></div>
        </dl>
        <div class="coloring-actions" aria-label="Kleurplaatacties">
          <button class="detail-action detail-action-primary" type="button" id="detailPrint"><span aria-hidden="true">⌁</span> Print kleurplaat</button>
          <a class="detail-action detail-action-secondary" id="detailDownload" href="${image}" download="${escapeHtml(pageData.jpgFilename)}"><span aria-hidden="true">↓</span> Download JPG</a>
          <button class="detail-action detail-action-quiet" type="button" id="detailPdf">Download PDF</button>
        </div>
        <p class="action-status" id="actionStatus" aria-live="polite"></p>
        <div class="detail-promise">
          <span class="detail-promise-mark" aria-hidden="true">☺</span>
          <p><strong>Gewoon kiezen, printen en kleuren.</strong><br/>Gratis, reclamevrij en zonder registratie.</p>
        </div>
      </div>
    </article>
    <section class="coloring-story" aria-labelledby="storyHeading">
      <div>
        <p class="detail-eyebrow">Een klein kleurverhaal</p>
        <h2 id="storyHeading">${escapeHtml(page.storyTitle)}</h2>
      </div>
      <div class="coloring-story-copy">
        <p>${escapeHtml(page.scene)}</p>
        <p>Op deze ${escapeHtml(difficulty.adjective)} kleurplaat kun je grote vlakken combineren met kleinere details. Potloden, krijtjes of stiften mogen allemaal — en buiten de lijntjes kleuren natuurlijk ook. Kijk na afloop eens hoeveel nieuwe details je in jouw eigen versie hebt ontdekt.</p>
      </div>
    </section>
    <section class="coloring-related" aria-labelledby="relatedHeading">
      <div class="related-heading">
        <div><p class="detail-eyebrow">Nog meer ${escapeHtml(category.label.toLowerCase())}</p><h2 id="relatedHeading">Verder kleuren</h2></div>
        <a href="/?cat=${escapeHtml(entry.category)}">Bekijk alle ${escapeHtml(category.label.toLowerCase())} <span aria-hidden="true">→</span></a>
      </div>
      <div class="related-grid">${relatedMarkup(related)}
      </div>
    </section>
    <section class="detail-support" aria-labelledby="supportHeading">
      <p>Gemaakt aan onze keukentafel</p>
      <h2 id="supportHeading">Help deze kleurwereld gratis en reclamevrij te houden.</h2>
      <a href="/#steun-ons">Steun Kids Love Color <span aria-hidden="true">↗</span></a>
    </section>
  </main>
  <footer class="site-footer detail-footer" role="contentinfo">
    <div class="footer-inner">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo" aria-label="KidsLoveColor homepage"><img src="/img/logo.svg" alt="KidsLoveColor" class="logo-img footer-logo-img" width="54" height="54"/></a>
          <p>Gratis printbare kleurplaten voor thuis, school en onderweg. Zonder advertenties en zonder account.</p>
        </div>
        <nav class="footer-links" aria-label="Ontdek">
          <h4>Ontdek</h4>
          <ul><li><a href="/?cat=dieren">Dieren kleurplaten</a></li><li><a href="/vandaag-op-aarde">Vandaag op Aarde</a></li><li><a href="/#steun-ons">Steun ons</a></li></ul>
        </nav>
        <nav class="footer-links" aria-label="Informatie">
          <h4>Informatie</h4>
          <ul><li><a href="/over">Over ons</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/disclaimer">Gebruik</a></li></ul>
        </nav>
      </div>
      <div class="footer-bottom"><span>© 2026 KidsLoveColor.com</span><span>Gratis voor persoonlijk en educatief gebruik</span></div>
    </div>
  </footer>
  <script type="application/json" id="coloringPageData">${safeJson(pageData)}</script>
  <script src="/js/coloring-detail.js?v=20260730a"></script>
</body>
</html>
`;
}

function updateVercel() {
  const config = JSON.parse(fs.readFileSync(VERCEL_FILE, 'utf8'));
  const nonDetailRewrites = config.rewrites.filter((rewrite) => {
    return rewrite.source === '/kleurplaat/(.*)' || !rewrite.source.startsWith('/kleurplaat/');
  });
  const detailRewrites = PAGES.map((page) => ({
    source: `/kleurplaat/${page.slug}`,
    destination: `/kleurplaat/${page.slug}/index.html`
  }));
  const catchAllIndex = nonDetailRewrites.findIndex((rewrite) => rewrite.source === '/kleurplaat/(.*)');
  if (catchAllIndex === -1) throw new Error('De kleurplaat catch-all ontbreekt in vercel.json');
  nonDetailRewrites.splice(catchAllIndex, 0, ...detailRewrites);
  config.rewrites = nonDetailRewrites;
  fs.writeFileSync(VERCEL_FILE, `${JSON.stringify(config, null, 2)}\n`);
}

function main() {
  const colorings = readColorings();
  const entriesBySlug = new Map(colorings.map((entry) => [entry.slug, entry]));
  const missing = PAGES.filter((page) => !entriesBySlug.has(page.slug)).map((page) => page.slug);
  if (missing.length) throw new Error(`Ontbrekende slugs in data.js: ${missing.join(', ')}`);

  for (const page of PAGES) {
    const entry = entriesBySlug.get(page.slug);
    const outputDir = path.join(DETAIL_ROOT, page.slug);
    fs.mkdirSync(outputDir, {recursive: true});
    fs.writeFileSync(path.join(outputDir, 'index.html'), detailHtml(page, entry, PAGES, entriesBySlug));
  }
  updateVercel();
  console.log(`✅ ${PAGES.length} zelfstandige kleurplaatpagina’s gegenereerd.`);
}

main();
