'use strict';

const THEMES = {
  dinosaurussen: {
    paths: { nl: '/dinosaurussen', en: '/en/dinosaurs', fr: '/fr/dinosaures', es: '/es/dinosaurios', zh: '/zh/dinosaurs' },
    downloadPack: {
      url: '/downloads/dinosaurussen-5-kleurplaten-a4-v1.pdf',
      slugs: ['stegosaurus-stenops-tussen-varens', 'ankylosaurus-magniventris-op-ontdekking', 'diplodocus-carnegii-bij-de-rivier', 'parasaurolophus-walkeri-varenvallei', 'iguanodon-bernissartensis-bosrand'],
      copy: {
        nl: { heading: 'Vijf dino’s, één printpakket', description: 'Vijf verschillende dinosaurussen in één PDF. Print het hele pakket of kies je favoriete pagina’s. Gratis en zonder account.', button: 'Download het gratis dinopakket', format: 'PDF · 5 A4-pagina’s' },
        en: { heading: 'Five dinosaurs, one printable pack', description: 'Five different dinosaurs in one PDF. Print the whole pack or choose your favorite pages. Free, with no account needed.', button: 'Download the free dinosaur pack', format: 'PDF · 5 A4 pages' },
        fr: { heading: 'Cinq dinosaures dans un seul fichier', description: 'Cinq dinosaures différents dans un PDF. Imprimez tout le pack ou choisissez vos pages préférées. Gratuit, sans compte.', button: 'Télécharger le pack de dinosaures gratuit', format: 'PDF · 5 pages A4' },
        es: { heading: 'Cinco dinosaurios en un solo archivo', description: 'Cinco dinosaurios diferentes en un PDF. Imprime el conjunto completo o elige tus páginas favoritas. Gratis y sin cuenta.', button: 'Descargar el pack de dinosaurios gratis', format: 'PDF · 5 páginas A4' },
        zh: { heading: '五种恐龙，一套可打印涂色页', description: '五种不同恐龙，合在一个 PDF 中。可打印整套，也可选择喜欢的页面。免费，无需注册。', button: '免费下载恐龙涂色套装', format: 'PDF · 5 页 A4' }
      }
    },
    copy: {
      nl: {
        label: 'Dinosaurussen', title: 'Gratis dinosaurus kleurplaten – Print & Download', heading: 'Dinosaurussen om te kleuren',
        description: 'Gratis dinosaurus kleurplaten met echte soortnamen: Stegosaurus, Ankylosaurus en Diplodocus. Kies een plaat, download een A4-PDF of print direct.',
        eyebrow: 'Een kleine reis naar de prehistorie', hero: 'Van rugplaten tot lange staarten.',
        intro: 'Ontdek dino’s met rugplaten, hoorns of een lange nek. Bij platen met echte soorten vind je de wetenschappelijke namen en korte weetjes.',
        choose: 'Kies jouw dinosaurus', all: 'Alle kleurplaten', gallery: 'Kies een dinosaurus kleurplaat',
        open: 'Bekijk, print of download PDF', download: 'Download JPG', fact: 'Ontdek deze soort', source: 'Bron',
        promise: ['Gratis te downloaden', 'Geen reclame of registratie', 'Witte vlakken om zelf te kleuren'],
        questions: 'Veelgestelde vragen', faq: [
          ['Zijn deze dinosaurus kleurplaten gratis?', 'Ja. Je kunt ze zonder account downloaden en printen voor persoonlijk gebruik thuis of in de klas.'],
          ['Waar staan de soortnamen?', 'Bij de plaat vind je de wetenschappelijke namen. Op een deel van de platen kun je de namen ook inkleuren.']
        ],
        related: 'Nog meer om te ontdekken', animals: 'Dieren', nature: 'Natuur', space: 'Ruimte', story: 'Vandaag op Aarde', languages: 'Kies je taal', footer: 'Gemaakt door een moeder en dochter. Gratis kleuren, thuis en op school.'
      },
      en: {
        label: 'Dinosaurs', title: 'Free Dinosaur Coloring Pages – Print & Download', heading: 'Dinosaurs to color',
        description: 'Free dinosaur coloring pages with real species names: Stegosaurus, Ankylosaurus and Diplodocus. Download an A4 PDF or print your favorite.',
        eyebrow: 'A little journey into prehistory', hero: 'From back plates to long tails.',
        intro: 'Explore dinosaurs with back plates, horns or long necks. Pages featuring real species include scientific names and a short fact.',
        choose: 'Choose your dinosaur', all: 'All coloring pages', gallery: 'Choose a dinosaur coloring page',
        open: 'View, print or download PDF', download: 'Download JPG', fact: 'Meet this species', source: 'Source',
        promise: ['Free downloads', 'No ads or registration', 'White spaces for your colors'],
        questions: 'Frequently asked questions', faq: [
          ['Are these dinosaur coloring pages free?', 'Yes. Download and print without an account for personal use at home or in the classroom.'],
          ['Where can I find the species names?', 'Look next to the coloring page for the scientific names. Some pages also have names you can color in.']
        ],
        related: 'More to explore', animals: 'Animals', nature: 'Nature', space: 'Space', story: 'Today on Earth', languages: 'Choose your language', footer: 'Made by a mom and daughter. Free coloring at home and at school.'
      },
      fr: {
        label: 'Dinosaures', title: 'Coloriages de Dinosaures Gratuits – Imprimer et Télécharger', heading: 'Des dinosaures à colorier',
        description: 'Coloriages de dinosaures gratuits avec de vrais noms : Stegosaurus, Ankylosaurus et Diplodocus. Téléchargez un PDF A4 ou imprimez directement.',
        eyebrow: 'Un petit voyage dans la préhistoire', hero: 'Des plaques dorsales aux longues queues.',
        intro: 'Découvre des dinosaures à plaques dorsales, à cornes ou à long cou. Pour les espèces réelles, retrouve le nom scientifique et un détail à observer.',
        choose: 'Choisis ton dinosaure', all: 'Tous les coloriages', gallery: 'Choisis un coloriage de dinosaure',
        open: 'Voir, imprimer ou télécharger le PDF', download: 'Télécharger le JPG', fact: 'Découvrir cette espèce', source: 'Source',
        promise: ['Téléchargements gratuits', 'Sans publicité ni inscription', 'Des espaces blancs à colorier'],
        questions: 'Questions fréquentes', faq: [
          ['Ces coloriages de dinosaures sont-ils gratuits ?', 'Oui. Téléchargez et imprimez sans compte pour un usage personnel à la maison ou en classe.'],
          ['Où trouver les noms des espèces ?', 'Les noms scientifiques sont indiqués à côté du coloriage. Sur certaines planches, tu peux aussi colorier les noms.']
        ],
        related: 'Encore plus à découvrir', animals: 'Animaux', nature: 'Nature', space: 'Espace', story: 'Aujourd’hui sur Terre', languages: 'Choisir la langue', footer: 'Créé par une maman et sa fille. Coloriages gratuits à la maison et à l’école.'
      },
      es: {
        label: 'Dinosaurios', title: 'Dibujos de Dinosaurios para Colorear Gratis – Imprimir y Descargar', heading: 'Dinosaurios para colorear',
        description: 'Dibujos de dinosaurios gratis con nombres reales: Stegosaurus, Ankylosaurus y Diplodocus. Descarga un PDF A4 o imprime tu favorito.',
        eyebrow: 'Un pequeño viaje a la prehistoria', hero: 'De placas dorsales a largas colas.',
        intro: 'Descubre dinosaurios con placas en el lomo, cuernos o cuellos largos. Los dibujos de especies reales incluyen sus nombres científicos y un dato breve.',
        choose: 'Elige tu dinosaurio', all: 'Todos los dibujos', gallery: 'Elige un dinosaurio para colorear',
        open: 'Ver, imprimir o descargar PDF', download: 'Descargar JPG', fact: 'Descubre esta especie', source: 'Fuente',
        promise: ['Descargas gratis', 'Sin anuncios ni registro', 'Espacios blancos para colorear'],
        questions: 'Preguntas frecuentes', faq: [
          ['¿Son gratis estos dibujos de dinosaurios?', 'Sí. Puedes descargarlos e imprimirlos sin cuenta para uso personal en casa o en clase.'],
          ['¿Dónde aparecen los nombres de las especies?', 'Los nombres científicos aparecen junto a cada dibujo de una especie real. En algunos dibujos también puedes colorear los nombres.']
        ],
        related: 'Más para descubrir', animals: 'Animales', nature: 'Naturaleza', space: 'Espacio', story: 'Hoy en la Tierra', languages: 'Elige tu idioma', footer: 'Creado por una madre y su hija. Colorear gratis en casa y en clase.'
      },
      zh: {
        label: '恐龙', title: '免费恐龙涂色页 – 打印与下载', heading: '一起来给恐龙涂色',
        description: '带有真实学名的免费恐龙涂色页：剑龙、甲龙和梁龙。选择喜欢的恐龙，下载 A4 PDF 或直接打印。',
        eyebrow: '一次小小的史前之旅', hero: '从背上的骨板到长长的尾巴。',
        intro: '认识背上有骨板、头上有角或脖子很长的恐龙。描绘真实物种的涂色页附有学名和简短的趣味知识。',
        choose: '选择你的恐龙', all: '所有涂色页', gallery: '选择一张恐龙涂色页',
        open: '查看、打印或下载 PDF', download: '下载 JPG', fact: '认识这个物种', source: '资料来源',
        promise: ['免费下载', '无广告，无需注册', '留白区域供你涂色'],
        questions: '常见问题', faq: [
          ['这些恐龙涂色页免费吗？', '是的。无需账户即可下载和打印，供家庭或课堂中的个人使用。'],
          ['在哪里可以看到物种的学名？', '真实物种的学名列在涂色页旁。部分图画上的学名也可以涂色。']
        ],
        related: '继续探索', animals: '动物', nature: '自然', space: '太空', story: '今天的地球', languages: '选择语言', footer: '由一位妈妈和女儿一起制作。在家和学校都可以免费涂色。'
      }
    }
  }
};

THEMES.prinsessen = {
  category: 'prinsessen',
  paths: { nl: '/prinsessen' },
  galleryPaths: { nl: '/#categorieen' },
  heroSlug: 'princess-with-a-magic-wand-and-stars',
  copy: {
    nl: {
      label: 'Prinsessen',
      title: 'Prinsessen kleurplaten – Gratis printen en PDF downloaden',
      heading: 'Prinsessen kleurplaten om zelf te kleuren',
      description: 'Gratis kleurplaten van prinsessen, kastelen en zeemeerminnen. Kies een eenvoudige of gedetailleerde plaat en download de A4-pdf.',
      eyebrow: 'EEN KROON, EEN TOVERSTOK EN JOUW FANTASIE',
      hero: 'Van grote kleurvlakken tot kleine sterren.',
      intro: 'Kleur een prinses met een toverstok, een kasteel, een zeemeermin of een maantuin. Kies uit de hele collectie en download je favoriete kleurplaat gratis als A4-pdf.',
      choose: 'Kies jouw prinses',
      all: 'Bekijk andere categorieën',
      gallery: 'Kies een prinsessen kleurplaat',
      open: 'Bekijk, print of download PDF',
      download: 'Download JPG',
      source: 'Meer informatie',
      promise: ['Gratis te downloaden', 'Geen reclame of registratie', 'Witte vlakken om zelf te kleuren'],
      guide: 'Zo kies je een passende kleurplaat',
      steps: [
        'Grote vlakken en dikke lijnen? Kies de prinses met toverstok of de kleine chibi-prinses.',
        'Zin in meer details? De lezende maanprinses en de prinses met gieter hebben bloemen, sterren en versieringen.'
      ],
      learn: 'Maak er jouw eigen sprookje van',
      learnText: 'Waar leest de maanprinses over? Welke bloemen groeien in haar tuin? En wat gebeurt er als het toverstokje een nieuwe kleur krijgt? Verzin samen een verhaal terwijl je kleurt. Je hoeft geen voorbeeld na te maken: een blauwe jurk, groene sterren of een regenboogkroon mogen allemaal.',
      questions: 'Veelgestelde vragen',
      faq: [
        ['Kan ik deze prinsessen kleurplaten gratis printen?', 'Ja. Open een plaat en gebruik de printknop of download de PDF. Je hoeft geen account aan te maken. De platen zijn bedoeld voor persoonlijk gebruik thuis en in de klas.'],
        ['Welke prinsessen kleurplaat is makkelijk?', 'De prinses met toverstok en de chibi-prinses hebben duidelijke lijnen en grote vlakken. De maantuin en de lezende prinses hebben meer details. Kies wat je kind leuk vindt; leeftijd alleen bepaalt niet welke plaat past.'],
        ['Welke sprookjesscènes kan ik kleuren?', 'Kijk in de collectie voor prinsessen, kastelen, zeemeerminnen en andere sprookjesscènes.']
      ],
      related: 'Nog meer om te ontdekken',
      animals: 'Dieren', nature: 'Natuur', space: 'Ruimte', story: 'Vandaag op Aarde',
      languages: 'Taal van deze selectie',
      footer: 'Gemaakt door een moeder en dochter. Gratis kleuren, thuis en op school.'
    }
  }
};

module.exports = { THEMES };
