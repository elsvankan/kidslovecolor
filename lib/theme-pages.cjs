'use strict';

const THEMES = {
  dinosaurussen: {
    paths: { nl: '/dinosaurussen', en: '/en/dinosaurs', fr: '/fr/dinosaures', es: '/es/dinosaurios', zh: '/zh/dinosaurs' },
    copy: {
      nl: {
        label: 'Dinosaurussen', title: 'Gratis dinosaurus kleurplaten – Print & Download', heading: 'Dinosaurussen om te kleuren',
        description: 'Gratis dinosaurus kleurplaten met echte soortnamen: Stegosaurus, Ankylosaurus en Diplodocus. Kies een plaat, download een A4-PDF of print direct.',
        eyebrow: 'Een kleine reis naar de prehistorie', hero: 'Van rugplaten tot lange staarten.',
        intro: 'Ontmoet verschillende dinosaurussen, ontdek hun opvallende kenmerken en geef ze jouw eigen kleuren. Deze eerste reeks heeft de echte wetenschappelijke namen als inkleurletters op de plaat.',
        choose: 'Kies jouw dinosaurus', all: 'Alle kleurplaten', gallery: 'Kies een dinosaurus kleurplaat',
        open: 'Bekijk, print of download PDF', download: 'Download JPG', fact: 'Ontdek deze soort', source: 'Museumbron',
        promise: ['Gratis te downloaden', 'Geen reclame of registratie', 'Witte vlakken om zelf te kleuren'],
        guide: 'Zo begin je jouw dino-avontuur', steps: ['Kies een dinosaurus en open de kleurplaat.', 'Download de PDF of gebruik de printknop op de detailpagina.', 'Print op A4, bij voorkeur passend op de pagina, en pak je kleurpotloden.'],
        learn: 'Leren terwijl je kleurt', learnText: 'Vergelijk de vormen: welke dino heeft rugplaten, welke een staartknots en welke de langste staart? Spreek de namen samen uit en wijs de verschillen aan. De platen zijn originele, vereenvoudigde illustraties; het zijn geen exacte wetenschappelijke reconstructies.',
        questions: 'Veelgestelde vragen', faq: [
          ['Zijn deze dinosaurus kleurplaten gratis?', 'Ja. Je kunt ze zonder account downloaden en printen voor persoonlijk gebruik thuis of in de klas.'],
          ['Staan de echte soortnamen op de kleurplaten?', 'Ja, op deze nieuwe educatieve reeks. Bijvoorbeeld Stegosaurus stenops. De twee woorden geven het geslacht en de soort aan. Oudere fantasieplaten krijgen niet zomaar een echte soortnaam.'],
          ['Hoe download ik een dinosaurus als PDF?', 'Open de gewenste kleurplaat en kies Download PDF. Op dezelfde pagina vind je ook de printknop en een JPG-download.']
        ],
        related: 'Nog meer om te ontdekken', animals: 'Dieren', nature: 'Natuur', space: 'Ruimte', story: 'Vandaag op Aarde', languages: 'Kies je taal', footer: 'Gemaakt door een moeder en dochter. Gratis kleuren, thuis en op school.'
      },
      en: {
        label: 'Dinosaurs', title: 'Free Dinosaur Coloring Pages – Print & Download', heading: 'Dinosaurs to color',
        description: 'Free dinosaur coloring pages with real species names: Stegosaurus, Ankylosaurus and Diplodocus. Download an A4 PDF or print your favorite.',
        eyebrow: 'A little journey into prehistory', hero: 'From back plates to long tails.',
        intro: 'Meet different dinosaurs, discover their distinctive features and choose your own colors. This first collection includes the real scientific names in outline letters you can color.',
        choose: 'Choose your dinosaur', all: 'All coloring pages', gallery: 'Choose a dinosaur coloring page',
        open: 'View, print or download PDF', download: 'Download JPG', fact: 'Meet this species', source: 'Museum source',
        promise: ['Free downloads', 'No ads or registration', 'White spaces for your colors'],
        guide: 'Start your dinosaur adventure', steps: ['Choose a dinosaur and open its coloring page.', 'Download the PDF or use the print button on the detail page.', 'Print on A4, preferably using fit to page, and grab your pencils.'],
        learn: 'Learn as you color', learnText: 'Compare the shapes: which dinosaur has back plates, which has a tail club and which has the longest tail? Say the names together and spot the differences. These original, simplified illustrations are not exact scientific reconstructions.',
        questions: 'Frequently asked questions', faq: [
          ['Are these dinosaur coloring pages free?', 'Yes. Download and print without an account for personal use at home or in the classroom.'],
          ['Do the coloring pages include real species names?', 'Yes, in this new educational collection: for example, Stegosaurus stenops. The two words identify the genus and species. We do not give older fantasy illustrations an unverified species name.'],
          ['How can I download a dinosaur PDF?', 'Open the coloring page and choose Download PDF. You will also find the print button and JPG download on that page.']
        ],
        related: 'More to explore', animals: 'Animals', nature: 'Nature', space: 'Space', story: 'Today on Earth', languages: 'Choose your language', footer: 'Made by a mom and daughter. Free coloring at home and at school.'
      },
      fr: {
        label: 'Dinosaures', title: 'Coloriages de Dinosaures Gratuits – Imprimer et Télécharger', heading: 'Des dinosaures à colorier',
        description: 'Coloriages de dinosaures gratuits avec de vrais noms : Stegosaurus, Ankylosaurus et Diplodocus. Téléchargez un PDF A4 ou imprimez directement.',
        eyebrow: 'Un petit voyage dans la préhistoire', hero: 'Des plaques dorsales aux longues queues.',
        intro: 'Rencontrez plusieurs dinosaures, découvrez leurs particularités et choisissez vos couleurs. Cette première série présente leurs vrais noms scientifiques en lettres creuses à colorier.',
        choose: 'Choisis ton dinosaure', all: 'Tous les coloriages', gallery: 'Choisis un coloriage de dinosaure',
        open: 'Voir, imprimer ou télécharger le PDF', download: 'Télécharger le JPG', fact: 'Découvrir cette espèce', source: 'Source du musée',
        promise: ['Téléchargements gratuits', 'Sans publicité ni inscription', 'Des espaces blancs à colorier'],
        guide: 'Commencer ton aventure', steps: ['Choisis un dinosaure et ouvre son coloriage.', 'Télécharge le PDF ou utilise le bouton d’impression de sa page.', 'Imprime sur A4, de préférence en ajustant à la page, et prends tes crayons.'],
        learn: 'Apprendre en coloriant', learnText: 'Compare les silhouettes : quel dinosaure a des plaques dorsales, une massue au bout de la queue ou une très longue queue ? Prononcez les noms ensemble. Ces illustrations originales et simplifiées ne sont pas des reconstitutions scientifiques exactes.',
        questions: 'Questions fréquentes', faq: [
          ['Ces coloriages de dinosaures sont-ils gratuits ?', 'Oui. Téléchargez et imprimez sans compte pour un usage personnel à la maison ou en classe.'],
          ['Les vrais noms des espèces figurent-ils sur les coloriages ?', 'Oui, sur cette nouvelle série éducative, par exemple Stegosaurus stenops. Les deux mots indiquent le genre et l’espèce. Les anciennes illustrations imaginaires ne reçoivent pas un nom scientifique non vérifié.'],
          ['Comment télécharger un dinosaure en PDF ?', 'Ouvrez son coloriage et choisissez Download PDF. La même page propose aussi un bouton d’impression et un téléchargement JPG.']
        ],
        related: 'Encore plus à découvrir', animals: 'Animaux', nature: 'Nature', space: 'Espace', story: 'Aujourd’hui sur Terre', languages: 'Choisir la langue', footer: 'Créé par une maman et sa fille. Coloriages gratuits à la maison et à l’école.'
      },
      es: {
        label: 'Dinosaurios', title: 'Dibujos de Dinosaurios para Colorear Gratis – Imprimir y Descargar', heading: 'Dinosaurios para colorear',
        description: 'Dibujos de dinosaurios gratis con nombres reales: Stegosaurus, Ankylosaurus y Diplodocus. Descarga un PDF A4 o imprime tu favorito.',
        eyebrow: 'Un pequeño viaje a la prehistoria', hero: 'De placas dorsales a largas colas.',
        intro: 'Conoce distintos dinosaurios, descubre sus características y elige tus colores. Esta primera colección incluye sus nombres científicos reales en letras huecas para colorear.',
        choose: 'Elige tu dinosaurio', all: 'Todos los dibujos', gallery: 'Elige un dinosaurio para colorear',
        open: 'Ver, imprimir o descargar PDF', download: 'Descargar JPG', fact: 'Descubre esta especie', source: 'Fuente del museo',
        promise: ['Descargas gratis', 'Sin anuncios ni registro', 'Espacios blancos para colorear'],
        guide: 'Empieza tu aventura', steps: ['Elige un dinosaurio y abre su dibujo.', 'Descarga el PDF o utiliza el botón de impresión de su página.', 'Imprime en A4, preferiblemente ajustando a la página, y prepara los lápices.'],
        learn: 'Aprender coloreando', learnText: 'Compara las formas: ¿qué dinosaurio tiene placas dorsales, una maza en la cola o una cola muy larga? Pronunciad juntos sus nombres. Estas ilustraciones originales y simplificadas no son reconstrucciones científicas exactas.',
        questions: 'Preguntas frecuentes', faq: [
          ['¿Son gratis estos dibujos de dinosaurios?', 'Sí. Puedes descargarlos e imprimirlos sin cuenta para uso personal en casa o en clase.'],
          ['¿Los dibujos incluyen nombres reales de especies?', 'Sí, en esta nueva colección educativa, por ejemplo Stegosaurus stenops. Las dos palabras indican el género y la especie. No damos un nombre científico sin verificar a antiguos dibujos de fantasía.'],
          ['¿Cómo descargo un dinosaurio en PDF?', 'Abre su dibujo y elige Download PDF. En la misma página encontrarás el botón de impresión y la descarga JPG.']
        ],
        related: 'Más para descubrir', animals: 'Animales', nature: 'Naturaleza', space: 'Espacio', story: 'Hoy en la Tierra', languages: 'Elige tu idioma', footer: 'Creado por una madre y su hija. Colorear gratis en casa y en clase.'
      },
      zh: {
        label: '恐龙', title: '免费恐龙涂色页 – 打印与下载', heading: '一起来给恐龙涂色',
        description: '带有真实学名的免费恐龙涂色页：剑龙、甲龙和梁龙。选择喜欢的恐龙，下载 A4 PDF 或直接打印。',
        eyebrow: '一次小小的史前之旅', hero: '从背上的骨板到长长的尾巴。',
        intro: '认识不同的恐龙，发现它们的特点，再用你喜欢的颜色创作。这个首发系列在画面上保留了真实学名，空心字母也可以涂色。',
        choose: '选择你的恐龙', all: '所有涂色页', gallery: '选择一张恐龙涂色页',
        open: '查看、打印或下载 PDF', download: '下载 JPG', fact: '认识这个物种', source: '博物馆资料',
        promise: ['免费下载', '无广告，无需注册', '留白区域供你涂色'],
        guide: '开始你的恐龙之旅', steps: ['选择一只恐龙，打开它的涂色页。', '下载 PDF，或使用详情页上的打印按钮。', '使用 A4 纸，建议选择适合页面大小，再拿起彩色铅笔。'],
        learn: '一边涂色，一边学习', learnText: '比较不同的外形：哪只恐龙背上有骨板，哪只尾巴末端有骨锤，哪只尾巴特别长？一起读出它们的名字。这些原创插画经过简化，并不是精确的科学复原图。',
        questions: '常见问题', faq: [
          ['这些恐龙涂色页免费吗？', '是的。无需账户即可下载和打印，供家庭或课堂中的个人使用。'],
          ['涂色页上有真实的物种名称吗？', '这个新的学习系列有，例如 Stegosaurus stenops。两个词分别表示属名和种名。我们不会给旧的幻想插画随意标上未经核实的物种名称。'],
          ['怎样下载恐龙 PDF？', '打开涂色页并选择 Download PDF。同一页面还有打印按钮和 JPG 下载链接。']
        ],
        related: '继续探索', animals: '动物', nature: '自然', space: '太空', story: '今天的地球', languages: '选择语言', footer: '由一位妈妈和女儿一起制作。在家和学校都可以免费涂色。'
      }
    }
  }
};

THEMES.prinsessen = {
  category: 'prinsessen',
  paths: { nl: '/prinsessen' },
  galleryPaths: { nl: '/?cat=prinsessen' },
  coloringSlugs: [
    'princess-with-a-magic-wand-and-stars',
    'chibi-princess-holding-a-wand-with-a-crown',
    'moon-princess-reading-under-the-stars',
    'moon-garden-princess-with-watering-can'
  ],
  copy: {
    nl: {
      label: 'Prinsessen',
      title: 'Prinsessen kleurplaten – Gratis printen en PDF downloaden',
      heading: 'Prinsessen kleurplaten om zelf te kleuren',
      description: 'Kies een gratis prinsessen kleurplaat: makkelijk met grote vlakken of uitgebreider met een maantuin en sterren. Download een A4-PDF of print direct, zonder account.',
      eyebrow: 'EEN KROON, EEN TOVERSTOK EN JOUW FANTASIE',
      hero: 'Van grote kleurvlakken tot kleine sterren.',
      intro: 'Zoek je een makkelijke prinses kleurplaat of juist een scène met meer details? Begin met deze vier geselecteerde platen. Kies een prinses met een toverstok, een leesplek tussen de sterren of een bloeiende maantuin. Jij bepaalt de kleuren en het verhaal.',
      choose: 'Kies jouw prinses',
      all: 'Alle prinsessen & feeën',
      gallery: 'Kies een prinsessen kleurplaat',
      open: 'Bekijk, print of download PDF',
      download: 'Download JPG',
      source: 'Meer informatie',
      promise: ['Gratis te downloaden', 'Geen reclame of registratie', 'Witte vlakken om zelf te kleuren'],
      guide: 'Zo kies je een passende kleurplaat',
      steps: [
        'Grote vlakken en dikke lijnen? Kies de prinses met toverstok of de kleine chibi-prinses.',
        'Zin in meer details? De lezende maanprinses en de prinses met gieter hebben bloemen, sterren en versieringen.',
        'Open de plaat, download de PDF en print op A4 met de instelling passend op de pagina.'
      ],
      learn: 'Maak er jouw eigen sprookje van',
      learnText: 'Waar leest de maanprinses over? Welke bloemen groeien in haar tuin? En wat gebeurt er als het toverstokje een nieuwe kleur krijgt? Verzin samen een verhaal terwijl je kleurt. Je hoeft geen voorbeeld na te maken: een blauwe jurk, groene sterren of een regenboogkroon mogen allemaal.',
      questions: 'Veelgestelde vragen',
      faq: [
        ['Kan ik deze prinsessen kleurplaten gratis printen?', 'Ja. Open een plaat en gebruik de printknop of download de PDF. Je hoeft geen account aan te maken. De platen zijn bedoeld voor persoonlijk gebruik thuis en in de klas.'],
        ['Welke prinsessen kleurplaat is makkelijk?', 'De prinses met toverstok en de chibi-prinses hebben duidelijke lijnen en grote vlakken. De maantuin en de lezende prinses hebben meer details. Kies wat je kind leuk vindt; leeftijd alleen bepaalt niet welke plaat past.'],
        ['Hoe download ik een prinsessen kleurplaat als PDF?', 'Open de detailpagina en kies Download PDF. Het bestand bevat één A4-pagina. Op dezelfde pagina kun je ook de JPG downloaden.'],
        ['Zijn er nog meer prinsessen en feeën?', 'Ja. Via Alle prinsessen & feeën open je de bestaande volledige galerij, met onder andere kastelen, zeemeerminnen en andere sprookjesscènes.']
      ],
      related: 'Nog meer om te ontdekken',
      animals: 'Dieren', nature: 'Natuur', space: 'Ruimte', story: 'Vandaag op Aarde',
      languages: 'Taal van deze selectie',
      footer: 'Gemaakt door een moeder en dochter. Gratis kleuren, thuis en op school.'
    }
  }
};

module.exports = { THEMES };
