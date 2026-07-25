#!/usr/bin/env python3
"""
magnific.py — KidsLoveColor.com
Genereert kleurplaten via Magnific AI en voegt ze toe aan de site.

Gebruik:
  python3 magnific.py <categorie> <moeilijkheid> "<beschrijving>" [--landscape]
  python3 magnific.py kawaii easy "cute cat with flowers"
  python3 magnific.py dieren medium "elephant family in savanna" --landscape

  python3 magnific.py --batch [n]      # genereer n kleurplaten (default 5) uit de rotatiepool
  python3 magnific.py --batch --no-push

Categorieën: dieren, voertuigen, prinsessen, seizoenen, feestdagen,
             eten, kawaii, natuur, sprookjes, ruimte, oceaan, letters, mandala, gezichten
Moeilijkheid: easy, medium, hard

Elke run genereert het beeld op A4 (portret of liggend), zet het watermerk
erop, registreert de kleurplaat in alle 5 talen, werkt de sitemap bij en
pusht automatisch naar git (tenzij --no-push).
"""

import sys, os, time, re, json, subprocess, io
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
    'letters','mandala','gezichten',
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
}

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


def _build_prompt(description, category, difficulty):
    framing = (
        'Show the full character or the full scene composition, not just an isolated head or face close-up.'
        if category not in HEAD_OK_CATS else
        'Close-up portrait framing is fine here.'
    )
    return (
        f'black and white coloring page for children: {description}. '
        f'{CAT_HINTS.get(category, "")}. {framing} '
        f'{DIFF_HINTS.get(difficulty, DIFF_HINTS["easy"])}. '
        'Style: clean bold outlines only, pure white background, absolutely no shading, '
        'no color fills, no gradients, simple line art ready to color with crayons. '
        'High contrast black lines on white paper. Printable coloring book style.'
    )


def _slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9 ]+', '', text)
    return re.sub(r'\s+', '-', text).strip('-')


def _filename_for(category, difficulty, description):
    return f'{category}--{difficulty}--{_slugify(description)}.jpg'


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


def generate_one(category, difficulty, description, key, landscape=False, titles=None):
    filename = _filename_for(category, difficulty, description)
    out_path = IMG_DIR / filename

    if out_path.exists():
        print(f'  Bestaat al, overgeslagen: {filename}')
        return False

    prompt = _build_prompt(description, category, difficulty)
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
                                 landscape=topic['landscape'], titles=topic['titles']):
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

    if generate_one(category, difficulty, description, key, landscape):
        run_add_colorings()
        if do_push:
            git_push(f'Nieuwe kleurplaat: {description}')
    print('\nKlaar!')


if __name__ == '__main__':
    main()
