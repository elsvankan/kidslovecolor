#!/usr/bin/env python3
"""
magnific.py — KidsLoveColor.com
Genereert kleurplaten via Magnific AI en voegt ze toe aan de site.

Gebruik:
  python3 magnific.py <categorie> <moeilijkheid> "<beschrijving>" [--landscape] [--style=chibi|cozy]
  python3 magnific.py kawaii easy "cute cat with flowers"
  python3 magnific.py dieren medium "elephant family in savanna" --landscape
  python3 magnific.py kawaii easy "cute cat with flowers" --style=chibi

  python3 magnific.py --batch [n]      # genereer n kleurplaten (default 5) uit de rotatiepool
  python3 magnific.py --batch --no-push

Stijlen: standard (default), chibi, cozy — zie STYLE_HINTS. Een topic in
TOPIC_POOL kan zelf 'style': 'chibi' zetten om dat altijd te gebruiken.

Categorieën: dieren, voertuigen, prinsessen, seizoenen, feestdagen,
             eten, kawaii, natuur, sprookjes, ruimte, oceaan, letters, mandala, gezichten
Moeilijkheid: easy, medium, hard

Elke run genereert het beeld op A4 (portret of liggend), zet het watermerk
erop, registreert de kleurplaat in alle 5 talen, werkt de sitemap bij en
pusht automatisch naar git (tenzij --no-push).
"""

import sys, os, time, re, json, hashlib, subprocess, io
from pathlib import Path
import requests
from PIL import Image

ROOT        = Path(__file__).parent
ENV         = ROOT / '.env'
API_BASE    = 'https://api.magnific.com/v1'
IMG_DIR     = ROOT / 'img' / 'kleurplaten'
TITLES_FILE = IMG_DIR / '.titles.json'

A4_PORTRAIT  = (1240, 1754)
A4_LANDSCAPE = (1754, 1240)

VALID_CATS = {
    'dieren','voertuigen','prinsessen','seizoenen','feestdagen',
    'eten','kawaii','natuur','sprookjes','ruimte','oceaan',
    'letters','mandala','gezichten','beroepen','actualiteiten',
}

# Stijlhints per categorie voor de prompt
CAT_HINTS = {
    'dieren':     'cute friendly animal character',
    'voertuigen': 'vehicle, transportation machine, clear bold shapes',
    'prinsessen': 'princess, fairy tale character, magical, fantasy dress',
    'seizoenen':  'seasonal nature scene, seasonal elements',
    'feestdagen': 'celebration holiday scene, festive decorations',
    'eten':       'cute kawaii food item, adorable food character',
    'kawaii':     'kawaii Japanese cute style, big round eyes, super cute character',
    'natuur':     'nature scene, plants, flowers, trees',
    'sprookjes':  'fairy tale magical scene, enchanted fantasy',
    'ruimte':     'outer space scene, stars, planets, rockets',
    'oceaan':     'underwater ocean scene, sea creatures, coral',
    'letters':    'decorative alphabet letter, ornamental design',
    'mandala':    'symmetrical mandala pattern, geometric repeating design',
    'gezichten':  'cute character face, expressive portrait, simple face features',
    'beroepen':   'person doing a job or profession, friendly character, work scene',
    'actualiteiten': (
        'a positive, fun, kid-friendly current-events or news theme. Depict the general idea only — '
        'never a real, specific, recognizable named person (no politicians, celebrities or athletes\' '
        'likenesses), never a real brand name, logo or trademarked mascot. Keep it purely celebratory '
        'and age-appropriate: no politics, conflict, disasters or sad topics. Vehicles and technical '
        'objects (rockets, ships, capsules, cars) must be drawn as realistic, recognizable inanimate '
        'objects — never give them a face, eyes, smile or personality; keep the linework clean and '
        'simplified for a coloring page, but geometrically accurate to the real object, not a cute '
        'cartoon character. When a group of people is shown (a team, a crowd, a celebration), include '
        'a natural mix of boys and girls or men and women, not a single gender only.'
    ),
}

# Categorieën waar een mens de hoofdfiguur is — hier passen we automatische
# diversiteit toe zodat het geheel wereldwijd herkenbaar is (Oost-Azië,
# Afrika, Zuid-Azië, Latijns-Amerika, Midden-Oosten, Zuidoost-Azië, Europa,
# gemengd) i.p.v. steeds impliciet hetzelfde standaard AI-gezicht.
HUMAN_CATEGORIES = {'prinsessen', 'gezichten', 'beroepen', 'actualiteiten'}
DIVERSE_APPEARANCES = [
    'East Asian', 'Black African', 'South Asian (Indian)', 'Latin American',
    'Middle Eastern', 'Southeast Asian', 'White European', 'mixed-race',
]
# Trefwoorden die aangeven dat de beschrijving al zelf een etniciteit/regio
# noemt — dan niet nogmaals automatisch overschrijven.
_ETHNICITY_KEYWORDS = (
    'asian', 'african', 'black', 'indian', 'latina', 'latino', 'nordic',
    'middle eastern', 'hispanic', 'chinese', 'european', 'aboriginal',
)


def _diversity_hint(description, category):
    if category not in HUMAN_CATEGORIES:
        return ''
    if any(k in description.lower() for k in _ETHNICITY_KEYWORDS):
        return ''
    idx = int(hashlib.md5(description.encode()).hexdigest(), 16) % len(DIVERSE_APPEARANCES)
    return f' The main character has {DIVERSE_APPEARANCES[idx]} features.'


DIFF_HINTS = {
    'easy':   'very simple large shapes, minimal detail, big areas to fill, for ages 3-6',
    'medium': 'moderate detail, varied line widths, for ages 6-10',
    'hard':   'detailed intricate design, many small areas, for ages 10 and up',
}

# Categorieën waar een close-up gezicht/hoofd wél de bedoeling is
HEAD_OK_CATS = {'gezichten'}

# ─────────────────────────────────────────────────────────────
# ROTATIEPOOL — grote lijst met volledige scènes/figuren (geen
# geïsoleerde hoofden, behalve bij 'gezichten'). Elk item:
# (categorie, moeilijkheid, beschrijving, landscape:bool)
# --batch kiest hieruit de eerstvolgende N die nog niet bestaan.
# ─────────────────────────────────────────────────────────────
# Elk item is een dict: cat, diff, desc (EN, gebruikt voor de Magnific
# prompt + bestandsnaam), landscape, en titles — de HANDGESCHREVEN,
# natuurlijke titel per taal. Deze titels omzeilen het woord-voor-woord
# vertaalwoordenboek in add-colorings.js volledig (dat struikelt over
# volzin-achtige scènebeschrijvingen met voorzetsels/werkwoorden) en
# worden via .titles.json aan add-colorings.js doorgegeven.
TOPIC_POOL = [
    # dieren — volledige lijven, scènes
    dict(cat='dieren', diff='easy', desc='full body elephant walking in the jungle', landscape=False, titles=dict(
        nl='Olifant Wandelend in de Jungle', en='Elephant Walking in the Jungle',
        fr='Éléphant se Promenant dans la Jungle', es='Elefante Caminando en la Selva', zh='在丛林中散步的大象')),
    dict(cat='dieren', diff='medium', desc='lion family resting under a tree', landscape=True, titles=dict(
        nl='Leeuwenfamilie Rustend Onder een Boom', en='Lion Family Resting Under a Tree',
        fr='Famille de Lions se Reposant Sous un Arbre', es='Familia de Leones Descansando Bajo un Árbol', zh='在树下休息的狮子一家')),
    dict(cat='dieren', diff='easy', desc='puppy playing with a ball in the garden', landscape=False, titles=dict(
        nl='Puppy Spelend met een Bal in de Tuin', en='Puppy Playing With a Ball in the Garden',
        fr='Chiot Jouant Avec un Ballon dans le Jardin', es='Cachorro Jugando con una Pelota en el Jardín', zh='在花园里玩球的小狗')),
    dict(cat='dieren', diff='medium', desc='giraffe eating leaves from a tall tree', landscape=False, titles=dict(
        nl='Giraffe Etend van Bladeren uit een Hoge Boom', en='Giraffe Eating Leaves From a Tall Tree',
        fr="Girafe Mangeant des Feuilles d'un Grand Arbre", es='Jirafa Comiendo Hojas de un Árbol Alto', zh='在高树上吃树叶的长颈鹿')),
    dict(cat='dieren', diff='hard', desc='zoo scene with many different animals', landscape=True, titles=dict(
        nl='Dierentuinscène met Veel Verschillende Dieren', en='Zoo Scene With Many Different Animals',
        fr="Scène de Zoo Avec Beaucoup d'Animaux Différents", es='Escena de Zoológico con Muchos Animales Diferentes', zh='有许多不同动物的动物园场景')),
    dict(cat='dieren', diff='medium', desc='monkey swinging from jungle vines', landscape=False, titles=dict(
        nl='Aap Slingerend aan Jungle Lianen', en='Monkey Swinging From Jungle Vines',
        fr='Singe se Balançant sur des Lianes de la Jungle', es='Mono Columpiándose en Lianas de la Selva', zh='在丛林藤蔓上荡秋千的猴子')),
    dict(cat='dieren', diff='easy', desc='farm scene with cow, pig and chicken', landscape=True, titles=dict(
        nl='Boerderijscène met Koe, Varken en Kip', en='Farm Scene With Cow, Pig and Chicken',
        fr='Scène de Ferme Avec Vache, Cochon et Poule', es='Escena de Granja con Vaca, Cerdo y Gallina', zh='有奶牛、猪和小鸡的农场场景')),
    dict(cat='dieren', diff='hard', desc='horse galloping through a meadow', landscape=True, titles=dict(
        nl='Paard Galopperend door een Weiland', en='Horse Galloping Through a Meadow',
        fr='Cheval Galopant à Travers une Prairie', es='Caballo Galopando por un Prado', zh='在草地上飞奔的马')),

    # voertuigen — altijd volledige machine, vaak liggend
    dict(cat='voertuigen', diff='easy', desc='fire truck with ladder driving to a rescue', landscape=True, titles=dict(
        nl='Brandweerwagen met Ladder Onderweg naar een Redding', en='Fire Truck With Ladder Driving to a Rescue',
        fr='Camion de Pompiers Avec Échelle en Mission de Sauvetage', es='Camión de Bomberos con Escalera en una Misión de Rescate', zh='带云梯前往救援的消防车')),
    dict(cat='voertuigen', diff='medium', desc='race cars competing on a track', landscape=True, titles=dict(
        nl="Raceauto's die Wedstrijd Rijden op een Circuit", en='Race Cars Competing on a Track',
        fr='Voitures de Course en Compétition sur un Circuit', es='Coches de Carreras Compitiendo en una Pista', zh='在赛道上比赛的赛车')),
    dict(cat='voertuigen', diff='easy', desc='rocket ship launching into space', landscape=False, titles=dict(
        nl='Raket die Wordt Gelanceerd de Ruimte in', en='Rocket Ship Launching Into Space',
        fr="Fusée qui Décolle Vers l'Espace", es='Cohete Despegando Hacia el Espacio', zh='发射升空的火箭')),
    dict(cat='voertuigen', diff='medium', desc='pirate ship sailing on ocean waves', landscape=True, titles=dict(
        nl='Piratenschip Varend op Oceaangolven', en='Pirate Ship Sailing on Ocean Waves',
        fr='Bateau Pirate Naviguant sur les Vagues de l\'Océan', es='Barco Pirata Navegando en las Olas del Océano', zh='在海浪中航行的海盗船')),
    dict(cat='voertuigen', diff='hard', desc='busy airport scene with airplanes', landscape=True, titles=dict(
        nl='Drukke Luchthavenscène met Vliegtuigen', en='Busy Airport Scene With Airplanes',
        fr="Scène Animée d'Aéroport Avec des Avions", es='Escena Animada de Aeropuerto con Aviones', zh='繁忙的机场与飞机场景')),
    dict(cat='voertuigen', diff='easy', desc='tractor working in a farm field', landscape=True, titles=dict(
        nl='Tractor Werkend op een Boerderijveld', en='Tractor Working in a Farm Field',
        fr='Tracteur Travaillant dans un Champ de Ferme', es='Tractor Trabajando en un Campo de Granja', zh='在农田里工作的拖拉机')),
    dict(cat='voertuigen', diff='medium', desc='train crossing a bridge over a river', landscape=True, titles=dict(
        nl='Trein die een Brug over een Rivier Oversteekt', en='Train Crossing a Bridge Over a River',
        fr="Train Traversant un Pont Au-dessus d'une Rivière", es='Tren Cruzando un Puente Sobre un Río', zh='穿过河上大桥的火车')),

    # prinsessen — volledige figuur in een setting
    dict(cat='prinsessen', diff='easy', desc='princess dancing in a castle ballroom', landscape=False, titles=dict(
        nl='Prinses Dansend in een Kasteel Balzaal', en='Princess Dancing in a Castle Ballroom',
        fr='Princesse Dansant dans une Salle de Bal du Château', es='Princesa Bailando en el Salón de Baile del Castillo', zh='在城堡舞厅跳舞的公主')),
    dict(cat='prinsessen', diff='medium', desc='princess riding a unicorn through a forest', landscape=True, titles=dict(
        nl='Prinses Rijdend op een Eenhoorn door een Bos', en='Princess Riding a Unicorn Through a Forest',
        fr='Princesse Chevauchant une Licorne à Travers une Forêt', es='Princesa Montando un Unicornio por un Bosque', zh='骑着独角兽穿过森林的公主')),
    dict(cat='prinsessen', diff='hard', desc='princess castle with towers and a garden', landscape=True, titles=dict(
        nl='Prinsessenkasteel met Torens en een Tuin', en='Princess Castle With Towers and a Garden',
        fr='Château de Princesse Avec des Tours et un Jardin', es='Castillo de Princesa con Torres y un Jardín', zh='有塔楼和花园的公主城堡')),
    dict(cat='prinsessen', diff='medium', desc='princess having a tea party with friends', landscape=True, titles=dict(
        nl='Prinses die Theevisite Houdt met Vriendinnen', en='Princess Having a Tea Party With Friends',
        fr='Princesse Prenant le Thé Avec des Amies', es='Princesa Tomando el Té con Amigas', zh='和朋友们喝下午茶的公主')),
    dict(cat='prinsessen', diff='easy', desc='princess walking with her pet swan', landscape=False, titles=dict(
        nl='Prinses Wandelend met haar Huisdier Zwaan', en='Princess Walking With Her Pet Swan',
        fr='Princesse se Promenant Avec son Cygne Apprivoisé', es='Princesa Paseando con su Cisne Mascota', zh='和她的宠物天鹅散步的公主')),

    # seizoenen — volledige buitenscène
    dict(cat='seizoenen', diff='medium', desc='children building a snowman in winter', landscape=True, titles=dict(
        nl='Kinderen die een Sneeuwpop Maken in de Winter', en='Children Building a Snowman in Winter',
        fr="Enfants Construisant un Bonhomme de Neige en Hiver", es='Niños Construyendo un Muñeco de Nieve en Invierno', zh='冬天堆雪人的孩子们')),
    dict(cat='seizoenen', diff='easy', desc='autumn scene with falling leaves and a tree', landscape=False, titles=dict(
        nl='Herfstscène met Vallende Bladeren en een Boom', en='Autumn Scene With Falling Leaves and a Tree',
        fr="Scène d'Automne Avec des Feuilles qui Tombent et un Arbre", es='Escena de Otoño con Hojas Cayendo y un Árbol', zh='落叶和树木的秋日场景')),
    dict(cat='seizoenen', diff='medium', desc='spring garden full of blooming flowers', landscape=True, titles=dict(
        nl='Lentetuin vol Bloeiende Bloemen', en='Spring Garden Full of Blooming Flowers',
        fr="Jardin de Printemps Rempli de Fleurs en Éclosion", es='Jardín de Primavera Lleno de Flores en Flor', zh='开满鲜花的春日花园')),
    dict(cat='seizoenen', diff='easy', desc='kids playing at the beach in summer', landscape=True, titles=dict(
        nl='Kinderen die Spelen op het Strand in de Zomer', en='Kids Playing at the Beach in Summer',
        fr='Enfants Jouant à la Plage en Été', es='Niños Jugando en la Playa en Verano', zh='夏天在海滩上玩耍的孩子们')),
    dict(cat='seizoenen', diff='hard', desc='four seasons tree in one picture', landscape=False, titles=dict(
        nl='Boom in Vier Seizoenen in Één Plaatje', en='Four Seasons Tree in One Picture',
        fr='Arbre des Quatre Saisons en Une Seule Image', es='Árbol de las Cuatro Estaciones en una Sola Imagen', zh='一幅图中的四季之树')),

    # feestdagen — volledige scène
    dict(cat='feestdagen', diff='easy', desc='santa claus delivering presents by sleigh', landscape=True, titles=dict(
        nl='Kerstman die Cadeautjes Bezorgt met de Slee', en='Santa Claus Delivering Presents by Sleigh',
        fr='Père Noël Livrant des Cadeaux en Traîneau', es='Papá Noel Entregando Regalos en Trineo', zh='乘雪橇送礼物的圣诞老人')),
    dict(cat='feestdagen', diff='medium', desc='halloween scene with pumpkins and a bat', landscape=True, titles=dict(
        nl='Halloweenscène met Pompoenen en een Vleermuis', en='Halloween Scene With Pumpkins and a Bat',
        fr="Scène d'Halloween Avec des Citrouilles et une Chauve-souris", es='Escena de Halloween con Calabazas y un Murciélago', zh='南瓜和蝙蝠的万圣节场景')),
    dict(cat='feestdagen', diff='easy', desc='birthday party table with cake and balloons', landscape=True, titles=dict(
        nl='Verjaardagstafel met Taart en Ballonnen', en='Birthday Party Table With Cake and Balloons',
        fr="Table d'Anniversaire Avec Gâteau et Ballons", es='Mesa de Cumpleaños con Pastel y Globos', zh='有蛋糕和气球的生日聚会桌')),
    dict(cat='feestdagen', diff='medium', desc='easter bunny hiding eggs in a garden', landscape=True, titles=dict(
        nl='Paashaas die Eieren Verstopt in een Tuin', en='Easter Bunny Hiding Eggs in a Garden',
        fr='Lapin de Pâques Cachant des Œufs dans un Jardin', es='Conejo de Pascua Escondiendo Huevos en un Jardín', zh='在花园里藏彩蛋的复活节兔子')),
    dict(cat='feestdagen', diff='easy', desc='fireworks celebration at new year', landscape=True, titles=dict(
        nl='Vuurwerkfeest met Oud en Nieuw', en='Fireworks Celebration at New Year',
        fr="Feu d'Artifice pour Célébrer le Nouvel An", es='Celebración de Fuegos Artificiales de Año Nuevo', zh='新年烟花庆典')),

    # eten — kawaii personage met omgeving
    dict(cat='eten', diff='easy', desc='kawaii ice cream cone with a happy face on a beach', landscape=False, titles=dict(
        nl='Kawaii IJshoorntje met een Blij Gezicht op het Strand', en='Kawaii Ice Cream Cone With a Happy Face on a Beach',
        fr='Cornet de Glace Kawaii Avec un Visage Joyeux sur la Plage', es='Cono de Helado Kawaii con Cara Feliz en la Playa', zh='沙滩上带笑脸的卡哇伊冰淇淋筒')),
    dict(cat='eten', diff='medium', desc='fruit basket full of different kawaii fruits', landscape=True, titles=dict(
        nl='Fruitmand vol Verschillende Kawaii Vruchten', en='Fruit Basket Full of Different Kawaii Fruits',
        fr='Panier de Fruits Rempli de Différents Fruits Kawaii', es='Cesta de Frutas Llena de Diferentes Frutas Kawaii', zh='装满各种卡哇伊水果的果篮')),
    dict(cat='eten', diff='easy', desc='kawaii cupcake with sprinkles and a cherry', landscape=False, titles=dict(
        nl='Kawaii Cupcake met Spikkels en een Kers', en='Kawaii Cupcake With Sprinkles and a Cherry',
        fr='Cupcake Kawaii Avec des Vermicelles et une Cerise', es='Cupcake Kawaii con Chispas y una Cereza', zh='带糖粒和樱桃的卡哇伊纸杯蛋糕')),
    dict(cat='eten', diff='medium', desc='picnic scene with sandwiches and juice', landscape=True, titles=dict(
        nl='Picknickscène met Broodjes en Sap', en='Picnic Scene With Sandwiches and Juice',
        fr='Scène de Pique-nique Avec des Sandwichs et du Jus', es='Escena de Picnic con Sándwiches y Jugo', zh='有三明治和果汁的野餐场景')),

    # kawaii — volledig figuur, actie
    dict(cat='kawaii', diff='easy', desc='kawaii bear having a picnic under a tree', landscape=True, titles=dict(
        nl='Kawaii Beer die Picknickt Onder een Boom', en='Kawaii Bear Having a Picnic Under a Tree',
        fr='Ours Kawaii Pique-niquant Sous un Arbre', es='Oso Kawaii de Picnic Bajo un Árbol', zh='在树下野餐的卡哇伊小熊')),
    dict(cat='kawaii', diff='medium', desc='kawaii fox playing in autumn leaves', landscape=False, titles=dict(
        nl='Kawaii Vosje Spelend in Herfstbladeren', en='Kawaii Fox Playing in Autumn Leaves',
        fr="Renard Kawaii Jouant dans les Feuilles d'Automne", es='Zorro Kawaii Jugando en Hojas de Otoño', zh='在秋叶中玩耍的卡哇伊狐狸')),
    dict(cat='kawaii', diff='easy', desc='kawaii penguin sliding on ice', landscape=False, titles=dict(
        nl='Kawaii Pinguïn Glijdend over het IJs', en='Kawaii Penguin Sliding on Ice',
        fr='Pingouin Kawaii Glissant sur la Glace', es='Pingüino Kawaii Deslizándose sobre el Hielo', zh='在冰上滑行的卡哇伊企鹅')),
    dict(cat='kawaii', diff='medium', desc='kawaii dinosaur playing with balloons', landscape=False, titles=dict(
        nl='Kawaii Dinosaurus Spelend met Ballonnen', en='Kawaii Dinosaur Playing With Balloons',
        fr='Dinosaure Kawaii Jouant Avec des Ballons', es='Dinosaurio Kawaii Jugando con Globos', zh='和气球玩耍的卡哇伊恐龙')),

    # natuur — landschap
    dict(cat='natuur', diff='medium', desc='forest scene with tall trees and a stream', landscape=True, titles=dict(
        nl='Bosscène met Hoge Bomen en een Beekje', en='Forest Scene With Tall Trees and a Stream',
        fr='Scène de Forêt Avec de Grands Arbres et un Ruisseau', es='Escena de Bosque con Árboles Altos y un Arroyo', zh='有高大树木和小溪的森林场景')),
    dict(cat='natuur', diff='easy', desc='sunflower field under a smiling sun', landscape=True, titles=dict(
        nl='Zonnebloemenveld onder een Lachende Zon', en='Sunflower Field Under a Smiling Sun',
        fr='Champ de Tournesols Sous un Soleil Souriant', es='Campo de Girasoles Bajo un Sol Sonriente', zh='微笑太阳下的向日葵田')),
    dict(cat='natuur', diff='hard', desc='jungle scene with waterfall and plants', landscape=True, titles=dict(
        nl='Jungle Scène met Waterval en Planten', en='Jungle Scene With Waterfall and Plants',
        fr='Scène de Jungle Avec une Cascade et des Plantes', es='Escena de Selva con Cascada y Plantas', zh='有瀑布和植物的丛林场景')),
    dict(cat='natuur', diff='medium', desc='butterfly garden with many flowers', landscape=False, titles=dict(
        nl='Vlindertuin met Veel Bloemen', en='Butterfly Garden With Many Flowers',
        fr='Jardin de Papillons Avec Beaucoup de Fleurs', es='Jardín de Mariposas con Muchas Flores', zh='有很多花朵的蝴蝶花园')),

    # sprookjes — volledige scène
    dict(cat='sprookjes', diff='medium', desc='dragon guarding a treasure in a cave', landscape=True, titles=dict(
        nl='Draak die een Schat Bewaakt in een Grot', en='Dragon Guarding a Treasure in a Cave',
        fr='Dragon Gardant un Trésor dans une Grotte', es='Dragón Custodiando un Tesoro en una Cueva', zh='在洞穴里守护宝藏的龙')),
    dict(cat='sprookjes', diff='hard', desc='enchanted forest with fairies and mushrooms', landscape=True, titles=dict(
        nl='Betoverd Bos met Feeën en Paddenstoelen', en='Enchanted Forest With Fairies and Mushrooms',
        fr='Forêt Enchantée Avec des Fées et des Champignons', es='Bosque Encantado con Hadas y Setas', zh='有仙女和蘑菇的魔法森林')),
    dict(cat='sprookjes', diff='medium', desc='knight riding a horse to a castle', landscape=True, titles=dict(
        nl='Ridder Rijdend op een Paard naar een Kasteel', en='Knight Riding a Horse to a Castle',
        fr='Chevalier Chevauchant Vers un Château', es='Caballero Cabalgando Hacia un Castillo', zh='骑马前往城堡的骑士')),
    dict(cat='sprookjes', diff='easy', desc='friendly wizard casting a magic spell', landscape=False, titles=dict(
        nl='Vriendelijke Tovenaar die een Toverspreuk Uitspreekt', en='Friendly Wizard Casting a Magic Spell',
        fr='Magicien Sympathique Lançant un Sort Magique', es='Mago Amistoso Lanzando un Hechizo Mágico', zh='施展魔法咒语的友好巫师')),

    # ruimte — volledige scène
    dict(cat='ruimte', diff='medium', desc='astronaut floating among planets and stars', landscape=False, titles=dict(
        nl='Astronaut Zwevend Tussen Planeten en Sterren', en='Astronaut Floating Among Planets and Stars',
        fr='Astronaute Flottant Parmi les Planètes et les Étoiles', es='Astronauta Flotando Entre Planetas y Estrellas', zh='漂浮在行星和星星之间的宇航员')),
    dict(cat='ruimte', diff='easy', desc='friendly alien waving next to a UFO', landscape=False, titles=dict(
        nl='Vriendelijke Alien Zwaaiend naast een UFO', en='Friendly Alien Waving Next to a UFO',
        fr="Extraterrestre Sympathique Saluant à Côté d'un OVNI", es='Extraterrestre Amistoso Saludando Junto a un OVNI', zh='在飞碟旁招手的友好外星人')),
    dict(cat='ruimte', diff='hard', desc='solar system with all planets and the sun', landscape=True, titles=dict(
        nl='Zonnestelsel met Alle Planeten en de Zon', en='Solar System With All Planets and the Sun',
        fr='Système Solaire Avec Toutes les Planètes et le Soleil', es='Sistema Solar con Todos los Planetas y el Sol', zh='包含所有行星和太阳的太阳系')),

    # oceaan — volledige scène
    dict(cat='oceaan', diff='medium', desc='dolphin family jumping over ocean waves', landscape=True, titles=dict(
        nl='Dolfijnenfamilie Springend over Oceaangolven', en='Dolphin Family Jumping Over Ocean Waves',
        fr='Famille de Dauphins Sautant par-dessus les Vagues', es='Familia de Delfines Saltando sobre las Olas del Océano', zh='跃过海浪的海豚一家')),
    dict(cat='oceaan', diff='easy', desc='happy octopus playing with a beach ball', landscape=False, titles=dict(
        nl='Blije Octopus Spelend met een Strandbal', en='Happy Octopus Playing With a Beach Ball',
        fr='Poulpe Joyeux Jouant Avec un Ballon de Plage', es='Pulpo Feliz Jugando con una Pelota de Playa', zh='和沙滩球玩耍的快乐章鱼')),
    dict(cat='oceaan', diff='hard', desc='coral reef scene with fish and a turtle', landscape=True, titles=dict(
        nl='Koraalrifscène met Vissen en een Schildpad', en='Coral Reef Scene With Fish and a Turtle',
        fr='Scène de Récif Corallien Avec des Poissons et une Tortue', es='Escena de Arrecife de Coral con Peces y una Tortuga', zh='有鱼和海龟的珊瑚礁场景')),
    dict(cat='oceaan', diff='medium', desc='mermaid sitting on a rock by the sea', landscape=False, titles=dict(
        nl='Zeemeermin Zittend op een Rots bij de Zee', en='Mermaid Sitting on a Rock by the Sea',
        fr='Sirène Assise sur un Rocher au Bord de la Mer', es='Sirena Sentada en una Roca junto al Mar', zh='坐在海边岩石上的美人鱼')),

    # letters — decoratief, portret
    dict(cat='letters', diff='medium', desc='letter A decorated with apples and ants', landscape=False, titles=dict(
        nl='Letter A Versierd met Appels en Mieren', en='Letter A Decorated With Apples and Ants',
        fr='Lettre A Décorée de Pommes et de Fourmis', es='Letra A Decorada con Manzanas y Hormigas', zh='用苹果和蚂蚁装饰的字母A')),
    dict(cat='letters', diff='medium', desc='letter B decorated with butterflies', landscape=False, titles=dict(
        nl='Letter B Versierd met Vlinders', en='Letter B Decorated With Butterflies',
        fr='Lettre B Décorée de Papillons', es='Letra B Decorada con Mariposas', zh='用蝴蝶装饰的字母B')),
    dict(cat='letters', diff='medium', desc='letter S decorated with stars and a sun', landscape=False, titles=dict(
        nl='Letter S Versierd met Sterren en een Zon', en='Letter S Decorated With Stars and a Sun',
        fr="Lettre S Décorée d'Étoiles et d'un Soleil", es='Letra S Decorada con Estrellas y un Sol', zh='用星星和太阳装饰的字母S')),

    # mandala — altijd portret, symmetrisch
    dict(cat='mandala', diff='hard', desc='animal themed mandala with birds', landscape=False, titles=dict(
        nl='Dieren Mandala met Vogels', en='Animal Themed Mandala With Birds',
        fr='Mandala à Thème Animal Avec des Oiseaux', es='Mandala Temático de Animales con Pájaros', zh='以动物为主题的鸟类曼陀罗')),
    dict(cat='mandala', diff='medium', desc='simple flower mandala for beginners', landscape=False, titles=dict(
        nl='Eenvoudige Bloemenmandala voor Beginners', en='Simple Flower Mandala for Beginners',
        fr='Mandala Floral Simple pour Débutants', es='Mandala Floral Sencillo para Principiantes', zh='适合初学者的简单花卉曼陀罗')),
    dict(cat='mandala', diff='hard', desc='ocean themed mandala with shells and waves', landscape=False, titles=dict(
        nl='Oceaan Mandala met Schelpen en Golven', en='Ocean Themed Mandala With Shells and Waves',
        fr='Mandala à Thème Océan Avec des Coquillages et des Vagues', es='Mandala Temático del Océano con Conchas y Olas', zh='以海洋为主题的贝壳与波浪曼陀罗')),

    # gezichten — hier is een close-up wél de bedoeling
    dict(cat='gezichten', diff='easy', desc='happy boy face with a big smile', landscape=False, titles=dict(
        nl='Vrolijk Jongensgezicht met een Grote Glimlach', en='Happy Boy Face With a Big Smile',
        fr='Visage de Garçon Joyeux avec un Grand Sourire', es='Cara de Niño Feliz con una Gran Sonrisa', zh='带着灿烂笑容的男孩笑脸')),
    dict(cat='gezichten', diff='easy', desc='cute puppy face with floppy ears', landscape=False, titles=dict(
        nl='Schattig Puppygezicht met Hangoren', en='Cute Puppy Face With Floppy Ears',
        fr='Visage de Chiot Mignon avec des Oreilles Tombantes', es='Cara de Cachorro Tierno con Orejas Caídas', zh='长着垂耳的可爱小狗脸')),
    dict(cat='gezichten', diff='medium', desc='lion face with a fluffy mane', landscape=False, titles=dict(
        nl='Leeuwengezicht met een Pluizige Manen', en='Lion Face With a Fluffy Mane',
        fr='Visage de Lion avec une Crinière Pelucheuse', es='Cara de León con una Melena Esponjosa', zh='有蓬松鬃毛的狮子脸')),
    dict(cat='gezichten', diff='easy', desc='smiling sun face with rays', landscape=False, titles=dict(
        nl='Lachend Zonnegezicht met Stralen', en='Smiling Sun Face With Rays',
        fr='Visage de Soleil Souriant avec des Rayons', es='Cara de Sol Sonriente con Rayos', zh='带着光芒的微笑太阳脸')),

    # ── Populaire onderwerpen (dinosaurussen, eenhoorns, zeemeerminnen,
    #    wildlife, ruimte) — evergreen top-thema's voor kinderkleurplaten,
    #    geen character-IP (Paw Patrol e.d. zijn auteursrechtelijk beschermd)
    dict(cat='dieren', diff='medium', desc='trex dinosaur roaring in a prehistoric jungle', landscape=True, titles=dict(
        nl='T-Rex Dinosaurus Brullend in een Oerwoud', en='T-Rex Dinosaur Roaring in a Prehistoric Jungle',
        fr='Dinosaure T-Rex Rugissant dans une Jungle Préhistorique', es='Dinosaurio T-Rex Rugiendo en una Selva Prehistórica', zh='在史前丛林中咆哮的霸王龙')),
    dict(cat='dieren', diff='medium', desc='triceratops dinosaur grazing near volcanoes', landscape=True, titles=dict(
        nl='Triceratops Dinosaurus Grazend bij Vulkanen', en='Triceratops Dinosaur Grazing Near Volcanoes',
        fr='Dinosaure Tricératops Broutant près de Volcans', es='Dinosaurio Triceratops Pastando cerca de Volcanes', zh='在火山附近吃草的三角龙')),
    dict(cat='dieren', diff='easy', desc='cute baby dinosaur hatching from an egg', landscape=False, titles=dict(
        nl='Schattige Baby Dinosaurus die uit een Ei Kruipt', en='Cute Baby Dinosaur Hatching From an Egg',
        fr="Mignon Bébé Dinosaure Sortant d'un Œuf", es='Lindo Bebé Dinosaurio Saliendo de un Huevo', zh='从蛋里孵化的可爱恐龙宝宝')),
    dict(cat='dieren', diff='hard', desc='safari animals gathered at a watering hole', landscape=True, titles=dict(
        nl='Safaridieren Verzameld bij een Waterplas', en='Safari Animals Gathered at a Watering Hole',
        fr="Animaux du Safari Rassemblés autour d'un Point d'Eau", es='Animales de Safari Reunidos en un Abrevadero', zh='聚集在水坑边的野生动物')),
    dict(cat='dieren', diff='easy', desc='baby unicorn playing in a flower meadow', landscape=False, titles=dict(
        nl='Baby Eenhoorn Spelend in een Bloemenweide', en='Baby Unicorn Playing in a Flower Meadow',
        fr='Bébé Licorne Jouant dans une Prairie Fleurie', es='Bebé Unicornio Jugando en un Prado Florido', zh='在花草地上玩耍的小独角兽')),

    dict(cat='kawaii', diff='easy', desc='kawaii mermaid swimming with fish', landscape=False, titles=dict(
        nl='Kawaii Zeemeermin Zwemmend met Visjes', en='Kawaii Mermaid Swimming With Fish',
        fr='Sirène Kawaii Nageant avec des Poissons', es='Sirena Kawaii Nadando con Peces', zh='和小鱼一起游泳的卡哇伊美人鱼')),
    dict(cat='kawaii', diff='easy', desc='kawaii baby dragon breathing tiny sparkles', landscape=False, titles=dict(
        nl='Kawaii Babydraakje dat Kleine Sterretjes Blaast', en='Kawaii Baby Dragon Breathing Tiny Sparkles',
        fr='Bébé Dragon Kawaii Soufflant de Petites Étincelles', es='Bebé Dragón Kawaii Soplando Pequeñas Chispas', zh='喷出小星光的卡哇伊小龙')),
    dict(cat='kawaii', diff='easy', desc='kawaii sloth hanging from a branch', landscape=False, titles=dict(
        nl='Kawaii Luiaard Hangend aan een Tak', en='Kawaii Sloth Hanging From a Branch',
        fr='Paresseux Kawaii Suspendu à une Branche', es='Perezoso Kawaii Colgado de una Rama', zh='挂在树枝上的卡哇伊树懒')),

    dict(cat='oceaan', diff='medium', desc='mermaid princess in an underwater palace', landscape=True, titles=dict(
        nl='Zeemeerminprinses in een Onderwaterpaleis', en='Mermaid Princess in an Underwater Palace',
        fr='Princesse Sirène dans un Palais Sous-marin', es='Princesa Sirena en un Palacio Submarino', zh='在海底宫殿里的美人鱼公主')),
    dict(cat='oceaan', diff='medium', desc='whale swimming with her calf in the ocean', landscape=True, titles=dict(
        nl='Walvis Zwemmend met haar Kalfje in de Oceaan', en='Whale Swimming With Her Calf in the Ocean',
        fr="Baleine Nageant avec son Petit dans l'Océan", es='Ballena Nadando con su Cría en el Océano', zh='在海洋中与幼鲸一起游泳的鲸鱼')),

    dict(cat='sprookjes', diff='medium', desc='friendly dragon flying over mountains', landscape=True, titles=dict(
        nl='Vriendelijke Draak Vliegend over Bergen', en='Friendly Dragon Flying Over Mountains',
        fr='Dragon Amical Volant au-dessus des Montagnes', es='Dragón Amigable Volando sobre las Montañas', zh='飞越群山的友好巨龙')),

    dict(cat='natuur', diff='medium', desc='wildlife scene with deer and rabbits in a forest', landscape=True, titles=dict(
        nl='Wildlifescène met Herten en Konijnen in een Bos', en='Wildlife Scene With Deer and Rabbits in a Forest',
        fr='Scène de Faune avec des Cerfs et des Lapins dans une Forêt', es='Escena de Fauna con Ciervos y Conejos en un Bosque', zh='森林中有鹿和兔子的野生动物场景')),
    dict(cat='natuur', diff='hard', desc='tropical rainforest scene with toucan and monkey', landscape=True, titles=dict(
        nl='Tropisch Regenwoud met Toekan en Aap', en='Tropical Rainforest Scene With Toucan and Monkey',
        fr='Scène de Forêt Tropicale avec un Toucan et un Singe', es='Escena de Selva Tropical con Tucán y Mono', zh='有巨嘴鸟和猴子的热带雨林场景')),

    dict(cat='ruimte', diff='easy', desc='astronaut planting a flag on the moon', landscape=False, titles=dict(
        nl='Astronaut die een Vlag Plant op de Maan', en='Astronaut Planting a Flag on the Moon',
        fr='Astronaute Plantant un Drapeau sur la Lune', es='Astronauta Plantando una Bandera en la Luna', zh='在月球上插旗的宇航员')),
    dict(cat='ruimte', diff='medium', desc="rocket flying past saturn's rings", landscape=False, titles=dict(
        nl='Raket die langs de Ringen van Saturnus Vliegt', en="Rocket Flying Past Saturn's Rings",
        fr="Fusée Volant devant les Anneaux de Saturne", es='Cohete Volando junto a los Anillos de Saturno', zh='飞过土星光环的火箭')),

    dict(cat='mandala', diff='medium', desc='dinosaur themed mandala', landscape=False, titles=dict(
        nl='Dinosaurus Mandala', en='Dinosaur Themed Mandala',
        fr='Mandala à Thème Dinosaure', es='Mandala Temático de Dinosaurios', zh='恐龙主题曼陀罗')),
    dict(cat='mandala', diff='hard', desc='unicorn themed mandala', landscape=False, titles=dict(
        nl='Eenhoorn Mandala', en='Unicorn Themed Mandala',
        fr='Mandala à Thème Licorne', es='Mandala Temático de Unicornios', zh='独角兽主题曼陀罗')),

    dict(cat='voertuigen', diff='medium', desc='monster truck jumping over cars', landscape=True, titles=dict(
        nl="Monstertruck die over Auto's Springt", en='Monster Truck Jumping Over Cars',
        fr='Monster Truck Sautant par-dessus des Voitures', es='Camión Monstruo Saltando sobre Coches', zh='跳跃越过汽车的怪兽卡车')),
    dict(cat='voertuigen', diff='easy', desc='dump truck working at a construction site', landscape=True, titles=dict(
        nl='Kiepwagen Werkend op een Bouwplaats', en='Dump Truck Working at a Construction Site',
        fr='Camion-benne Travaillant sur un Chantier', es='Camión Volquete Trabajando en una Obra', zh='在建筑工地工作的自卸卡车')),

    dict(cat='feestdagen', diff='easy', desc='dinosaur wearing a halloween costume', landscape=False, titles=dict(
        nl='Dinosaurus in een Halloweenkostuum', en='Dinosaur Wearing a Halloween Costume',
        fr="Dinosaure en Costume d'Halloween", es='Dinosaurio con Disfraz de Halloween', zh='穿着万圣节服装的恐龙')),

    # ── Klassieke sprookjes & verhalen (public domain, generieke stijl —
    #    geen Disney-achtige tekenstijl, alleen het rechtenvrije verhaal/
    #    personage zelf). Veiliger dan recent-PD-geworden merken zoals
    #    Winnie de Poeh: sprookjes hebben geen enkele merkhouder.
    dict(cat='sprookjes', diff='medium', desc='alice falling down the rabbit hole into wonderland', landscape=False, titles=dict(
        nl='Alice Valt door het Konijnenhol naar Wonderland', en='Alice Falling Down the Rabbit Hole Into Wonderland',
        fr='Alice Tombant dans le Terrier du Lapin vers le Pays des Merveilles', es='Alicia Cayendo por la Madriguera del Conejo al País de las Maravillas', zh='爱丽丝掉进兔子洞进入仙境')),
    dict(cat='sprookjes', diff='medium', desc='alice having a tea party with the mad hatter', landscape=True, titles=dict(
        nl='Alice Thee Drinkend met de Dolle Hoedenmaker', en='Alice Having a Tea Party With the Mad Hatter',
        fr='Alice Prenant le Thé avec le Chapelier Fou', es='Alicia Tomando el Té con el Sombrerero Loco', zh='爱丽丝和疯帽子喝茶')),
    dict(cat='sprookjes', diff='easy', desc='cheshire cat grinning in a tree', landscape=False, titles=dict(
        nl='Cheshire Kat Grijnzend in een Boom', en='Cheshire Cat Grinning in a Tree',
        fr='Chat du Cheshire Souriant dans un Arbre', es='Gato de Cheshire Sonriendo en un Árbol', zh='在树上咧嘴笑的柴郡猫')),
    dict(cat='sprookjes', diff='medium', desc='peter pan flying over london rooftops', landscape=True, titles=dict(
        nl='Peter Pan Vliegend over de Daken van Londen', en='Peter Pan Flying Over London Rooftops',
        fr='Peter Pan Volant au-dessus des Toits de Londres', es='Peter Pan Volando sobre los Tejados de Londres', zh='彼得潘飞越伦敦屋顶')),
    dict(cat='kawaii', diff='easy', desc='tiny forest fairy sitting on a mushroom', landscape=False, titles=dict(
        nl='Klein Boself Zittend op een Paddenstoel', en='Tiny Forest Fairy Sitting on a Mushroom',
        fr='Petite Fée des Bois Assise sur un Champignon', es='Pequeña Hada del Bosque Sentada en una Seta', zh='坐在蘑菇上的小森林精灵')),
    dict(cat='sprookjes', diff='medium', desc='girl walking the yellow brick road with a scarecrow', landscape=True, titles=dict(
        nl='Meisje dat over de Gele Bakstenen Weg Loopt met een Vogelverschrikker', en='Girl Walking the Yellow Brick Road With a Scarecrow',
        fr='Fille Marchant sur le Chemin de Briques Jaunes avec un Épouvantail', es='Niña Caminando por el Camino de Baldosas Amarillas con un Espantapájaros', zh='女孩和稻草人走在黄砖路上')),
    dict(cat='sprookjes', diff='medium', desc='tin man scarecrow and lion walking together', landscape=True, titles=dict(
        nl='Blikken Man, Vogelverschrikker en Leeuw Lopend Samen', en='Tin Man, Scarecrow and Lion Walking Together',
        fr='Homme de Fer-blanc, Épouvantail et Lion Marchant Ensemble', es='Hombre de Hojalata, Espantapájaros y León Caminando Juntos', zh='铁皮人、稻草人和狮子一起走')),
    dict(cat='sprookjes', diff='easy', desc='wooden puppet boy walking to school', landscape=False, titles=dict(
        nl='Houten Poppenjongen op weg naar School', en='Wooden Puppet Boy Walking to School',
        fr="Garçon Marionnette en Bois Allant à l'École", es='Niño Marioneta de Madera Caminando a la Escuela', zh='木偶男孩走去上学')),
    dict(cat='prinsessen', diff='easy', desc='princess trying on a glass slipper', landscape=False, titles=dict(
        nl='Prinses die een Glazen Muiltje Past', en='Princess Trying on a Glass Slipper',
        fr='Princesse Essayant une Pantoufle de Verre', es='Princesa Probándose una Zapatilla de Cristal', zh='公主试穿水晶鞋')),
    dict(cat='prinsessen', diff='easy', desc='princess sleeping in a castle tower', landscape=False, titles=dict(
        nl='Prinses die Slaapt in een Kasteeltoren', en='Princess Sleeping in a Castle Tower',
        fr='Princesse Dormant dans une Tour de Château', es='Princesa Durmiendo en una Torre del Castillo', zh='在城堡塔楼里沉睡的公主')),
    dict(cat='prinsessen', diff='medium', desc='princess letting down her long hair from a tower', landscape=True, titles=dict(
        nl='Prinses die haar Lange Haar laat Zakken uit een Toren', en='Princess Letting Down Her Long Hair From a Tower',
        fr='Princesse Laissant Tomber ses Longs Cheveux depuis une Tour', es='Princesa Dejando Caer su Largo Cabello desde una Torre', zh='从塔楼垂下长发的公主')),
    dict(cat='sprookjes', diff='easy', desc='little girl in a red hooded cape walking through the forest', landscape=False, titles=dict(
        nl='Meisje met Rode Cape Lopend door het Bos', en='Little Girl in a Red Hooded Cape Walking Through the Forest',
        fr='Petite Fille en Cape Rouge Marchant dans la Forêt', es='Niña con Capa Roja Caminando por el Bosque', zh='穿红色斗篷的小女孩走过森林')),
    dict(cat='dieren', diff='easy', desc='clever cat wearing boots and a hat', landscape=False, titles=dict(
        nl='Slimme Kat met Laarzen en een Hoed', en='Clever Cat Wearing Boots and a Hat',
        fr='Chat Malin Portant des Bottes et un Chapeau', es='Gato Astuto con Botas y Sombrero', zh='穿靴子戴帽子的聪明猫')),
    dict(cat='dieren', diff='medium', desc='three little pigs building houses', landscape=True, titles=dict(
        nl='Drie Kleine Biggetjes die Huizen Bouwen', en='Three Little Pigs Building Houses',
        fr='Les Trois Petits Cochons Construisant des Maisons', es='Los Tres Cerditos Construyendo Casas', zh='三只小猪盖房子')),
    dict(cat='dieren', diff='medium', desc='girl having porridge with three bears', landscape=True, titles=dict(
        nl='Meisje dat Pap Eet met Drie Beren', en='Girl Having Porridge With Three Bears',
        fr='Fille Mangeant de la Bouillie avec Trois Ours', es='Niña Comiendo Papilla con Tres Osos', zh='和三只熊一起吃粥的女孩')),
    dict(cat='sprookjes', diff='medium', desc='boy climbing a giant beanstalk to the clouds', landscape=True, titles=dict(
        nl='Jongen die een Reuzenbonenstaak Beklimt naar de Wolken', en='Boy Climbing a Giant Beanstalk to the Clouds',
        fr='Garçon Grimpant à une Tige de Haricot Géante vers les Nuages', es='Niño Trepando por una Planta de Habichuelas Gigante hacia las Nubes', zh='男孩爬上通往云端的巨大豆茎')),
    dict(cat='sprookjes', diff='medium', desc='brother and sister finding a candy house in the forest', landscape=True, titles=dict(
        nl='Broer en Zus die een Snoephuisje Vinden in het Bos', en='Brother and Sister Finding a Candy House in the Forest',
        fr='Frère et Sœur Découvrant une Maison en Bonbons dans la Forêt', es='Hermano y Hermana Encontrando una Casa de Dulces en el Bosque', zh='兄妹在森林里发现糖果屋')),
    dict(cat='sprookjes', diff='medium', desc='archer shooting an arrow in a green forest', landscape=True, titles=dict(
        nl='Boogschutter die een Pijl Afschiet in een Groen Bos', en='Archer Shooting an Arrow in a Green Forest',
        fr='Archer Tirant une Flèche dans une Forêt Verte', es='Arquero Disparando una Flecha en un Bosque Verde', zh='在绿色森林中射箭的弓箭手')),
    dict(cat='dieren', diff='easy', desc='ugly duckling swimming with swans', landscape=False, titles=dict(
        nl='Lelijk Jong Eendje Zwemmend met Zwanen', en='Ugly Duckling Swimming With Swans',
        fr='Vilain Petit Canard Nageant avec des Cygnes', es='Patito Feo Nadando con Cisnes', zh='和天鹅一起游泳的丑小鸭')),
    dict(cat='feestdagen', diff='medium', desc='nutcracker soldier standing guard at christmas', landscape=False, titles=dict(
        nl='Notenkraker Soldaat die de Wacht Houdt met Kerst', en='Nutcracker Soldier Standing Guard at Christmas',
        fr='Soldat Casse-Noisette Montant la Garde à Noël', es='Soldado Cascanueces Haciendo Guardia en Navidad', zh='圣诞节站岗的胡桃夹子士兵')),

    # ── Festival & beroepen (incl. bouwmarkt/DIY-thema)
    dict(cat='feestdagen', diff='medium', desc='kids at a fair with a ferris wheel and carousel', landscape=True, titles=dict(
        nl='Kinderen op de Kermis met een Reuzenrad en Draaimolen', en='Kids at a Fair with a Ferris Wheel and Carousel',
        fr='Enfants à la Fête Foraine avec une Grande Roue et un Carrousel', es='Niños en la Feria con una Noria y un Carrusel', zh='在游乐场玩摩天轮和旋转木马的孩子们')),
    dict(cat='feestdagen', diff='medium', desc='festival scene with balloons a stage and food stalls', landscape=True, titles=dict(
        nl='Festivalscène met Ballonnen, een Podium en Kraampjes', en='Festival Scene With Balloons, a Stage and Food Stalls',
        fr='Scène de Festival avec des Ballons, une Scène et des Stands', es='Escena de Festival con Globos, un Escenario y Puestos de Comida', zh='有气球、舞台和小吃摊的节日场景')),
    dict(cat='beroepen', diff='easy', desc='handyman with a toolbox fixing a shelf', landscape=False, titles=dict(
        nl='Klusjesman met Gereedschapskist die een Plank Repareert', en='Handyman With a Toolbox Fixing a Shelf',
        fr='Bricoleur avec une Boîte à Outils Réparant une Étagère', es='Manitas con una Caja de Herramientas Arreglando un Estante', zh='拿着工具箱修理架子的维修工')),
    dict(cat='beroepen', diff='easy', desc='friendly builder wearing a hard hat with a hammer', landscape=False, titles=dict(
        nl='Vriendelijke Bouwvakker met Bouwhelm en Hamer', en='Friendly Builder Wearing a Hard Hat With a Hammer',
        fr='Ouvrier du Bâtiment Sympathique avec un Casque et un Marteau', es='Constructor Amigable con Casco y un Martillo', zh='戴着安全帽拿着锤子的友好建筑工人')),
    dict(cat='beroepen', diff='medium', desc='diy workshop scene with tools hanging on a wall', landscape=True, titles=dict(
        nl='Doe-het-zelf Werkplaats met Gereedschap aan de Muur', en='DIY Workshop Scene With Tools Hanging on a Wall',
        fr='Atelier de Bricolage avec des Outils Accrochés au Mur', es='Taller de Bricolaje con Herramientas Colgadas en la Pared', zh='墙上挂满工具的DIY工作间')),
    dict(cat='beroepen', diff='medium', desc='little boy helping dad paint a fence', landscape=True, titles=dict(
        nl='Kleine Jongen die Papa Helpt een Hek te Verven', en='Little Boy Helping Dad Paint a Fence',
        fr='Petit Garçon Aidant Papa à Peindre une Clôture', es='Niño Pequeño Ayudando a Papá a Pintar una Cerca', zh='帮爸爸刷栅栏的小男孩')),
    dict(cat='beroepen', diff='easy', desc='firefighter standing next to a fire truck', landscape=False, titles=dict(
        nl='Brandweerman Staand naast een Brandweerwagen', en='Firefighter Standing Next to a Fire Truck',
        fr="Pompier Debout à Côté d'un Camion de Pompiers", es='Bombero de Pie junto a un Camión de Bomberos', zh='站在消防车旁的消防员')),
    dict(cat='beroepen', diff='easy', desc='doctor with a stethoscope examining a teddy bear', landscape=False, titles=dict(
        nl='Dokter met Stethoscoop die een Teddybeer Onderzoekt', en='Doctor With a Stethoscope Examining a Teddy Bear',
        fr='Médecin avec un Stéthoscope Examinant un Ours en Peluche', es='Doctor con un Estetoscopio Examinando un Osito de Peluche', zh='拿着听诊器检查泰迪熊的医生')),
    dict(cat='beroepen', diff='easy', desc='baker holding a fresh loaf of bread wearing a chef hat', landscape=False, titles=dict(
        nl='Bakker met Kokshoed die een Vers Brood Vasthoudt', en='Baker Holding a Fresh Loaf of Bread Wearing a Chef Hat',
        fr='Boulanger avec une Toque Tenant un Pain Frais', es='Panadero con Gorro de Chef Sosteniendo un Pan Fresco', zh='戴着厨师帽拿着新鲜面包的面包师')),
    dict(cat='beroepen', diff='easy', desc='veterinarian gently examining a puppy', landscape=False, titles=dict(
        nl='Dierenarts die Voorzichtig een Puppy Onderzoekt', en='Veterinarian Gently Examining a Puppy',
        fr='Vétérinaire Examinant Doucement un Chiot', es='Veterinario Examinando Suavemente a un Cachorro', zh='温柔地检查小狗的兽医')),

    # ── Wereldwijde diversiteit & Chinese feestdagen
    dict(cat='feestdagen', diff='medium', desc='chinese children performing a dragon dance for lunar new year', landscape=True, titles=dict(
        nl='Chinese Kinderen die een Drakendans Opvoeren voor Chinees Nieuwjaar', en='Chinese Children Performing a Dragon Dance for Lunar New Year',
        fr="Enfants Chinois Exécutant une Danse du Dragon pour le Nouvel An Chinois", es='Niños Chinos Realizando una Danza del Dragón para el Año Nuevo Chino', zh='中国孩子们表演春节舞龙')),
    dict(cat='feestdagen', diff='easy', desc='chinese family celebrating mid autumn festival with lanterns and mooncakes', landscape=False, titles=dict(
        nl='Chinees Gezin dat het Maanfeest Viert met Lampionnen en Maancakes', en='Chinese Family Celebrating Mid-Autumn Festival With Lanterns and Mooncakes',
        fr='Famille Chinoise Célébrant la Fête de la Mi-Automne avec des Lanternes et des Gâteaux de Lune', es='Familia China Celebrando el Festival del Medio Otoño con Faroles y Pasteles de Luna', zh='中国家庭提着灯笼吃月饼庆祝中秋节')),
    dict(cat='prinsessen', diff='easy', desc='black african princess wearing a colorful traditional dress and beaded jewelry', landscape=False, titles=dict(
        nl='Afrikaanse Prinses in Kleurrijke Traditionele Jurk met Kralensieraden', en='Black African Princess Wearing a Colorful Traditional Dress and Beaded Jewelry',
        fr='Princesse Africaine en Robe Traditionnelle Colorée avec des Bijoux à Perles', es='Princesa Africana con Vestido Tradicional Colorido y Joyas de Cuentas', zh='穿着色彩鲜艳传统服饰和珠饰的非洲公主')),
    dict(cat='prinsessen', diff='easy', desc='asian princess in an elegant silk dress with a hand fan', landscape=False, titles=dict(
        nl='Aziatische Prinses in Elegante Zijden Jurk met een Waaier', en='Asian Princess in an Elegant Silk Dress With a Hand Fan',
        fr='Princesse Asiatique en Élégante Robe de Soie avec un Éventail', es='Princesa Asiática con Elegante Vestido de Seda y un Abanico', zh='穿着优雅丝绸裙拿着扇子的亚洲公主')),
    dict(cat='beroepen', diff='easy', desc="black doctor listening to a childs heartbeat with a stethoscope", landscape=False, titles=dict(
        nl='Dokter die met een Stethoscoop naar het Hartje van een Kind Luistert', en="Doctor Listening to a Child's Heartbeat With a Stethoscope",
        fr="Médecin Écoutant le Cœur d'un Enfant avec un Stéthoscope", es='Doctor Escuchando el Corazón de un Niño con un Estetoscopio', zh='用听诊器听孩子心跳的医生')),
    dict(cat='beroepen', diff='easy', desc='latina teacher reading a book to a group of children', landscape=True, titles=dict(
        nl='Juf die een Boek Voorleest aan een Groep Kinderen', en='Teacher Reading a Book to a Group of Children',
        fr="Enseignante Lisant un Livre à un Groupe d'Enfants", es='Maestra Leyendo un Libro a un Grupo de Niños', zh='给一群孩子读书的老师')),
    dict(cat='gezichten', diff='easy', desc='happy asian boy face with a big smile', landscape=False, titles=dict(
        nl='Blij Jongensgezicht met een Brede Glimlach', en='Cheerful Boy Face With a Big Smile',
        fr='Visage de Garçon Souriant avec un Large Sourire', es='Cara de Niño Sonriente con una Amplia Sonrisa', zh='露出灿烂笑容的开心男孩脸')),
    dict(cat='gezichten', diff='easy', desc='happy indian girl face with braided hair and a flower', landscape=False, titles=dict(
        nl='Vrolijk Meisjesgezicht met Gevlochten Haar en een Bloem', en='Happy Girl Face With Braided Hair and a Flower',
        fr='Visage de Fille Joyeuse avec des Cheveux Tressés et une Fleur', es='Cara de Niña Feliz con Cabello Trenzado y una Flor', zh='扎着辫子戴着花的快乐女孩笑脸')),
    dict(cat='natuur', diff='medium', desc='australian outback scene with kangaroos koalas and gum trees', landscape=True, titles=dict(
        nl="Australisch Outback Landschap met Kangoeroes, Koala's en Eucalyptusbomen", en='Australian Outback Scene With Kangaroos, Koalas and Gum Trees',
        fr="Scène de l'Outback Australien avec des Kangourous, des Koalas et des Eucalyptus", es='Escena del Outback Australiano con Canguros, Koalas y Eucaliptos', zh='有袋鼠、考拉和桉树的澳大利亚内陆场景')),
    dict(cat='natuur', diff='medium', desc='nordic winter scene with a child watching the northern lights', landscape=True, titles=dict(
        nl='Noords Winterlandschap met een Kind dat naar het Noorderlicht Kijkt', en='Nordic Winter Scene With a Child Watching the Northern Lights',
        fr="Scène d'Hiver Nordique avec un Enfant Regardant les Aurores Boréales", es='Escena de Invierno Nórdico con un Niño Mirando la Aurora Boreal', zh='孩子观赏北极光的北欧冬季场景')),

    # ── Meer wereldwijde levensstijlen (Caribisch eilandleven, Alpenleven)
    dict(cat='natuur', diff='medium', desc='caribbean island beach with palm trees and colorful houses', landscape=True, titles=dict(
        nl='Caribisch Eilandstrand met Palmbomen en Kleurrijke Huisjes', en='Caribbean Island Beach With Palm Trees and Colorful Houses',
        fr="Plage d'une Île des Caraïbes avec des Palmiers et des Maisons Colorées", es='Playa de una Isla Caribeña con Palmeras y Casas Coloridas', zh='有棕榈树和彩色房屋的加勒比海岛海滩')),
    dict(cat='natuur', diff='easy', desc='family relaxing in hammocks on a tropical island', landscape=True, titles=dict(
        nl='Gezin dat Ontspant in Hangmatten op een Tropisch Eiland', en='Family Relaxing in Hammocks on a Tropical Island',
        fr='Famille se Détendant dans des Hamacs sur une Île Tropicale', es='Familia Relajándose en Hamacas en una Isla Tropical', zh='在热带岛屿吊床上放松的一家人')),
    dict(cat='natuur', diff='medium', desc='austrian alpine village with snowy mountains and wooden chalets', landscape=True, titles=dict(
        nl='Oostenrijks Alpendorp met Besneeuwde Bergen en Houten Chalets', en='Austrian Alpine Village With Snowy Mountains and Wooden Chalets',
        fr='Village Alpin Autrichien avec des Montagnes Enneigées et des Chalets en Bois', es='Pueblo Alpino Austriaco con Montañas Nevadas y Cabañas de Madera', zh='有雪山和木屋的奥地利阿尔卑斯村庄')),
    dict(cat='seizoenen', diff='easy', desc='child skiing down a mountain slope in the alps', landscape=True, titles=dict(
        nl='Kind dat een Berghelling Afskiet in de Alpen', en='Child Skiing Down a Mountain Slope in the Alps',
        fr='Enfant Skiant sur une Pente de Montagne dans les Alpes', es='Niño Esquiando por una Pendiente de Montaña en los Alpes', zh='在阿尔卑斯山滑雪下坡的孩子')),

    # ── Actueel: NL-zomervakantie, AU-winter, back-to-school, onderbouw, CN/NL
    dict(cat='seizoenen', diff='easy', desc='family camping trip with a tent and campfire in summer', landscape=True, titles=dict(
        nl='Gezin op Kampeervakantie met een Tent en Kampvuur in de Zomer', en='Family Camping Trip With a Tent and Campfire in Summer',
        fr='Famille en Voyage de Camping avec une Tente et un Feu de Camp en Été', es='Familia de Camping con una Tienda y una Fogata en Verano', zh='夏天带着帐篷和篝火去露营的一家人')),
    dict(cat='seizoenen', diff='easy', desc='kids cooling off playing in a park water fountain on a hot summer day', landscape=False, titles=dict(
        nl='Kinderen die Afkoelen bij een Waterfontein in het Park op een Warme Zomerdag', en='Kids Cooling Off Playing in a Park Water Fountain on a Hot Summer Day',
        fr="Enfants se Rafraîchissant dans une Fontaine du Parc par une Chaude Journée d'Été", es='Niños Refrescándose en una Fuente del Parque en un Caluroso Día de Verano', zh='在炎热的夏日里在公园喷泉中玩耍降温的孩子们')),
    dict(cat='voertuigen', diff='easy', desc='ice cream truck with children buying ice cream in summer', landscape=False, titles=dict(
        nl='IJscowagen met Kinderen die IJsjes Kopen in de Zomer', en='Ice Cream Truck With Children Buying Ice Cream in Summer',
        fr='Camion de Glaces avec des Enfants Achetant des Glaces en Été', es='Camión de Helados con Niños Comprando Helado en Verano', zh='夏天孩子们在冰淇淋车前买冰淇淋')),
    dict(cat='seizoenen', diff='easy', desc='kids swimming and splashing in an outdoor pool', landscape=True, titles=dict(
        nl='Kinderen die Zwemmen en Spetteren in een Buitenzwembad', en='Kids Swimming and Splashing in an Outdoor Pool',
        fr='Enfants Nageant et Éclaboussant dans une Piscine Extérieure', es='Niños Nadando y Salpicando en una Piscina al Aire Libre', zh='在户外泳池里游泳戏水的孩子们')),
    dict(cat='dieren', diff='easy', desc='koala wrapped in a warm scarf on a cool winter day', landscape=False, titles=dict(
        nl='Koala Gewikkeld in een Warme Sjaal op een Koude Winterdag', en='Koala Wrapped in a Warm Scarf on a Cool Winter Day',
        fr='Koala Enveloppé dans une Écharpe Chaude par une Fraîche Journée d\'Hiver', es='Koala Envuelto en una Bufanda Cálida en un Fresco Día de Invierno', zh='在寒冷冬日里裹着暖围巾的考拉')),
    dict(cat='seizoenen', diff='medium', desc='cozy campfire evening with marshmallows under a starry winter sky', landscape=True, titles=dict(
        nl='Gezellige Kampvuuravond met Marshmallows onder een Sterrenhemel in de Winter', en='Cozy Campfire Evening With Marshmallows Under a Starry Winter Sky',
        fr='Soirée Feu de Camp Douillette avec des Chamallows sous un Ciel Étoilé d\'Hiver', es='Noche Acogedora de Fogata con Malvaviscos bajo un Cielo Estrellado de Invierno', zh='在冬夜繁星下围着篝火烤棉花糖的温馨夜晚')),
    dict(cat='seizoenen', diff='easy', desc='child packing a school backpack with books and a pencil case for the first day of school', landscape=False, titles=dict(
        nl='Kind dat een Schooltas Inpakt met Boeken en een Etui voor de Eerste Schooldag', en='Child Packing a School Backpack With Books and a Pencil Case for the First Day of School',
        fr='Enfant Préparant son Cartable avec des Livres et une Trousse pour la Rentrée', es='Niño Preparando su Mochila Escolar con Libros y un Estuche para el Primer Día de Clases', zh='为开学第一天准备书包、书本和铅笔盒的孩子')),
    dict(cat='voertuigen', diff='easy', desc='yellow school bus picking up children on the first day of school', landscape=True, titles=dict(
        nl='Gele Schoolbus die Kinderen Ophaalt op de Eerste Schooldag', en='Yellow School Bus Picking Up Children on the First Day of School',
        fr='Bus Scolaire Jaune Récupérant des Enfants pour la Rentrée', es='Autobús Escolar Amarillo Recogiendo Niños el Primer Día de Clases', zh='开学第一天接孩子们的黄色校车')),
    dict(cat='dieren', diff='easy', desc='five little ducks lined up in a row', landscape=False, titles=dict(
        nl='Vijf Kleine Eendjes Netjes op een Rijtje', en='Five Little Ducks Lined Up in a Row',
        fr='Cinq Petits Canards Alignés en Rang', es='Cinco Patitos Pequeños en Fila', zh='排成一排的五只小鸭子')),
    dict(cat='sprookjes', diff='medium', desc='magpies forming a bridge across a starry night sky for two lovers', landscape=True, titles=dict(
        nl='Eksters die een Brug Vormen over een Sterrenhemel voor Twee Geliefden', en='Magpies Forming a Bridge Across a Starry Night Sky for Two Lovers',
        fr='Pies Formant un Pont dans un Ciel Étoilé pour Deux Amoureux', es='Urracas Formando un Puente en un Cielo Estrellado para Dos Enamorados', zh='喜鹊在星空中搭起鹊桥')),
    dict(cat='eten', diff='easy', desc='chinese child eating a popsicle on a hot summer day', landscape=False, titles=dict(
        nl='Chinees Kind dat een Ijslolly Eet op een Warme Zomerdag', en='Chinese Child Eating a Popsicle on a Hot Summer Day',
        fr="Enfant Chinois Mangeant une Glace à l'Eau par une Chaude Journée d'Été", es='Niño Chino Comiendo una Paleta Helada en un Caluroso Día de Verano', zh='炎热夏日里吃冰棍的中国孩子')),
    dict(cat='seizoenen', diff='medium', desc='dutch kids cycling past a canal with flower baskets on their bikes in summer', landscape=True, titles=dict(
        nl='Nederlandse Kinderen die langs een Gracht Fietsen met Bloemenmandjes op de Fiets in de Zomer', en='Dutch Kids Cycling Past a Canal With Flower Baskets on Their Bikes in Summer',
        fr="Enfants Néerlandais Faisant du Vélo le Long d'un Canal avec des Paniers de Fleurs en Été", es='Niños Holandeses en Bicicleta junto a un Canal con Cestas de Flores en Verano', zh='夏天骑着装有花篮的自行车沿运河骑行的荷兰孩子们')),

    # ── Chibi-stijl (populair nu)
    dict(cat='dieren', diff='easy', desc='chibi baby fox curled up sleeping', landscape=False, style='chibi', titles=dict(
        nl='Chibi Babyvosje Opgekruld in Slaap', en='Chibi Baby Fox Curled Up Sleeping',
        fr='Bébé Renard Chibi Endormi en Boule', es='Bebé Zorro Chibi Dormido Acurrucado', zh='蜷缩着睡觉的Q版小狐狸')),
    dict(cat='dieren', diff='easy', desc='chibi bunny hopping with a carrot', landscape=False, style='chibi', titles=dict(
        nl='Chibi Konijntje dat Huppelt met een Wortel', en='Chibi Bunny Hopping With a Carrot',
        fr='Lapin Chibi Sautillant avec une Carotte', es='Conejito Chibi Saltando con una Zanahoria', zh='抱着胡萝卜蹦跳的Q版兔子')),
    dict(cat='kawaii', diff='easy', desc='chibi panda hugging a bamboo stalk', landscape=False, style='chibi', titles=dict(
        nl='Chibi Panda die een Bamboestengel Knuffelt', en='Chibi Panda Hugging a Bamboo Stalk',
        fr='Panda Chibi Enlaçant une Tige de Bambou', es='Panda Chibi Abrazando un Tallo de Bambú', zh='抱着竹子的Q版熊猫')),
    dict(cat='kawaii', diff='easy', desc='chibi dragon breathing tiny hearts', landscape=False, style='chibi', titles=dict(
        nl='Chibi Draakje dat Kleine Hartjes Blaast', en='Chibi Dragon Breathing Tiny Hearts',
        fr='Petit Dragon Chibi Soufflant de Petits Cœurs', es='Dragón Chibi Soplando Pequeños Corazones', zh='吐出小爱心的Q版小龙')),
    dict(cat='prinsessen', diff='easy', desc='chibi princess holding a wand with a crown', landscape=False, style='chibi', titles=dict(
        nl='Chibi Prinses met Kroon die een Toverstokje Vasthoudt', en='Chibi Princess Holding a Wand With a Crown',
        fr='Princesse Chibi avec Couronne Tenant une Baguette', es='Princesa Chibi con Corona Sosteniendo una Varita', zh='戴着皇冠拿着魔杖的Q版公主')),
    dict(cat='prinsessen', diff='easy', desc='chibi mermaid sitting on a shell', landscape=False, style='chibi', titles=dict(
        nl='Chibi Zeemeermin Zittend op een Schelp', en='Chibi Mermaid Sitting on a Shell',
        fr='Sirène Chibi Assise sur un Coquillage', es='Sirena Chibi Sentada en una Concha', zh='坐在贝壳上的Q版美人鱼')),
    dict(cat='gezichten', diff='easy', desc='chibi girl face with big sparkly eyes and twin buns', landscape=False, style='chibi', titles=dict(
        nl='Chibi Meisjesgezicht met Grote Glinsterende Ogen en Twee Knotjes', en='Chibi Girl Face With Big Sparkly Eyes and Twin Buns',
        fr='Visage de Fille Chibi avec de Grands Yeux Pétillants et Deux Chignons', es='Cara de Niña Chibi con Grandes Ojos Brillantes y Dos Moños', zh='有大大闪亮眼睛和双丸子头的Q版女孩脸')),
    dict(cat='gezichten', diff='easy', desc='chibi boy face wearing round glasses', landscape=False, style='chibi', titles=dict(
        nl='Chibi Jongensgezicht met Ronde Bril', en='Chibi Boy Face Wearing Round Glasses',
        fr='Visage de Garçon Chibi avec des Lunettes Rondes', es='Cara de Niño Chibi con Gafas Redondas', zh='戴着圆眼镜的Q版男孩脸')),
    dict(cat='beroepen', diff='easy', desc='chibi astronaut floating with a star', landscape=False, style='chibi', titles=dict(
        nl='Chibi Astronaut Zwevend met een Ster', en='Chibi Astronaut Floating With a Star',
        fr='Astronaute Chibi Flottant avec une Étoile', es='Astronauta Chibi Flotando con una Estrella', zh='拿着星星漂浮的Q版宇航员')),
    dict(cat='eten', diff='easy', desc='chibi strawberry cake slice with a cute face', landscape=False, style='chibi', titles=dict(
        nl='Chibi Aardbeientaartpuntje met een Schattig Gezichtje', en='Chibi Strawberry Cake Slice With a Cute Face',
        fr='Part de Gâteau aux Fraises Chibi avec un Visage Mignon', es='Rebanada de Pastel de Fresa Chibi con una Cara Tierna', zh='有可爱表情的Q版草莓蛋糕')),

    # ── Cozy volledige-scène thuis/dagelijks leven (woonkamer, tuin,
    #    slaapkamer, school, supermarkt) — drukke gedetailleerde scènes,
    #    geen geïsoleerd personage. Let op gevarieerde poses/gezichten
    #    i.p.v. iedereen hetzelfde front-facing kloongezicht.
    dict(cat='kawaii', diff='medium', desc='family movie night on the couch in the living room with blankets snacks and a cat', landscape=True, style='cozy', titles=dict(
        nl='Filmavond met het Gezin op de Bank in de Woonkamer met Dekens, Snacks en een Kat', en='Family Movie Night on the Couch in the Living Room With Blankets, Snacks and a Cat',
        fr='Soirée Cinéma en Famille sur le Canapé au Salon avec Couvertures, Snacks et un Chat', es='Noche de Película en Familia en el Sofá de la Sala con Mantas, Snacks y un Gato', zh='一家人在客厅沙发上盖着毯子、吃着零食、和猫咪一起看电影之夜')),
    dict(cat='kawaii', diff='medium', desc='children playing in a garden with a sandbox swing and a dog', landscape=True, style='cozy', titles=dict(
        nl='Kinderen die Spelen in een Tuin met een Zandbak, Schommel en een Hond', en='Children Playing in a Garden With a Sandbox, Swing and a Dog',
        fr='Enfants Jouant dans un Jardin avec un Bac à Sable, une Balançoire et un Chien', es='Niños Jugando en un Jardín con un Arenero, un Columpio y un Perro', zh='在花园里玩沙坑、秋千和小狗的孩子们')),
    dict(cat='kawaii', diff='medium', desc='child reading in bed surrounded by stuffed animals and fairy lights in a cozy bedroom', landscape=True, style='cozy', titles=dict(
        nl='Kind dat Leest in Bed Omringd door Knuffels en Lichtjesslingers in een Gezellige Slaapkamer', en='Child Reading in Bed Surrounded by Stuffed Animals and Fairy Lights in a Cozy Bedroom',
        fr='Enfant Lisant au Lit Entouré de Peluches et de Guirlandes Lumineuses dans une Chambre Douillette', es='Niño Leyendo en la Cama Rodeado de Peluches y Luces de Hadas en un Dormitorio Acogedor', zh='在温馨卧室里被毛绒玩具和彩灯环绕着看书的孩子')),
    dict(cat='kawaii', diff='medium', desc='classroom scene with children at their desks and a teacher by a blank chalkboard', landscape=True, style='cozy', titles=dict(
        nl='Klaslokaalscène met Kinderen achter hun Bureau en een Juf bij een Leeg Schoolbord', en='Classroom Scene With Children at Their Desks and a Teacher by a Blank Chalkboard',
        fr="Scène de Classe avec des Enfants à leur Bureau et une Institutrice près d'un Tableau Vide", es='Escena de Aula con Niños en sus Pupitres y una Maestra junto a una Pizarra en Blanco', zh='孩子们坐在课桌前、老师站在空白黑板旁的教室场景')),
    dict(cat='kawaii', diff='medium', desc='family pushing a shopping cart through the supermarket aisles', landscape=True, style='cozy', titles=dict(
        nl='Gezin dat een Winkelwagen Duwt door de Gangpaden van de Supermarkt', en='Family Pushing a Shopping Cart Through the Supermarket Aisles',
        fr='Famille Poussant un Chariot dans les Rayons du Supermarché', es='Familia Empujando un Carrito de Compras por los Pasillos del Supermercado', zh='一家人推着购物车逛超市货架')),
    dict(cat='kawaii', diff='medium', desc='family baking cookies together in a cozy kitchen', landscape=True, style='cozy', titles=dict(
        nl='Gezin dat Samen Koekjes Bakt in een Gezellige Keuken', en='Family Baking Cookies Together in a Cozy Kitchen',
        fr='Famille Préparant des Biscuits Ensemble dans une Cuisine Chaleureuse', es='Familia Horneando Galletas Juntos en una Cocina Acogedora', zh='一家人在温馨的厨房里一起烤饼干')),
    dict(cat='kawaii', diff='easy', desc='child playing with bath toys and bubbles at bath time in the bathroom', landscape=False, style='cozy', titles=dict(
        nl='Kind dat Speelt met Badspeeltjes en Bubbels tijdens Badtijd in de Badkamer', en='Child Playing With Bath Toys and Bubbles at Bath Time in the Bathroom',
        fr="Enfant Jouant avec des Jouets de Bain et des Bulles à l'Heure du Bain dans la Salle de Bain", es='Niño Jugando con Juguetes de Baño y Burbujas a la Hora del Baño en el Cuarto de Baño', zh='在浴室洗澡时间玩洗澡玩具和泡泡的孩子')),
    dict(cat='kawaii', diff='medium', desc='family having a backyard picnic with a blanket basket and balloons', landscape=True, style='cozy', titles=dict(
        nl='Gezin dat Picknickt in de Achtertuin met een Deken, Mand en Ballonnen', en='Family Having a Backyard Picnic With a Blanket, Basket and Balloons',
        fr='Famille Pique-niquant dans le Jardin avec une Couverture, un Panier et des Ballons', es='Familia de Picnic en el Patio Trasero con una Manta, una Cesta y Globos', zh='一家人在后院野餐，铺着毯子、带着篮子和气球')),
    dict(cat='kawaii', diff='medium', desc='child building a blanket pillow fort in the bedroom with fairy lights', landscape=True, style='cozy', titles=dict(
        nl='Kind dat een Kussenfort Bouwt met Dekens in de Slaapkamer met Lichtjesslingers', en='Child Building a Blanket Pillow Fort in the Bedroom With Fairy Lights',
        fr='Enfant Construisant une Cabane en Couvertures et Coussins dans la Chambre avec des Guirlandes Lumineuses', es='Niño Construyendo un Fuerte de Almohadas y Mantas en el Dormitorio con Luces de Hadas', zh='在卧室里用毯子枕头搭建堡垒并挂着彩灯的孩子')),
    dict(cat='kawaii', diff='medium', desc='birthday party in the living room with balloons presents and a cake', landscape=True, style='cozy', titles=dict(
        nl='Verjaardagsfeestje in de Woonkamer met Ballonnen, Cadeautjes en een Taart', en='Birthday Party in the Living Room With Balloons, Presents and a Cake',
        fr="Fête d'Anniversaire au Salon avec des Ballons, des Cadeaux et un Gâteau", es='Fiesta de Cumpleaños en la Sala con Globos, Regalos y un Pastel', zh='在客厅举办的生日派对，有气球、礼物和蛋糕')),

    # ── In het Nieuws (actualiteiten) — wekelijkse selectie van echt,
    #    actueel, kindvriendelijk nieuws per regio. Geen herkenbare echte
    #    personen/merken/logo's, geen politiek of verdrietig nieuws.
    dict(cat='actualiteiten', diff='hard', desc='two children gently guiding baby sea turtles across the sand toward the ocean at night under a full moon, using small red-light flashlights instead of white light so the turtles are not disturbed', landscape=True, style='cozy', titles=dict(
        nl='Kinderen die Baby Zeeschildpadjes Helpen naar de Zee te Kruipen', en='Children Helping Baby Sea Turtles Crawl to the Ocean',
        fr="Des Enfants Aidant des Bébés Tortues de Mer à Rejoindre l'Océan", es='Niños Ayudando a Bebés Tortugas Marinas a Llegar al Océano', zh='孩子们帮助小海龟爬向大海',
        country='nl', newsExplainer=dict(
            nl="Wist je dat er 356 soorten schildpadden op aarde zijn? Sommige zeeschildpadden worden bedreigd, dus vrijwilligers helpen de kleine baby's 's nachts veilig van het strand naar de zee te komen. Het Klokhuis liet deze week nog zien hoe belangrijk het is om voor schildpadden te zorgen!",
            en="Did you know there are 356 species of turtles on Earth? Some sea turtles are endangered, so volunteers help the tiny hatchlings safely crawl from the beach to the ocean at night. A Dutch kids' science show recently featured just how important it is to look after turtles!",
            fr="Savais-tu qu'il existe 356 espèces de tortues sur Terre ? Certaines tortues de mer sont menacées, alors des bénévoles aident les bébés tortues à ramper en toute sécurité de la plage jusqu'à l'océan pendant la nuit. Une émission scientifique néerlandaise pour enfants a récemment montré combien il est important de prendre soin des tortues !",
            es="¿Sabías que existen 356 especies de tortugas en el mundo? Algunas tortugas marinas están en peligro, así que los voluntarios ayudan a las crías a llegar sanas y salvas desde la playa hasta el mar por la noche. ¡Un programa infantil de ciencia neerlandés mostró hace poco lo importante que es cuidar a las tortugas!",
            zh="你知道地球上有356种乌龟吗？有些海龟濒临灭绝，所以志愿者们会在夜间帮助刚孵化的小海龟安全地从沙滩爬向大海。荷兰一档少儿科普节目最近介绍了保护海龟有多么重要！"))),
    dict(cat='actualiteiten', diff='hard', desc='astronauts splashing down in the ocean inside a realistic space capsule with parachutes after a space station mission, a small recovery boat nearby with ordinary sailors in life jackets waiting to help, no other rockets or spacecraft in the sky', landscape=True, style='standard', titles=dict(
        nl='Astronauten die Terugkeren naar de Aarde met een Ruimtecapsule aan Parachutes boven de Oceaan', en='Astronauts Returning to Earth in a Space Capsule With Parachutes Over the Ocean',
        fr="Des Astronautes de Retour sur Terre en Capsule Spatiale avec des Parachutes au-Dessus de l'Océan", es='Astronautas Regresando a la Tierra en una Cápsula Espacial con Paracaídas sobre el Océano', zh='宇航员乘坐带降落伞的太空舱返回地球，降落在海洋上空',
        country='en', newsExplainer=dict(
            nl='Op 26 juli keerden een NASA-astronaut en twee Russische kosmonauten terug naar de Aarde na 241 dagen op het internationale ruimtestation ISS! Hun ruimtecapsule landde met parachutes zachtjes in de oceaan, waar een team klaarstond om ze op te halen.',
            en='On July 26, a NASA astronaut and two Russian cosmonauts returned to Earth after spending 241 days aboard the International Space Station! Their capsule floated gently down into the ocean on parachutes, where a recovery team was waiting to bring them home.',
            fr="Le 26 juillet, un astronaute de la NASA et deux cosmonautes russes sont revenus sur Terre après avoir passé 241 jours à bord de la Station spatiale internationale ! Leur capsule est descendue en douceur dans l'océan grâce à des parachutes, où une équipe de récupération les attendait.",
            es='El 26 de julio, un astronauta de la NASA y dos cosmonautas rusos regresaron a la Tierra tras pasar 241 días a bordo de la Estación Espacial Internacional. Su cápsula descendió suavemente hacia el océano con paracaídas, donde un equipo de rescate los esperaba.',
            zh='7月26日，一名NASA宇航员和两名俄罗斯宇航员在国际空间站度过241天后返回地球！他们乘坐的太空舱借助降落伞轻轻降落在海洋上，救援团队早已等候在那里迎接他们。'))),
    dict(cat='actualiteiten', diff='hard', desc='swimmers racing in the lanes of a big swimming pool at a european championship, a modest-sized crowd of spectators seated in stadium stands cheering, a few plain blank flags along the poolside with no icons or patterns on them', landscape=True, style='cozy', titles=dict(
        nl='Kinderen die Juichen bij een Europees Zwemkampioenschap in een Groot Zwembad met Vlaggetjes', en='Children Cheering at a European Swimming Championship in a Big Pool With Flags',
        fr="Des Enfants Encourageant lors d'un Championnat d'Europe de Natation dans une Grande Piscine avec des Drapeaux", es='Niños Animando en un Campeonato Europeo de Natación en una Gran Piscina con Banderas', zh='孩子们在挂满旗帜的大泳池边为欧洲游泳锦标赛欢呼',
        country='fr', newsExplainer=dict(
            nl='Eind juli beginnen de Europese Zwemkampioenschappen in Parijs! Zwemmers uit heel Europa komen samen om te strijden in het zwembad, terwijl supporters met vlaggetjes langs de kant juichen.',
            en='The European Swimming Championships kick off in Paris at the end of July! Swimmers from all across Europe come together to race in the pool, while fans cheer them on from the stands with flags.',
            fr="Les Championnats d'Europe de natation débutent à Paris fin juillet ! Des nageurs venus de toute l'Europe se retrouvent pour s'affronter dans le bassin, pendant que les supporters les encouragent avec des drapeaux.",
            es='¡Los Campeonatos Europeos de Natación comienzan en París a finales de julio! Nadadores de toda Europa se reúnen para competir en la piscina, mientras los aficionados los animan con banderas.',
            zh='欧洲游泳锦标赛将于7月底在巴黎拉开帷幕！来自欧洲各地的游泳运动员齐聚泳池一较高下，观众们挥舞着旗帜为他们加油助威。'))),
    dict(cat='actualiteiten', diff='hard', desc='a mixed group of male and female soccer players celebrating winning a world championship trophy together with confetti falling around them in a stadium', landscape=True, style='cozy', titles=dict(
        nl='Voetballers die een Wereldkampioenschap Vieren met een Beker, Confetti en de Spaanse Vlag', en='Soccer Players Celebrating a World Championship With a Trophy, Confetti and the Spanish Flag',
        fr="Des Joueurs de Football Célébrant un Championnat du Monde avec un Trophée, des Confettis et le Drapeau Espagnol", es='Futbolistas Celebrando un Campeonato Mundial con un Trofeo, Confeti y la Bandera de España', zh='足球运动员举着奖杯、伴着彩带和西班牙国旗庆祝世界冠军',
        country='es', newsExplainer=dict(
            nl='Spanje won onlangs een grote wereldkampioenschap voetbal! Overal in het land werd gevierd met vlaggen, confetti en een grote gouden beker.',
            en='Spain recently won a big soccer World Championship! Fans across the country celebrated with flags, confetti and a giant golden trophy.',
            fr="L'Espagne a récemment remporté un grand championnat du monde de football ! Dans tout le pays, on a fêté ça avec des drapeaux, des confettis et un immense trophée doré.",
            es='¡España ganó hace poco un gran Campeonato Mundial de fútbol! En todo el país se celebró con banderas, confeti y un enorme trofeo dorado.',
            zh='西班牙最近夺得了盛大的足球世界冠军！举国上下挥舞旗帜、抛洒彩带，庆祝这枚金光闪闪的大奖杯。'))),
    dict(cat='actualiteiten', diff='hard', desc='a large realistic car-carrier cargo ship with a tall boxy hull and rows of small vent openings sailing on the open ocean, a grid of many flat rectangular solar panels covering the flat top deck, no cars visible outside the ship', landscape=True, style='standard', titles=dict(
        nl="Een Enorm Vrachtschip vol Zonnepanelen dat Auto's over de Oceaan Vervoert", en='A Giant Cargo Ship Covered in Solar Panels Carrying Cars Across the Ocean',
        fr="Un Immense Cargo Recouvert de Panneaux Solaires Transportant des Voitures sur l'Océan", es='Un Enorme Buque de Carga Cubierto de Paneles Solares Transportando Coches por el Océano', zh='一艘布满太阳能板的巨型货船正运载汽车穿越海洋',
        country='cn', newsExplainer=dict(
            nl='Er vaart een gloednieuw vrachtschip rond dat helemaal bedekt is met zonnepanelen! Het schip gebruikt zonlicht om stroom op te wekken terwijl het auto\'s over de oceaan vervoert — een slimme, schone manier om spullen de wereld rond te brengen.',
            en='A brand-new cargo ship covered in solar panels is now sailing the seas! It uses sunlight to generate power while carrying cars across the ocean — a smart, clean way to move goods around the world.',
            fr='Un tout nouveau cargo recouvert de panneaux solaires navigue désormais sur les mers ! Il utilise la lumière du soleil pour produire de l\'énergie tout en transportant des voitures à travers l\'océan — une façon intelligente et propre de déplacer des marchandises dans le monde.',
            es='¡Un flamante buque de carga cubierto de paneles solares ya navega por los mares! Usa la luz del sol para generar energía mientras transporta coches por el océano, una forma inteligente y limpia de mover mercancías por el mundo.',
            zh='一艘全新的太阳能货船已经启航！它利用阳光发电，同时运载汽车穿越海洋——这是一种既聪明又环保的运输方式。'))),
]


def _load_key():
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            if line.startswith('MAGNIFIC_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    key = os.environ.get('MAGNIFIC_API_KEY', '')
    if key:
        return key
    print('ERROR: Geen API key gevonden. Zet MAGNIFIC_API_KEY in .env')
    sys.exit(1)


# Kiesbare kunststijlen bovenop de standaard lijntekenstijl.
STYLE_HINTS = {
    'standard': (
        'Traditional hand-drawn children\'s picture-book illustration style. '
        'Not a glossy 3D render, not airbrushed digital art, not a generic AI-image look — '
        'think classic printed coloring book art.'
    ),
    'chibi': (
        'Chibi style: super-deformed cute proportions, oversized head, small simplified body, '
        'big sparkling eyes, minimal simple details. Traditional hand-drawn coloring book line art, '
        'not a glossy 3D render or generic AI look.'
    ),
    'cozy': (
        'Cozy family-illustration style: a full, busy, richly detailed everyday-life scene with '
        'multiple characters and lots of surrounding environmental objects and furniture, not an '
        'isolated character floating on empty white space. Soft rounded simplified character '
        'proportions (normal body proportions, not oversized heads), big expressive eyes, simple '
        'clean linework, warm homely mood. Crucially, vary each character\'s pose, head angle, '
        'expression and hairstyle — do NOT repeat the same face or the same forward-facing pose for '
        'every character, that looks unsettling; show people from different angles, interacting with '
        'each other or their surroundings, some in profile or three-quarter view, natural and candid. '
        'Traditional hand-drawn coloring book line art, not a glossy 3D render or generic AI look.'
    ),
}


def _build_prompt(description, category, difficulty, style='standard'):
    framing = (
        'Show the full character or the full scene composition, not just an isolated head or face close-up.'
        if category not in HEAD_OK_CATS else
        'Close-up portrait framing is fine here.'
    )
    text_rule = (
        'The letter itself may appear as the main decorative shape.'
        if category == 'letters' else
        'Do not include any text, letters, words, banners, signs or writing anywhere in the image — '
        'AI-generated text is often misspelled or garbled, so avoid it entirely here.'
        if category == 'actualiteiten' else
        'Small incidental text is allowed if it naturally belongs in the scene (a book cover, a small '
        'sign, a label on a jar), but never a large prominent title, caption or word dominating the image.'
    )
    diversity = _diversity_hint(description, category)
    style_hint = STYLE_HINTS.get(style, STYLE_HINTS['standard'])
    return (
        f'black and white coloring page for children: {description}. '
        f'{CAT_HINTS.get(category, "")}. {framing} '
        f'{DIFF_HINTS.get(difficulty, DIFF_HINTS["easy"])}. '
        'Style: clean bold outlines only, pure white background, absolutely no shading, '
        'no color fills, no gradients, simple line art ready to color with crayons. '
        'High contrast black lines on white paper. Printable coloring book style. '
        'The illustration must fill the entire page edge to edge, full-bleed, with no empty white '
        'margin around the artwork. A simple thin single-line border directly at the page edge is '
        'fine, but never a thick black frame, bold rectangular border, or an ornate decorative '
        f'frame/vignette with patterns that eats into the page. {text_rule}{diversity} {style_hint}'
    )


def _slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9 ]+', '', text)
    return re.sub(r'\s+', '-', text).strip('-')


def _filename_for(category, difficulty, description):
    slug = _slugify(description)
    if len(slug) > 120:
        slug = slug[:120].rsplit('-', 1)[0]
    return f'{category}--{difficulty}--{slug}.jpg'


def _headers(key):
    return {'x-magnific-api-key': key, 'Content-Type': 'application/json'}


def _generate(key, prompt, landscape):
    payload = {
        'prompt': prompt,
        'resolution': '2k',
        'aspect_ratio': 'classic_4_3' if landscape else 'traditional_3_4',
        'model': 'fluid',
        'creative_detailing': 20,
        'filter_nsfw': True,
    }
    r = requests.post(f'{API_BASE}/ai/mystic', json=payload,
                      headers=_headers(key), timeout=30)
    r.raise_for_status()
    return r.json()['data']['task_id']


def _poll(key, task_id, max_wait=300):
    start = time.time()
    while time.time() - start < max_wait:
        r = requests.get(f'{API_BASE}/ai/mystic/{task_id}',
                         headers={'x-magnific-api-key': key}, timeout=30)
        r.raise_for_status()
        data = r.json()['data']
        status = data.get('status', '')
        print(f'  Status: {status}   ', end='\r', flush=True)
        if status == 'COMPLETED':
            print()
            return data['generated'][0]
        if status == 'FAILED':
            raise RuntimeError(f'Generatie mislukt: {data}')
        time.sleep(6)
    raise TimeoutError('Timeout na 5 minuten')


def _save(url, out_path, landscape):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert('RGB')

    # Magnific-beelden hebben vaak een dun (1-2px) donker randlijntje op de
    # rechter- en/of onderrand (generatie-artefact). Wegsnijden voordat we
    # verder verwerken, anders komt het lijntje mee in de eindafbeelding.
    EDGE_TRIM = 5
    img = img.crop((0, 0, img.width - EDGE_TRIM, img.height - EDGE_TRIM))

    target_w, target_h = A4_LANDSCAPE if landscape else A4_PORTRAIT

    # "Contain"-fit: schaal zonder vervorming, vul de rest met wit
    # (voorkomt uitgerekte lijntekeningen bij afwijkende AI-ratio's).
    src_ratio = img.width / img.height
    dst_ratio = target_w / target_h
    if src_ratio > dst_ratio:
        new_w = target_w
        new_h = round(target_w / src_ratio)
    else:
        new_h = target_h
        new_w = round(target_h * src_ratio)
    resized = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new('RGB', (target_w, target_h), 'white')
    canvas.paste(resized, ((target_w - new_w) // 2, (target_h - new_h) // 2))
    canvas.save(out_path, 'JPEG', quality=92, dpi=(150, 150))


def _save_title_override(filename, titles):
    """Schrijft de handgeschreven vertalingen weg naar .titles.json,
    zodat add-colorings.js deze titels 1-op-1 overneemt in plaats van
    het woord-voor-woord DICT te gebruiken."""
    data = {}
    if TITLES_FILE.exists():
        try:
            data = json.loads(TITLES_FILE.read_text())
        except json.JSONDecodeError:
            data = {}
    data[filename] = titles
    TITLES_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def generate_one(category, difficulty, description, key, landscape=False, titles=None, style='standard'):
    filename = _filename_for(category, difficulty, description)
    out_path = IMG_DIR / filename

    if out_path.exists():
        print(f'  Bestaat al, overgeslagen: {filename}')
        return False

    prompt = _build_prompt(description, category, difficulty, style)
    orientation = 'liggend' if landscape else 'portret'

    print(f'\n--- {filename} ({orientation}) ---')
    print(f'  Prompt: {prompt[:90]}...')

    print('  [1/3] Genereren via Magnific...')
    task_id = _generate(key, prompt, landscape)

    print(f'  [2/3] Wachten op resultaat (task {task_id[:8]}...)...')
    img_url = _poll(key, task_id)

    dims = 'A4 liggend (1754×1240)' if landscape else 'A4 portret (1240×1754)'
    print(f'  [3/3] Opslaan als {dims}...')
    _save(img_url, out_path, landscape)
    print(f'  Opgeslagen: {filename}')

    if titles:
        _save_title_override(filename, titles)

    return True


def pick_topics(n):
    """Kies de eerstvolgende n onderwerpen uit TOPIC_POOL die nog geen
    bestand hebben, zodat elke dag nieuwe onderwerpen aan bod komen."""
    chosen = []
    for topic in TOPIC_POOL:
        filename = _filename_for(topic['cat'], topic['diff'], topic['desc'])
        if (IMG_DIR / filename).exists():
            continue
        chosen.append(topic)
        if len(chosen) >= n:
            break
    return chosen


def run_add_colorings():
    print('\n  add-colorings.js uitvoeren (watermark + data.js + sitemap)...')
    result = subprocess.run(
        ['node', str(ROOT / 'add-colorings.js')],
        capture_output=True, text=True, cwd=ROOT
    )
    print(result.stdout)
    if result.returncode != 0 and result.stderr:
        print('WAARSCHUWING:', result.stderr[:300])


def git_push(message):
    """Commit + push alle wijzigingen op de huidige branch."""
    subprocess.run(['git', 'add', '-A'], cwd=ROOT, check=True)
    diff = subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=ROOT)
    if diff.returncode == 0:
        print('\n  Geen wijzigingen om te pushen.')
        return
    subprocess.run(['git', 'commit', '-m', message], cwd=ROOT, check=True)
    branch = subprocess.run(
        ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
        cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.strip()
    result = subprocess.run(
        ['git', 'push', '-u', 'origin', branch],
        cwd=ROOT, capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f'  Gepusht naar {branch}.')
    else:
        print(f'  WAARSCHUWING: git push mislukt:\n{result.stderr[:500]}')


def main():
    args  = [a for a in sys.argv[1:] if not a.startswith('-')]
    flags = [a for a in sys.argv[1:] if a.startswith('-')]

    key = _load_key()
    do_push = '--no-push' not in flags
    style = 'standard'
    for f in flags:
        if f.startswith('--style='):
            style = f.split('=', 1)[1]
    if style not in STYLE_HINTS:
        print(f'Ongeldige stijl: {style}. Kies uit: {", ".join(STYLE_HINTS)}')
        sys.exit(1)

    if '--batch' in flags:
        n = 5
        for a in args:
            if a.isdigit():
                n = int(a)
        topics = pick_topics(n)
        if not topics:
            print('Rotatiepool is uitgeput — alle onderwerpen zijn al gegenereerd.')
            print('Voeg nieuwe onderwerpen toe aan TOPIC_POOL in magnific.py.')
            return

        print(f'Batch-modus: {len(topics)} kleurplaten genereren...')
        added = 0
        for topic in topics:
            try:
                if generate_one(topic['cat'], topic['diff'], topic['desc'], key,
                                 landscape=topic['landscape'], titles=topic['titles'],
                                 style=topic.get('style', 'standard')):
                    added += 1
            except Exception as e:
                print(f'  FOUT: {e}')

        if added:
            run_add_colorings()
            if do_push:
                git_push(f'Dagelijkse kleurplaten: {added} nieuwe pagina\'s')
        print(f'\nKlaar: {added} nieuw gegenereerd.')
        return

    if len(args) < 3:
        print(__doc__)
        sys.exit(1)

    category, difficulty, description = args[0], args[1], ' '.join(args[2:])
    landscape = '--landscape' in flags

    if category not in VALID_CATS:
        print(f'Ongeldige categorie: {category}')
        print(f'Kies uit: {", ".join(sorted(VALID_CATS))}')
        sys.exit(1)
    if difficulty not in ('easy', 'medium', 'hard'):
        print('Moeilijkheid moet easy, medium of hard zijn.')
        sys.exit(1)

    if generate_one(category, difficulty, description, key, landscape, style=style):
        run_add_colorings()
        if do_push:
            git_push(f'Nieuwe kleurplaat: {description}')
    print('\nKlaar!')


if __name__ == '__main__':
    main()
