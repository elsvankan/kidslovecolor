#!/usr/bin/env node
/**
 * add-colorings.js — KidsLoveColor.com
 *
 * Detecteert nieuwe kleurplaten en voegt ze toe aan:
 *   - js/data.js
 *   - kleurplaat/[slug]/index.html (SEO-pagina)
 *   - sitemap.xml
 *
 * BESTANDSNAAMFORMAAT voor nieuwe kleurplaten:
 *   [categorie]--[moeilijkheid]--[engelse-beschrijving].jpg
 *   Voorbeeld:  dieren--easy--cute-baby-elephant.jpg
 *
 * GEBRUIK:
 *   node add-colorings.js          — verwerkt alle nieuwe bestanden
 *   node add-colorings.js --dry    — droogloop, niets wordt opgeslagen
 */

'use strict';

const fs              = require('fs');
const path            = require('path');
const { execSync }    = require('child_process');

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const ROOT        = __dirname;
const IMG_DIR      = path.join(ROOT, 'img/kleurplaten');
const DATA_JS      = path.join(ROOT, 'js/data.js');
const SLUG_DIR     = path.join(ROOT, 'kleurplaat');
const SITEMAP      = path.join(ROOT, 'sitemap.xml');
const TITLES_FILE  = path.join(IMG_DIR, '.titles.json');
const BASE_URL     = 'https://kidslovecolor.com';
const TODAY        = new Date().toISOString().split('T')[0];
const DRY_RUN      = process.argv.includes('--dry');

// ─────────────────────────────────────────────────────────────
// TITEL-OVERRIDES (optioneel bestand img/kleurplaten/.titles.json)
// Handgeschreven, natuurlijke vertalingen per bestandsnaam, aangeleverd
// door magnific.py voor de vaste onderwerpenpool. Voorkomt kromme
// woord-voor-woord vertalingen bij scènes met meerdere woorden/zinsdelen.
// Formaat: { "bestandsnaam.jpg": { nl: '...', en: '...', fr: '...', es: '...', zh: '...' } }
// ─────────────────────────────────────────────────────────────
function loadTitleOverrides() {
  if (!fs.existsSync(TITLES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(TITLES_FILE, 'utf8'));
  } catch (e) {
    console.warn(`  ⚠ Kan ${TITLES_FILE} niet lezen: ${e.message}`);
    return {};
  }
}

const VALID_CATS = new Set([
  'dieren','voertuigen','prinsessen','seizoenen','feestdagen',
  'eten','kawaii','natuur','sprookjes','ruimte','oceaan',
  'letters','mandala','gezichten',
]);
const VALID_DIFF = new Set(['easy','medium','hard']);

// ─────────────────────────────────────────────────────────────
// VERTAALWOORDENBOEK  EN → NL / FR / ES / ZH
// ─────────────────────────────────────────────────────────────
const DICT = {
  // Beschrijvende woorden
  cute:        { nl:'schattige',       fr:'mignon',          es:'lindo',           zh:'可爱的' },
  baby:        { nl:'baby',            fr:'bébé',            es:'bebé',            zh:'宝宝' },
  little:      { nl:'kleine',          fr:'petit',           es:'pequeño',         zh:'小' },
  small:       { nl:'kleine',          fr:'petit',           es:'pequeño',         zh:'小' },
  big:         { nl:'grote',           fr:'grand',           es:'grande',          zh:'大' },
  happy:       { nl:'vrolijke',        fr:'joyeux',          es:'feliz',           zh:'快乐的' },
  magical:     { nl:'magische',        fr:'magique',         es:'mágico',          zh:'神奇的' },
  beautiful:   { nl:'mooie',           fr:'beau',            es:'hermoso',         zh:'美丽的' },
  pretty:      { nl:'mooie',           fr:'joli',            es:'bonito',          zh:'漂亮的' },
  sweet:       { nl:'zoete',           fr:'doux',            es:'dulce',           zh:'甜蜜的' },
  funny:       { nl:'grappige',        fr:'drôle',           es:'gracioso',        zh:'有趣的' },
  wild:        { nl:'wilde',           fr:'sauvage',         es:'salvaje',         zh:'野生的' },
  sleeping:    { nl:'slapende',        fr:'endormi',         es:'durmiendo',       zh:'睡觉的' },
  flying:      { nl:'vliegende',       fr:'volant',          es:'volando',         zh:'飞翔的' },
  swimming:    { nl:'zwemmende',       fr:'nageant',         es:'nadando',         zh:'游泳的' },
  dancing:     { nl:'dansende',        fr:'dansant',         es:'bailando',        zh:'跳舞的' },
  running:     { nl:'rennende',        fr:'courant',         es:'corriendo',       zh:'奔跑的' },
  sitting:     { nl:'zittende',        fr:'assis',           es:'sentado',         zh:'坐着的' },
  jumping:     { nl:'springende',      fr:'sautant',         es:'saltando',        zh:'跳跃的' },
  playing:     { nl:'spelende',        fr:'jouant',          es:'jugando',         zh:'玩耍的' },
  walking:     { nl:'wandelende',      fr:'marchant',        es:'caminando',       zh:'行走的' },
  floral:      { nl:'bloemen',         fr:'floral',          es:'floral',          zh:'花卉' },
  kawaii:      { nl:'kawaii',          fr:'kawaii',          es:'kawaii',          zh:'卡哇伊' },
  abstract:    { nl:'abstract',        fr:'abstrait',        es:'abstracto',       zh:'抽象' },
  decorative:  { nl:'decoratieve',     fr:'décoratif',       es:'decorativo',      zh:'装饰性' },
  enchanted:   { nl:'betoverde',       fr:'enchanté',        es:'encantado',       zh:'魔法' },
  underwater:  { nl:'onderwater',      fr:'sous-marin',      es:'submarino',       zh:'水下' },
  tropical:    { nl:'tropische',       fr:'tropical',        es:'tropical',        zh:'热带' },
  winter:      { nl:'winter',          fr:'hiver',           es:'invierno',        zh:'冬天' },
  spring:      { nl:'lente',           fr:'printemps',       es:'primavera',       zh:'春天' },
  summer:      { nl:'zomer',           fr:'été',             es:'verano',          zh:'夏天' },
  autumn:      { nl:'herfst',          fr:'automne',         es:'otoño',           zh:'秋天' },
  fall:        { nl:'herfst',          fr:'automne',         es:'otoño',           zh:'秋天' },
  christmas:   { nl:'kerst',           fr:'noël',            es:'navidad',         zh:'圣诞节' },
  halloween:   { nl:'halloween',       fr:'halloween',       es:'halloween',       zh:'万圣节' },
  easter:      { nl:'pasen',           fr:'pâques',          es:'pascua',          zh:'复活节' },
  birthday:    { nl:'verjaardag',      fr:'anniversaire',    es:'cumpleaños',      zh:'生日' },
  valentine:   { nl:'valentijn',       fr:'saint-valentin',  es:'san valentín',    zh:'情人节' },
  female:      { nl:'vrouwelijk',      fr:'féminin',         es:'femenino',        zh:'女性' },
  head:        { nl:'hoofd',           fr:'tête',            es:'cabeza',          zh:'头部' },
  portrait:    { nl:'portret',         fr:'portrait',        es:'retrato',         zh:'肖像' },
  scene:       { nl:'scène',           fr:'scène',           es:'escena',          zh:'场景' },
  pattern:     { nl:'patroon',         fr:'motif',           es:'patrón',          zh:'图案' },
  patterns:    { nl:'patronen',        fr:'motifs',          es:'patrones',        zh:'图案' },
  waves:       { nl:'golven',          fr:'vagues',          es:'olas',            zh:'波浪' },

  // Dieren
  dog:         { nl:'hond',            fr:'chien',           es:'perro',           zh:'狗' },
  puppy:       { nl:'puppy',           fr:'chiot',           es:'cachorro',        zh:'小狗' },
  cat:         { nl:'kat',             fr:'chat',            es:'gato',            zh:'猫' },
  kitten:      { nl:'kitten',          fr:'chaton',          es:'gatito',          zh:'小猫' },
  rabbit:      { nl:'konijn',          fr:'lapin',           es:'conejo',          zh:'兔子' },
  bunny:       { nl:'konijntje',       fr:'lapin',           es:'conejito',        zh:'小兔子' },
  bear:        { nl:'beer',            fr:'ours',            es:'oso',             zh:'熊' },
  lion:        { nl:'leeuw',           fr:'lion',            es:'león',            zh:'狮子' },
  tiger:       { nl:'tijger',          fr:'tigre',           es:'tigre',           zh:'老虎' },
  elephant:    { nl:'olifant',         fr:'éléphant',        es:'elefante',        zh:'大象' },
  giraffe:     { nl:'giraf',           fr:'girafe',          es:'jirafa',          zh:'长颈鹿' },
  horse:       { nl:'paard',           fr:'cheval',          es:'caballo',         zh:'马' },
  pony:        { nl:'pony',            fr:'poney',           es:'poni',            zh:'小马' },
  unicorn:     { nl:'eenhoorn',        fr:'licorne',         es:'unicornio',       zh:'独角兽' },
  dragon:      { nl:'draak',           fr:'dragon',          es:'dragón',          zh:'龙' },
  dinosaur:    { nl:'dinosaurus',      fr:'dinosaure',       es:'dinosaurio',      zh:'恐龙' },
  dinosaurs:   { nl:'dinosaurussen',   fr:'dinosaures',      es:'dinosaurios',     zh:'恐龙' },
  butterfly:   { nl:'vlinder',         fr:'papillon',        es:'mariposa',        zh:'蝴蝶' },
  bird:        { nl:'vogel',           fr:'oiseau',          es:'pájaro',          zh:'鸟' },
  birds:       { nl:'vogels',          fr:'oiseaux',         es:'pájaros',         zh:'鸟' },
  fish:        { nl:'vis',             fr:'poisson',         es:'pez',             zh:'鱼' },
  whale:       { nl:'walvis',          fr:'baleine',         es:'ballena',         zh:'鲸鱼' },
  dolphin:     { nl:'dolfijn',         fr:'dauphin',         es:'delfín',          zh:'海豚' },
  shark:       { nl:'haai',            fr:'requin',          es:'tiburón',         zh:'鲨鱼' },
  octopus:     { nl:'octopus',         fr:'pieuvre',         es:'pulpo',           zh:'章鱼' },
  turtle:      { nl:'schildpad',       fr:'tortue',          es:'tortuga',         zh:'海龟' },
  frog:        { nl:'kikker',          fr:'grenouille',      es:'rana',            zh:'青蛙' },
  fox:         { nl:'vos',             fr:'renard',          es:'zorro',           zh:'狐狸' },
  wolf:        { nl:'wolf',            fr:'loup',            es:'lobo',            zh:'狼' },
  deer:        { nl:'hert',            fr:'cerf',            es:'ciervo',          zh:'鹿' },
  koala:       { nl:'koala',           fr:'koala',           es:'koala',           zh:'考拉' },
  panda:       { nl:'panda',           fr:'panda',           es:'panda',           zh:'熊猫' },
  penguin:     { nl:'pinguïn',         fr:'pingouin',        es:'pingüino',        zh:'企鹅' },
  owl:         { nl:'uil',             fr:'hibou',           es:'búho',            zh:'猫头鹰' },
  eagle:       { nl:'adelaar',         fr:'aigle',           es:'águila',          zh:'鹰' },
  parrot:      { nl:'papegaai',        fr:'perroquet',       es:'loro',            zh:'鹦鹉' },
  duck:        { nl:'eend',            fr:'canard',          es:'pato',            zh:'鸭子' },
  flamingo:    { nl:'flamingo',        fr:'flamant',         es:'flamenco',        zh:'火烈鸟' },
  peacock:     { nl:'pauw',            fr:'paon',            es:'pavo real',       zh:'孔雀' },
  bee:         { nl:'bij',             fr:'abeille',         es:'abeja',           zh:'蜜蜂' },
  ladybug:     { nl:'lieveheersbeestje',fr:'coccinelle',     es:'mariquita',       zh:'瓢虫' },
  snail:       { nl:'slak',            fr:'escargot',        es:'caracol',         zh:'蜗牛' },
  spider:      { nl:'spin',            fr:'araignée',        es:'araña',           zh:'蜘蛛' },
  monkey:      { nl:'aap',             fr:'singe',           es:'mono',            zh:'猴子' },
  zebra:       { nl:'zebra',           fr:'zèbre',           es:'cebra',           zh:'cebra' },
  hippo:       { nl:'nijlpaard',       fr:'hippopotame',     es:'hipopótamo',      zh:'河马' },
  crocodile:   { nl:'krokodil',        fr:'crocodile',       es:'cocodrilo',       zh:'鳄鱼' },
  snake:       { nl:'slang',           fr:'serpent',         es:'serpiente',       zh:'蛇' },
  cow:         { nl:'koe',             fr:'vache',           es:'vaca',            zh:'奶牛' },
  pig:         { nl:'varken',          fr:'cochon',          es:'cerdo',           zh:'猪' },
  sheep:       { nl:'schaap',          fr:'mouton',          es:'oveja',           zh:'羊' },
  chicken:     { nl:'kip',             fr:'poulet',          es:'pollo',           zh:'鸡' },
  rooster:     { nl:'haan',            fr:'coq',             es:'gallo',           zh:'公鸡' },
  stegosaurus: { nl:'stegosaurus',     fr:'stégosaure',      es:'estegosaurio',    zh:'剑龙' },
  brontosaurus:{ nl:'brontosaurus',    fr:'brontosaure',     es:'brontosaurio',    zh:'雷龙' },
  trex:        { nl:'t-rex',           fr:'t-rex',           es:'t-rex',           zh:'霸王龙' },
  mermaid:     { nl:'zeemeermin',      fr:'sirène',          es:'sirena',          zh:'美人鱼' },
  terrier:     { nl:'terriër',         fr:'terrier',         es:'terrier',         zh:'㹴犬' },
  betta:       { nl:'betta',           fr:'betta',           es:'betta',           zh:'泰国斗鱼' },
  manta:       { nl:'mantarog',        fr:'mante raie',      es:'manta raya',      zh:'蝠鲼' },
  ray:         { nl:'rog',             fr:'raie',            es:'raya',            zh:'鳐鱼' },

  // Natuur
  flower:      { nl:'bloem',           fr:'fleur',           es:'flor',            zh:'花' },
  flowers:     { nl:'bloemen',         fr:'fleurs',          es:'flores',          zh:'花朵' },
  rose:        { nl:'roos',            fr:'rose',            es:'rosa',            zh:'玫瑰' },
  sunflower:   { nl:'zonnebloem',      fr:'tournesol',       es:'girasol',         zh:'向日葵' },
  tree:        { nl:'boom',            fr:'arbre',           es:'árbol',           zh:'树' },
  forest:      { nl:'bos',             fr:'forêt',           es:'bosque',          zh:'森林' },
  mountain:    { nl:'berg',            fr:'montagne',        es:'montaña',         zh:'山' },
  river:       { nl:'rivier',          fr:'rivière',         es:'río',             zh:'河流' },
  rainbow:     { nl:'regenboog',       fr:'arc-en-ciel',     es:'arcoíris',        zh:'彩虹' },
  cloud:       { nl:'wolk',            fr:'nuage',           es:'nube',            zh:'云' },
  sun:         { nl:'zon',             fr:'soleil',          es:'sol',             zh:'太阳' },
  moon:        { nl:'maan',            fr:'lune',            es:'luna',            zh:'月亮' },
  star:        { nl:'ster',            fr:'étoile',          es:'estrella',        zh:'星星' },
  stars:       { nl:'sterren',         fr:'étoiles',         es:'estrellas',       zh:'星星' },
  leaf:        { nl:'blad',            fr:'feuille',         es:'hoja',            zh:'叶子' },
  leaves:      { nl:'bladeren',        fr:'feuilles',        es:'hojas',           zh:'叶子' },
  mushroom:    { nl:'paddenstoel',     fr:'champignon',      es:'hongo',           zh:'蘑菇' },
  cactus:      { nl:'cactus',          fr:'cactus',          es:'cactus',          zh:'仙人掌' },
  garden:      { nl:'tuin',            fr:'jardin',          es:'jardín',          zh:'花园' },
  beach:       { nl:'strand',          fr:'plage',           es:'playa',           zh:'海滩' },
  jungle:      { nl:'jungle',          fr:'jungle',          es:'jungla',          zh:'丛林' },
  desert:      { nl:'woestijn',        fr:'désert',          es:'desierto',        zh:'woestijn' },
  reef:        { nl:'rif',             fr:'récif',           es:'arrecife',        zh:'珊瑚礁' },
  coral:       { nl:'koraal',          fr:'corail',          es:'coral',           zh:'珊瑚' },
  ocean:       { nl:'oceaan',          fr:'océan',           es:'océano',          zh:'海洋' },
  sea:         { nl:'zee',             fr:'mer',             es:'mar',             zh:'海' },

  // Sprookjes / fantasy
  princess:    { nl:'prinses',         fr:'princesse',       es:'princesa',        zh:'公主' },
  prince:      { nl:'prins',           fr:'prince',          es:'príncipe',        zh:'王子' },
  castle:      { nl:'kasteel',         fr:'château',         es:'castillo',        zh:'城堡' },
  fairy:       { nl:'fee',             fr:'fée',             es:'hada',            zh:'仙女' },
  knight:      { nl:'ridder',          fr:'chevalier',       es:'caballero',       zh:'骑士' },
  wizard:      { nl:'tovenaar',        fr:'sorcier',         es:'mago',            zh:'巫师' },
  witch:       { nl:'heks',            fr:'sorcière',        es:'bruja',           zh:'女巫' },
  crown:       { nl:'kroon',           fr:'couronne',        es:'corona',          zh:'皇冠' },
  treasure:    { nl:'schat',           fr:'trésor',          es:'tesoro',          zh:'宝藏' },
  chest:       { nl:'kist',            fr:'coffre',          es:'cofre',           zh:'宝箱' },
  pirate:      { nl:'piraat',          fr:'pirate',          es:'pirata',          zh:'海盗' },

  // Eten
  cupcake:     { nl:'cupcake',         fr:'cupcake',         es:'magdalena',       zh:'纸杯蛋糕' },
  cake:        { nl:'taart',           fr:'gâteau',          es:'pastel',          zh:'蛋糕' },
  pizza:       { nl:'pizza',           fr:'pizza',           es:'pizza',           zh:'披萨' },
  donut:       { nl:'donut',           fr:'beignet',         es:'rosquilla',       zh:'甜甜圈' },
  cookie:      { nl:'koekje',          fr:'biscuit',         es:'galleta',         zh:'饼干' },
  cookies:     { nl:'koekjes',         fr:'biscuits',        es:'galletas',        zh:'饼干' },
  fruit:       { nl:'fruit',           fr:'fruit',           es:'fruta',           zh:'水果' },
  apple:       { nl:'appel',           fr:'pomme',           es:'manzana',         zh:'苹果' },
  strawberry:  { nl:'aardbei',         fr:'fraise',          es:'fresa',           zh:'草莓' },
  candy:       { nl:'snoep',           fr:'bonbon',          es:'caramelo',        zh:'糖果' },
  sweets:      { nl:'snoepjes',        fr:'bonbons',         es:'dulces',          zh:'糖果' },
  tea:         { nl:'thee',            fr:'thé',             es:'té',              zh:'茶' },
  boba:        { nl:'boba',            fr:'boba',            es:'boba',            zh:'珍珠奶茶' },
  ice:         { nl:'ijs',             fr:'glace',           es:'helado',          zh:'冰' },

  // Ruimte
  rocket:      { nl:'raket',           fr:'fusée',           es:'cohete',          zh:'火箭' },
  planet:      { nl:'planeet',         fr:'planète',         es:'planeta',         zh:'行星' },
  planets:     { nl:'planeten',        fr:'planètes',        es:'planetas',        zh:'行星' },
  astronaut:   { nl:'astronaut',       fr:'astronaute',      es:'astronauta',      zh:'宇航员' },
  alien:       { nl:'alien',           fr:'extraterrestre',  es:'extraterrestre',  zh:'外星人' },
  galaxy:      { nl:'melkweg',         fr:'galaxie',         es:'galaxia',         zh:'星系' },
  space:       { nl:'ruimte',          fr:'espace',          es:'espacio',         zh:'太空' },
  comet:       { nl:'komeet',          fr:'comète',          es:'cometa',          zh:'彗星' },

  // Voertuigen
  car:         { nl:'auto',            fr:'voiture',         es:'coche',           zh:'汽车' },
  truck:       { nl:'vrachtwagen',     fr:'camion',          es:'camión',          zh:'卡车' },
  bus:         { nl:'bus',             fr:'bus',             es:'autobús',         zh:'公共汽车' },
  train:       { nl:'trein',           fr:'train',           es:'tren',            zh:'火车' },
  airplane:    { nl:'vliegtuig',       fr:'avion',           es:'avión',           zh:'飞机' },
  plane:       { nl:'vliegtuig',       fr:'avion',           es:'avión',           zh:'飞机' },
  boat:        { nl:'boot',            fr:'bateau',          es:'barco',           zh:'船' },
  ship:        { nl:'schip',           fr:'navire',          es:'barco',           zh:'轮船' },
  bicycle:     { nl:'fiets',           fr:'vélo',            es:'bicicleta',       zh:'自行车' },
  bike:        { nl:'fiets',           fr:'vélo',            es:'bicicleta',       zh:'自行车' },
  helicopter:  { nl:'helikopter',      fr:'hélicoptère',     es:'helicóptero',     zh:'直升机' },
  firefighter: { nl:'brandweerman',    fr:'pompier',         es:'bombero',         zh:'消防员' },
  police:      { nl:'politie',         fr:'police',          es:'policía',         zh:'警察' },

  // Overig
  heart:       { nl:'hart',            fr:'coeur',           es:'corazón',         zh:'心形' },
  hearts:      { nl:'hartjes',         fr:'coeurs',          es:'corazones',       zh:'心形' },
  balloon:     { nl:'ballon',          fr:'ballon',          es:'globo',           zh:'气球' },
  balloons:    { nl:'ballonnen',       fr:'ballons',         es:'globos',          zh:'气球' },
  gift:        { nl:'cadeau',          fr:'cadeau',          es:'regalo',          zh:'礼物' },
  letter:      { nl:'letter',          fr:'lettre',          es:'letra',           zh:'字母' },
  face:        { nl:'gezicht',         fr:'visage',          es:'cara',            zh:'脸' },
  girl:        { nl:'meisje',          fr:'fille',           es:'niña',            zh:'女孩' },
  boy:         { nl:'jongen',          fr:'garçon',          es:'niño',            zh:'男孩' },
  family:      { nl:'familie',         fr:'famille',         es:'familia',         zh:'家庭' },
  house:       { nl:'huis',            fr:'maison',          es:'casa',            zh:'房子' },
  mandala:     { nl:'mandala',         fr:'mandala',         es:'mandala',         zh:'曼陀罗' },
  zentangle:   { nl:'zentangle',       fr:'zentangle',       es:'zentangle',       zh:'禅绕画' },
  camping:     { nl:'kamperen',        fr:'camping',         es:'camping',         zh:'露营' },
  doll:        { nl:'pop',             fr:'poupée',          es:'muñeca',          zh:'玩偶' },
  voodoo:      { nl:'voodoo',          fr:'voodoo',          es:'vudú',            zh:'巫毒' },
  fire:        { nl:'brand',           fr:'feu',             es:'fuego',           zh:'火' },
  branch:      { nl:'tak',             fr:'branche',         es:'rama',            zh:'树枝' },
  football:    { nl:'voetbal',         fr:'football',        es:'fútbol',          zh:'足球' },
  soccer:      { nl:'voetbal',         fr:'football',        es:'fútbol',          zh:'足球' },

  // Voorzetsels/lidwoorden — meestal weglaten, behalve waar een taal het nodig heeft
  with:        { nl:'met',             fr:'avec',            es:'con',             zh:'带' },
  and:         { nl:'en',              fr:'et',              es:'y',               zh:'和' },
  on:          { nl:'op',              fr:'sur',             es:'sobre',           zh:'在' },
  in:          { nl:'in',              fr:'dans',            es:'en',              zh:'在' },
  a:           { nl:'',                fr:'',                es:'',                zh:'' },
  an:          { nl:'',                fr:'',                es:'',                zh:'' },
  the:         { nl:'',                fr:'',                es:'',                zh:'' },
  of:          { nl:'van',             fr:'de',              es:'de',              zh:'的' },

  // Extra woorden voor de rotatiepool
  magic:       { nl:'toverstokje',     fr:'baguette magique',es:'varita mágica',   zh:'魔杖' },
  wand:        { nl:'toverstokje',     fr:'baguette magique',es:'varita mágica',   zh:'魔杖' },
  dress:       { nl:'jurk',            fr:'robe',            es:'vestido',         zh:'裙子' },
  ornaments:   { nl:'kerstballen',     fr:'décorations',     es:'adornos',         zh:'装饰品' },
  pigtails:    { nl:'staartjes',       fr:'couettes',        es:'coletas',         zh:'双马尾' },
  bow:         { nl:'strik',           fr:'nœud',            es:'lazo',            zh:'蝴蝶结' },
  race:        { nl:'race',            fr:'course',          es:'carrera',         zh:'赛车' },
  cars:        { nl:'auto\'s',         fr:'voitures',        es:'coches',          zh:'汽车' },
  competing:   { nl:'wedstrijd rijdend',fr:'en compétition', es:'compitiendo',     zh:'比赛' },
  track:       { nl:'circuit',         fr:'circuit',         es:'pista',           zh:'赛道' },
};

// ─────────────────────────────────────────────────────────────
// BESCHRIJVINGEN PER CATEGORIE
// ─────────────────────────────────────────────────────────────
const CAT_DESC = {
  dieren:     { nl: t => `Gratis kleurplaat van ${t}. Leuk dierenkleurplaatje voor kinderen om in te kleuren en af te drukken.`,
                en: t => `Free coloring page of ${t}. Fun animal coloring page for kids to color and print.`,
                fr: t => `Page à colorier gratuite de ${t}. Amusant coloriage d'animal pour les enfants.`,
                es: t => `Página para colorear gratis de ${t}. Divertido colorear de animales para niños.`,
                zh: t => `免费${t}涂色页，适合儿童的动物涂色，可打印。` },
  voertuigen: { nl: t => `Gratis kleurplaat van ${t}. Stoer voertuigenkleurplaatje voor kinderen.`,
                en: t => `Free coloring page of ${t}. Cool vehicle coloring page for kids.`,
                fr: t => `Page à colorier gratuite de ${t}. Coloriage de véhicule pour les enfants.`,
                es: t => `Página para colorear gratis de ${t}. Colorear vehículos para niños.`,
                zh: t => `免费${t}涂色页，适合儿童的交通工具涂色。` },
  prinsessen: { nl: t => `Gratis prinsessenkleurplaat van ${t}. Magisch kleurplaatje voor kinderen.`,
                en: t => `Free princess coloring page of ${t}. Magical coloring page for kids.`,
                fr: t => `Page à colorier princesse gratuite de ${t}. Coloriage magique pour les enfants.`,
                es: t => `Página para colorear princesa gratis de ${t}. Colorear mágico para niños.`,
                zh: t => `免费公主${t}涂色页，适合儿童的魔法涂色。` },
  seizoenen:  { nl: t => `Gratis seizoenskleurplaat van ${t}. Kleurrijke kleurplaat voor kinderen.`,
                en: t => `Free seasonal coloring page of ${t}. Colorful coloring page for kids.`,
                fr: t => `Page à colorier saisons gratuite de ${t}. Coloriage coloré pour les enfants.`,
                es: t => `Página para colorear estaciones gratis de ${t}. Colorear colorido para niños.`,
                zh: t => `免费季节${t}涂色页，适合儿童的彩色涂色。` },
  feestdagen: { nl: t => `Gratis feestdagenkleurplaat: ${t}. Feestelijk kleurplaatje voor kinderen.`,
                en: t => `Free holiday coloring page: ${t}. Festive coloring page for kids.`,
                fr: t => `Page à colorier fête gratuite: ${t}. Coloriage festif pour les enfants.`,
                es: t => `Página para colorear fiesta gratis: ${t}. Colorear festivo para niños.`,
                zh: t => `免费节日${t}涂色页，适合儿童的节日涂色。` },
  eten:       { nl: t => `Gratis kleurplaat van ${t}. Lekker etenkleurplaatje voor kinderen.`,
                en: t => `Free food coloring page of ${t}. Delicious coloring page for kids.`,
                fr: t => `Page à colorier nourriture gratuite de ${t}. Coloriage délicieux pour les enfants.`,
                es: t => `Página para colorear comida gratis de ${t}. Colorear delicioso para niños.`,
                zh: t => `免费${t}涂色页，适合儿童的食物涂色。` },
  kawaii:     { nl: t => `Gratis kawaii kleurplaat van ${t}. Superschattig kleurplaatje voor kinderen.`,
                en: t => `Free kawaii coloring page of ${t}. Super cute coloring page for kids.`,
                fr: t => `Page à colorier kawaii gratuite de ${t}. Coloriage super mignon pour les enfants.`,
                es: t => `Página para colorear kawaii gratis de ${t}. Colorear súper lindo para niños.`,
                zh: t => `免费卡哇伊${t}涂色页，超可爱儿童涂色。` },
  natuur:     { nl: t => `Gratis natuurkleurplaat van ${t}. Prachtig kleurplaatje voor kinderen.`,
                en: t => `Free nature coloring page of ${t}. Beautiful coloring page for kids.`,
                fr: t => `Page à colorier nature gratuite de ${t}. Magnifique coloriage pour les enfants.`,
                es: t => `Página para colorear naturaleza gratis de ${t}. Hermoso colorear para niños.`,
                zh: t => `免费自然${t}涂色页，适合儿童的自然涂色。` },
  sprookjes:  { nl: t => `Gratis sprookjeskleurplaat van ${t}. Magisch kleurplaatje voor kinderen.`,
                en: t => `Free fairy tale coloring page of ${t}. Magical coloring page for kids.`,
                fr: t => `Page à colorier conte de fées gratuite de ${t}. Coloriage magique pour les enfants.`,
                es: t => `Página para colorear cuento de hadas gratis de ${t}. Colorear mágico para niños.`,
                zh: t => `免费童话${t}涂色页，适合儿童的魔法涂色。` },
  ruimte:     { nl: t => `Gratis ruimtekleurplaat van ${t}. Avontuurlijk kleurplaatje voor kinderen.`,
                en: t => `Free space coloring page of ${t}. Adventurous coloring page for kids.`,
                fr: t => `Page à colorier espace gratuite de ${t}. Coloriage aventureux pour les enfants.`,
                es: t => `Página para colorear espacio gratis de ${t}. Colorear aventurero para niños.`,
                zh: t => `免费太空${t}涂色页，适合儿童的宇宙涂色。` },
  oceaan:     { nl: t => `Gratis oceaankleurplaat van ${t}. Kleurrijke onderwaterkleurplaat voor kinderen.`,
                en: t => `Free ocean coloring page of ${t}. Colorful underwater coloring page for kids.`,
                fr: t => `Page à colorier océan gratuite de ${t}. Coloriage sous-marin coloré pour les enfants.`,
                es: t => `Página para colorear océano gratis de ${t}. Colorear submarino para niños.`,
                zh: t => `免费海洋${t}涂色页，适合儿童的水下涂色。` },
  letters:    { nl: t => `Gratis letterkleurplaat van ${t}. Leerzaam kleurplaatje voor kinderen.`,
                en: t => `Free letter coloring page of ${t}. Educational coloring page for kids.`,
                fr: t => `Page à colorier lettre gratuite de ${t}. Coloriage éducatif pour les enfants.`,
                es: t => `Página para colorear letra gratis de ${t}. Colorear educativo para niños.`,
                zh: t => `免费字母${t}涂色页，适合儿童的教育涂色。` },
  mandala:    { nl: t => `Gratis mandalakleurplaat: ${t}. Ontspannend kleurplaatje met mooie patronen.`,
                en: t => `Free mandala coloring page: ${t}. Relaxing coloring page with beautiful patterns.`,
                fr: t => `Page à colorier mandala gratuite: ${t}. Coloriage relaxant avec de beaux motifs.`,
                es: t => `Página para colorear mandala gratis: ${t}. Colorear relajante con hermosos patrones.`,
                zh: t => `免费曼陀罗${t}涂色页，放松身心的美丽图案涂色。` },
  gezichten:  { nl: t => `Gratis gezichtenkleurplaat van ${t}. Mooi kleurplaatje voor kinderen.`,
                en: t => `Free face coloring page of ${t}. Beautiful coloring page for kids.`,
                fr: t => `Page à colorier visage gratuite de ${t}. Magnifique coloriage pour les enfants.`,
                es: t => `Página para colorear cara gratis de ${t}. Hermoso colorear para niños.`,
                zh: t => `免费面孔${t}涂色页，适合儿童的涂色。` },
};

// ─────────────────────────────────────────────────────────────
// HULPFUNCTIES
// ─────────────────────────────────────────────────────────────
function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function translateWords(words, lang) {
  return words.map(w => {
    const entry = DICT[w.toLowerCase()];
    return entry ? entry[lang] : w;
  });
}

function buildTitle(words, lang) {
  if (lang === 'en') return titleCase(words.join(' '));
  const translated = translateWords(words, lang).filter(Boolean);
  return titleCase(translated.join(' '));
}

const CAT_KEYWORDS = {
  nl: { dieren:'dieren kleurplaat', voertuigen:'voertuigen kleurplaat', prinsessen:'prinsessen kleurplaat',
        seizoenen:'seizoenen kleurplaat', feestdagen:'feestdagen kleurplaat', eten:'eten kleurplaat',
        kawaii:'kawaii kleurplaat', natuur:'natuur kleurplaat', sprookjes:'sprookjes kleurplaat',
        ruimte:'ruimte kleurplaat', oceaan:'oceaan kleurplaat', letters:'letters kleurplaat',
        mandala:'mandala kleurplaat', gezichten:'gezichten kleurplaat' },
  en: { dieren:'animal coloring page', voertuigen:'vehicle coloring page', prinsessen:'princess coloring page',
        seizoenen:'seasonal coloring page', feestdagen:'holiday coloring page', eten:'food coloring page',
        kawaii:'kawaii coloring page', natuur:'nature coloring page', sprookjes:'fairy tale coloring page',
        ruimte:'space coloring page', oceaan:'ocean coloring page', letters:'letter coloring page',
        mandala:'mandala coloring page', gezichten:'face coloring page' },
  fr: { dieren:'coloriage animal', voertuigen:'coloriage véhicule', prinsessen:'coloriage princesse',
        seizoenen:'coloriage saisons', feestdagen:'coloriage fête', eten:'coloriage nourriture',
        kawaii:'coloriage kawaii', natuur:'coloriage nature', sprookjes:'coloriage conte de fées',
        ruimte:'coloriage espace', oceaan:'coloriage océan', letters:'coloriage lettre',
        mandala:'coloriage mandala', gezichten:'coloriage visage' },
  es: { dieren:'colorear animales', voertuigen:'colorear vehículos', prinsessen:'colorear princesas',
        seizoenen:'colorear estaciones', feestdagen:'colorear fiestas', eten:'colorear comida',
        kawaii:'colorear kawaii', natuur:'colorear naturaleza', sprookjes:'colorear cuentos de hadas',
        ruimte:'colorear espacio', oceaan:'colorear océano', letters:'colorear letras',
        mandala:'colorear mandala', gezichten:'colorear caras' },
  zh: { dieren:'动物涂色', voertuigen:'交通工具涂色', prinsessen:'公主涂色',
        seizoenen:'季节涂色', feestdagen:'节日涂色', eten:'食物涂色',
        kawaii:'卡哇伊涂色', natuur:'自然涂色', sprookjes:'童话涂色',
        ruimte:'太空涂色', oceaan:'海洋涂色', letters:'字母涂色',
        mandala:'曼陀罗涂色', gezichten:'面孔涂色' },
};
const KEYWORD_SUFFIX = { nl:'gratis kinderen', en:'free kids', fr:'gratuit enfants', es:'gratis niños', zh:'免费儿童' };

function buildKeywords(words, lang, category) {
  const translated = lang === 'en' ? words.join(' ') : translateWords(words, lang).filter(Boolean).join(' ');
  return `${translated} ${CAT_KEYWORDS[lang][category]} ${KEYWORD_SUFFIX[lang]}`;
}

function keywordsFromTitle(title, lang, category) {
  const words = title.toLowerCase().split(/\s+/).filter(Boolean);
  return `${words.join(' ')} ${CAT_KEYWORDS[lang][category]} ${KEYWORD_SUFFIX[lang]}`;
}

function e(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─────────────────────────────────────────────────────────────
// BESTANDSNAAM PARSEN
// ─────────────────────────────────────────────────────────────
function parseFilename(filename) {
  const base = filename.replace(/\.jpg$/i, '');
  const parts = base.split('--');

  if (parts.length < 3) return null; // niet het juiste formaat

  const category   = parts[0].toLowerCase();
  const difficulty = parts[1].toLowerCase();
  const descRaw    = parts.slice(2).join('-'); // alles na de tweede --
  const slug       = descRaw.replace(/\s+/g,'-').toLowerCase();
  const words      = descRaw.split('-').filter(Boolean);

  if (!VALID_CATS.has(category))   { console.warn(`  ⚠ Onbekende categorie: "${category}" in ${filename}`); return null; }
  if (!VALID_DIFF.has(difficulty)) { console.warn(`  ⚠ Onbekende moeilijkheid: "${difficulty}" in ${filename}`); return null; }

  return { category, difficulty, slug, words, filename };
}

// ─────────────────────────────────────────────────────────────
// ENTRY AANMAKEN
// ─────────────────────────────────────────────────────────────
function buildEntry(id, parsed, overrides) {
  const { category, difficulty, slug, words, filename } = parsed;
  const langs = ['nl','en','fr','es','zh'];
  const desc  = CAT_DESC[category] || CAT_DESC['dieren'];
  const override = (overrides || {})[filename];

  const langData = {};
  for (const lang of langs) {
    const title = override ? override[lang] : buildTitle(words, lang);
    const titleLower = title.toLowerCase();
    langData[lang] = {
      title,
      description: desc[lang](titleLower),
      keywords:    override ? keywordsFromTitle(title, lang, category) : buildKeywords(words, lang, category),
      altText:     lang === 'nl' ? `Gratis kleurplaat ${titleLower} – kinderen`
                 : lang === 'en' ? `Free coloring page ${titleLower} – kids`
                 : lang === 'fr' ? `Page à colorier ${titleLower} – enfants`
                 : lang === 'es' ? `Página para colorear ${titleLower} – niños`
                 :                 `免费涂色页 ${title} – 儿童`,
    };
  }

  const lines = [
    `  {`,
    `    id: ${id}, slug: '${slug}', category: '${category}', difficulty: '${difficulty}',`,
    `    img: '../img/kleurplaten/${filename}',`,
  ];
  for (const lang of langs) {
    const d = langData[lang];
    lines.push(`    ${lang}: { title: '${d.title.replace(/'/g,"\\'")}', description: '${d.description.replace(/'/g,"\\'")}', keywords: '${d.keywords.replace(/'/g,"\\'")}', altText: '${d.altText.replace(/'/g,"\\'")}' },`);
  }
  lines.push(`  },`);
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// SEO-PAGINA AANMAKEN
// ─────────────────────────────────────────────────────────────
function buildSeoPage(parsed, nlTitle, nlDesc) {
  const { slug, filename } = parsed;
  const imgUrl = `${BASE_URL}/img/kleurplaten/${filename}`;
  const pageUrl = `${BASE_URL}/kleurplaat/${slug}`;

  return `<!DOCTYPE html>
<html lang="nl" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${e(nlTitle)} – Gratis Kleurplaat | KidsLoveColor.com</title>
  <meta name="description" content="${e(nlDesc)}"/>
  <link rel="canonical" href="${pageUrl}"/>

  <!-- Open Graph / Pinterest -->
  <meta property="og:type"        content="article"/>
  <meta property="og:url"         content="${pageUrl}"/>
  <meta property="og:title"       content="${e(nlTitle)} – Gratis Kleurplaat"/>
  <meta property="og:description" content="${e(nlDesc)}"/>
  <meta property="og:image"       content="${imgUrl}"/>
  <meta property="og:image:width" content="800"/>
  <meta property="og:image:height" content="800"/>
  <meta property="og:site_name"   content="KidsLoveColor"/>
  <meta property="og:locale"      content="nl_NL"/>

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${e(nlTitle)} – Gratis Kleurplaat"/>
  <meta name="twitter:description" content="${e(nlDesc)}"/>
  <meta name="twitter:image"       content="${imgUrl}"/>

  <!-- Redirect naar SPA -->
  <meta http-equiv="refresh" content="0; url=/"/>
  <script>
    sessionStorage.setItem('spa_path', '/kleurplaat/${slug}');
    window.location.replace('/');
  </script>
</head>
<body>
  <p>Laden… <a href="/">Klik hier als je niet automatisch doorgestuurd wordt.</a></p>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// SITEMAP REGENEREREN
// ─────────────────────────────────────────────────────────────
function regenerateSitemap(allEntries) {
  const hreflang = [
    `    <xhtml:link rel="alternate" hreflang="nl-NL"    href="${BASE_URL}/"/>`,
    `    <xhtml:link rel="alternate" hreflang="en-GB"    href="${BASE_URL}/en/"/>`,
    `    <xhtml:link rel="alternate" hreflang="en-US"    href="${BASE_URL}/en/"/>`,
    `    <xhtml:link rel="alternate" hreflang="fr-FR"    href="${BASE_URL}/fr/"/>`,
    `    <xhtml:link rel="alternate" hreflang="es-ES"    href="${BASE_URL}/es/"/>`,
    `    <xhtml:link rel="alternate" hreflang="zh-Hans"  href="${BASE_URL}/zh/"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/"/>`,
  ].join('\n');

  const homepages = [
    ['/', '1.0'],
    ['/en/', '0.9'],
    ['/fr/', '0.9'],
    ['/es/', '0.9'],
    ['/zh/', '0.9'],
  ].map(([loc, pri]) => `  <url>\n    <loc>${BASE_URL}${loc}</loc>\n${hreflang}\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${pri}</priority>\n  </url>`).join('\n\n');

  const coloringUrls = allEntries.map(({ slug, img, nlTitle, nlDesc }) => {
    const imgFile = img.replace('../img/kleurplaten/', '');
    return `  <url>
    <loc>${BASE_URL}/kleurplaat/${slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc>${BASE_URL}/img/kleurplaten/${imgFile}</image:loc>
      <image:title>${e(nlTitle)} – Gratis Kleurplaat</image:title>
      <image:caption>${e(nlDesc)}</image:caption>
      <image:license>https://creativecommons.org/licenses/by-nc/4.0/</image:license>
    </image:image>
  </url>`;
  }).join('\n\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

${homepages}

${coloringUrls}

</urlset>`;
}

// ─────────────────────────────────────────────────────────────
// BESTAANDE SLUGS UIT DATA.JS LEZEN
// ─────────────────────────────────────────────────────────────
function getExistingSlugs(dataContent) {
  const slugs = new Set();
  const re = /slug:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(dataContent)) !== null) slugs.add(m[1]);
  return slugs;
}

function getMaxId(dataContent) {
  const re = /id:\s*(\d+)/g;
  let max = 190, m;
  while ((m = re.exec(dataContent)) !== null) max = Math.max(max, parseInt(m[1]));
  return max;
}

// Alle entries lezen voor de sitemap
function getAllEntries(dataContent) {
  const re = /slug:\s*'([^']+)'.*?img:\s*'[^']*?([^/']+\.jpg)'.*?nl:\s*\{[^}]*?title:\s*'((?:[^'\\]|\\.)*)'[^}]*?description:\s*'((?:[^'\\]|\\.)*?)'/gs;
  const entries = [];
  let m;
  while ((m = re.exec(dataContent)) !== null) {
    entries.push({
      slug:    m[1],
      img:     m[2],
      nlTitle: m[3].replace(/\\'/g, "'"),
      nlDesc:  m[4].replace(/\\'/g, "'"),
    });
  }
  return entries;
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
function main() {
  console.log(`\n🎨 KidsLoveColor — Nieuwe kleurplaten toevoegen${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // Lees data.js
  let dataContent = fs.readFileSync(DATA_JS, 'utf8');
  const existingSlugs = getExistingSlugs(dataContent);
  let nextId = getMaxId(dataContent) + 1;
  const titleOverrides = loadTitleOverrides();

  if (process.argv.includes('--resync-sitemap')) {
    const allEntries = getAllEntries(dataContent);
    fs.writeFileSync(SITEMAP, regenerateSitemap(allEntries), 'utf8');
    console.log(`✅ sitemap.xml herbouwd (${allEntries.length} kleurplaten), geen nieuwe bestanden verwerkt.\n`);
    return;
  }

  // Lees alle jpg's in img/kleurplaten/
  const allImages = fs.readdirSync(IMG_DIR).filter(f => /\.jpg$/i.test(f));

  // Filter: alleen bestanden met het juiste formaat die nog niet in data.js staan
  const newFiles = allImages.filter(f => {
    const parsed = parseFilename(f);
    if (!parsed) return false;
    if (existingSlugs.has(parsed.slug)) return false;
    return true;
  });

  if (newFiles.length === 0) {
    console.log('✅ Geen nieuwe kleurplaten gevonden. Alles is al verwerkt.\n');
    return;
  }

  console.log(`📋 ${newFiles.length} nieuwe kleurplaat(en) gevonden:\n`);

  const newEntryBlocks = [];
  const addedParsed = [];

  for (const filename of newFiles) {
    const parsed = parseFilename(filename);
    if (!parsed) continue;

    const id = nextId++;
    const entryBlock = buildEntry(id, parsed, titleOverrides);
    newEntryBlocks.push(entryBlock);
    addedParsed.push({ parsed, entryBlock });

    // NL titel en beschrijving voor SEO-pagina
    const override = titleOverrides[filename];
    const nlTitle = override ? override.nl : buildTitle(parsed.words, 'nl');
    const nlDesc  = CAT_DESC[parsed.category].nl(nlTitle.toLowerCase());

    console.log(`  ✚ [${id}] ${parsed.slug} (${parsed.category}, ${parsed.difficulty})`);

    if (!DRY_RUN) {
      // Watermark toevoegen
      const imgPath = path.join(IMG_DIR, filename);
      try {
        execSync(`python3 "${path.join(ROOT, 'watermark.py')}" "${imgPath}"`, { stdio: 'pipe' });
        console.log(`     🖼  Watermark toegevoegd`);
      } catch (e) {
        console.warn(`     ⚠  Watermark mislukt: ${e.stderr?.toString().trim() || e.message}`);
      }

      // SEO-pagina aanmaken
      const slugDir = path.join(SLUG_DIR, parsed.slug);
      fs.mkdirSync(slugDir, { recursive: true });
      fs.writeFileSync(
        path.join(slugDir, 'index.html'),
        buildSeoPage(parsed, nlTitle, nlDesc),
        'utf8'
      );
    }
  }

  if (newEntryBlocks.length === 0) {
    console.log('\n⚠ Geen geldige entries om toe te voegen.\n');
    return;
  }

  if (!DRY_RUN) {
    // Voeg entries toe aan data.js (voor de sluitende `];`)
    const insertPoint = dataContent.lastIndexOf('\n];');
    if (insertPoint === -1) {
      console.error('❌ Kan de sluitende ]; niet vinden in data.js');
      process.exit(1);
    }
    const newBlock = '\n' + newEntryBlocks.join('\n') + '\n';
    dataContent = dataContent.slice(0, insertPoint) + newBlock + dataContent.slice(insertPoint);
    fs.writeFileSync(DATA_JS, dataContent, 'utf8');

    // Sitemap regenereren
    const allEntries = getAllEntries(dataContent);
    fs.writeFileSync(SITEMAP, regenerateSitemap(allEntries), 'utf8');

    console.log(`\n✅ Klaar!`);
    console.log(`   • ${newEntryBlocks.length} entry's toegevoegd aan js/data.js`);
    console.log(`   • ${newEntryBlocks.length} SEO-pagina's aangemaakt in kleurplaat/`);
    console.log(`   • sitemap.xml bijgewerkt (${allEntries.length} kleurplaten)`);
    console.log(`\nVolgende stap: git add -A && git commit -m "Nieuwe kleurplaten toegevoegd" && git push\n`);
  } else {
    console.log(`\n🔍 Dry run klaar — ${newEntryBlocks.length} entry's zouden worden toegevoegd.`);
    console.log('   Verwijder --dry om echt op te slaan.\n');
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildEntry, buildSeoPage, buildTitle, CAT_DESC, loadTitleOverrides };
