/**
 * content.js — ЄДИНЕ ДЖЕРЕЛО КОНТЕНТУ САЙТУ.
 *
 * Тут немає логіки — лише дані. Щоб змінити текст, додати роботу
 * чи цілу серію — редагуєш цей файл, більше нічого чіпати не треба.
 *
 * Двомовний текст — це об'єкт виду { uk: '…', en: '…' }.
 * Якщо перекладу нема, функція t() у render.js підставить українську.
 *
 * ────────────────────────────────────────────────────────────────
 * ТИПИ ДАНИХ (неформально, для довідки):
 *
 * L        = { uk: string, en?: string }        — двомовний рядок
 * Work     = {
 *   src: string,        — шлях до картинки (assets/img/…)
 *   alt: string,        — alt-текст для доступності
 *   title?: L,          — назва + рік (перший рядок підпису)
 *   materials?: L,      — техніка й розмір (другий рядок підпису)
 * }
 * Link     = {
 *   label: L,           — текст лінка
 *   href: string,       — куди веде (відкриється в новій вкладці)
 *   preview?: string,   — Google Drive /preview URL → відкриється
 *                         в лайтбоксі («режим кінотеатру») замість переходу
 *   embed?: 'video'|'pdf' — пропорції лайтбокса для preview
 * }
 *
 * Секції (поле type вибирає рендерер у render.js):
 *   { type: 'statement', title: string, paragraphs: L[] }
 *   { type: 'split',   — текст поруч із великим зображенням
 *     reverse?: true,  — зображення ліворуч замість праворуч
 *     kicker: L, title: L, paragraphs: L[], link?: Link,
 *     image: { src, alt, caption?: L } }
 *   { type: 'gallery', — заголовок/текст + сітки робіт
 *     title: L, paragraphs?: L[], link?: Link,
 *     groups: [{ title?: L, grid: 'grid-1'|'grid-2'|'grid-3'|'grid-4'|'grid-sketches',
 *                works: Work[], caption?: L }] }
 *   { type: 'contact' } — рендериться з даних artist + form
 * ────────────────────────────────────────────────────────────────
 */

export const content = {

  meta: {
    title: {
      uk: 'Прус Марися — портфоліо',
      en: 'Marisya Prus — portfolio',
    },
  },

  /** Дані художниці — використовуються в hero, контактах і футері. */
  artist: {
    name: { uk: 'Прус Марися', en: 'Marisya Prus' },
    tagline: { uk: 'художниця · Київ, Україна', en: 'artist · Kyiv, Ukraine' },
    photo: 'assets/img/hero.jpg',
    email: 'Prus.mmm22@gmail.com',
    phoneLabel: '+38 068 676 74 22 (Telegram)',
    telegram: 'https://t.me/+380686767422',
    city: { uk: 'м. Київ, Україна', en: 'Kyiv, Ukraine' },
    instagram: 'https://www.instagram.com/marisya_prus/',
  },

  /** Налаштування контактної форми (FormSubmit.co). */
  form: {
    action: 'https://formsubmit.co/Prus.mmm22@gmail.com',
    subject: 'Повідомлення з сайту-портфоліо',
    // Куди FormSubmit поверне користувача після відправки.
    // ?sent=1 вмикає банер «Дякуємо» (див. app.js).
    next: 'https://marisyaprus.com/?sent=1#contact',
    labels: {
      name: { uk: 'Ім’я', en: 'Name' },
      email: { uk: 'Email', en: 'Email' },
      message: { uk: 'Повідомлення', en: 'Message' },
      send: { uk: 'Надіслати', en: 'Send' },
      thanks: {
        uk: 'Дякуємо! Повідомлення надіслано.',
        en: 'Thank you! Your message has been sent.',
      },
    },
  },

  /** Секції сторінки — рендеряться згори вниз у цьому ж порядку. */
  sections: [

    /* ── Artist Statement ─────────────────────────────────────── */
    {
      type: 'statement',
      title: 'Artist Statement',
      paragraphs: [
        {
          uk: 'Уся моя практика і життя зводяться до одного слова: тварини. В добу Антропоцентризму ми сфокусовані лише на власному існуванні, сприймаючи все навколо як фон, що призводить до загибелі природи. Своїм мистецтвом я розповідаю про власний досвід бачення цього світу, звертаючи увагу на наш взаємозв’язок з іншими видами, на їхнє життя та вразливе становище.',
          en: 'My whole practice and life come down to one word: animals. In the age of anthropocentrism we are focused solely on our own existence, perceiving everything around us as a backdrop — and this leads to the destruction of nature. Through my art I speak about my own experience of seeing this world, drawing attention to our interconnection with other species, to their lives and their vulnerable position.',
        },
        {
          uk: 'Основні теми мого дослідження — це зникнення видів, байдужість до їхнього болю й крихкість життя, а також історія нашого співіснування. Війна в Україні додала моїй практиці ще один пласт: я досліджую тему екоциду, впливу воєнних дій на екосистеми, руйнування середовищ проживання та болісні історії тих, хто виживає в цих реаліях.',
          en: 'The core themes of my research are the extinction of species, indifference to their pain and the fragility of life, as well as the history of our coexistence. The war in Ukraine has added another layer to my practice: I explore ecocide, the impact of military action on ecosystems, the destruction of habitats and the painful stories of those who survive in these realities.',
        },
        {
          uk: 'Тема тварин з’явилася з власного досвіду взаємодії з ними і стала великою любов’ю, але за цим словом ховається також величезна кількість болю, співчуття та обурення. Людська емпатія до інших видів формується через проживання спільних історій і здатність розуміти їхню інакшість. Наше сприйняття часто не відповідає їхньому способу життя, і ця невідповідність призвела людину до знецінення того, що нам незрозуміло. Тварини та природа є найменш захищеними — тими, на чий біль часто закривають очі, зводячи їхнє життя до ресурсу. Але людина часто чинить шкоду через незнання, тому я працюю в цій темі, щоб розповісти їхні історії. Прагну донести, що вони заслуговують на повагу, турботу та емпатію; заслуговують на те, щоб про них пам’ятали й переймалися їхньою долею.',
          en: 'The theme of animals grew out of my own experience of interacting with them and became a great love — yet behind that word also lies an enormous amount of pain, compassion and indignation. Human empathy towards other species is formed by living through shared stories and by the ability to understand their otherness. Our perception often does not match their way of life, and this mismatch has led humans to devalue what we do not understand. Animals and nature are the least protected — those whose pain is so often ignored, their lives reduced to a resource. Yet people often cause harm out of ignorance, which is why I work with this theme: to tell their stories. I want to convey that they deserve respect, care and empathy; that they deserve to be remembered and cared about.',
        },
        {
          uk: 'Я працюю з живописом, графікою та інсталяцією, поєднуючи їх із текстилем та відтворюючи реалістичні образи з експресивними фактурами. Використовую образ людини, щоб передати — на власному «тілі» — біль, любов та свободу (або її відсутність), які переживають інші істоти. Саме ці медіа дозволяють мені ділитися своїми почуттями та розкривати питання, які часто лишаються поза увагою, але здатні змінити наше сприйняття навколишнього світу.',
          en: 'I work with painting, drawing and installation, combining them with textiles and rendering realistic images with expressive textures. I use the human figure to convey — on my own “body” — the pain, love and freedom (or its absence) experienced by other beings. These media allow me to share my feelings and raise questions that often remain unnoticed, yet are capable of changing how we perceive the world around us.',
        },
      ],
    },

    /* ── «Природа співчуття» (перформанс + відео) ─────────────── */
    {
      type: 'split',
      kicker: {
        uk: 'Мультидисциплінарна перформативна вистава',
        en: 'Multidisciplinary performative piece',
      },
      title: { uk: '«Природа співчуття»', en: '“The Nature of Compassion”' },
      paragraphs: [
        {
          uk: 'Проєкт є глобальним соціальним дослідженням видової дискримінації. Центральною темою проєкту є сіра зона співчуття, куди потрапляють свійські тварини, чия суб’єктність стирається статистикою, пакуванням та відсутністю імен.',
          en: 'The project is a broad social study of species discrimination. At its centre is the grey zone of compassion into which farmed animals fall — beings whose subjectivity is erased by statistics, packaging and the absence of names.',
        },
        {
          uk: 'Переходячи до питання формування співчуття та емпатії до інших видів через проживання спільних досвідів і здатність розуміти їхню інакшість. Адже відсутність взаємодії створює дистанцію, яка дозволяє нам ігнорувати складність чужого життя. Тварина залишається для нас лише абстракцією або проєкцією власних уявлень.',
          en: 'It turns to how compassion and empathy towards other species are formed: through living shared experiences and the ability to understand their otherness. The absence of interaction creates a distance that allows us to ignore the complexity of another’s life. The animal remains a mere abstraction, or a projection of our own assumptions.',
        },
        {
          uk: 'Розповідь приводить до особистої історії про те, як взаємодія сформувала погляд на інших істот та досвід любові, за яким також приходить глибокий шар болю, співчуття та обурення. Це процес, що формує відчуття спорідненості з навколишнім світом, без якого неможливо осягнути життя інших видів.',
          en: 'The narrative leads to a personal story of how interaction shaped a view of other beings and an experience of love — one that is followed by a deep layer of pain, compassion and indignation. It is a process that creates a sense of kinship with the surrounding world, without which the lives of other species cannot be grasped.',
        },
        {
          uk: 'Спільний досвід розмиває ці кордони, дозволяючи нам відчути життя тварин рівноцінним людському. Він стає моментом, де кожна людина обирає свою роль у системі співіснування.',
          en: 'Shared experience blurs these boundaries, letting us feel animal life as equal in value to human life. It becomes the moment when each person chooses their role in the system of coexistence.',
        },
      ],
      link: {
        label: { uk: 'Відеозапис роботи ↗', en: 'Video documentation ↗' },
        href: 'https://drive.google.com/file/d/1e1mZJLeo_56GDrpwHbdxY4QUyh7T0z08/view?usp=sharing',
        preview: 'https://drive.google.com/file/d/1e1mZJLeo_56GDrpwHbdxY4QUyh7T0z08/preview',
        embed: 'video',
      },
      image: { src: 'assets/img/performance.jpg', alt: 'Природа співчуття — перформанс' },
    },

    /* ── Інсталяція ───────────────────────────────────────────── */
    {
      type: 'split',
      reverse: true,
      kicker: { uk: 'Мультимедійна інсталяція', en: 'Multimedia installation' },
      title: {
        uk: '«Пам’яті зраненої землі. Пам’яті зниклим слідам»',
        en: '“In Memory of the Wounded Land. In Memory of Vanished Traces”',
      },
      paragraphs: [
        {
          uk: 'Робота є візуальною документацією життя природи в умовах війни, де ландшафт трансформується з поняття дому у місце екоциду. Це спроба зафіксувати стан зраненої землі та зникнення тварин, щоб зберегти пам’ять про їх життя у цій реальності.',
          en: 'The work is a visual documentation of nature’s life in wartime, where the landscape is transformed from a notion of home into a site of ecocide. It is an attempt to record the state of the wounded land and the disappearance of animals, to preserve the memory of their lives in this reality.',
        },
        {
          uk: 'На тлі загальнолюдської катастрофи проблема нищення екосистем часто залишається поза уваги. Головний фокус роботи спрямований на те, що переживає земля та види тварин, які жили у цих екосистемах.',
          en: 'Against the background of a human catastrophe, the destruction of ecosystems often remains overlooked. The work focuses on what the land endures, and on the animal species that lived in these ecosystems.',
        },
        {
          uk: 'Дерева, що стоять непорушно десятиліттями, стають мовчазними свідками окупації та руйнувань. У їхніх стовбурах залишаються уламки металу, у корінні — сліди важкої техніки, у кронах — опіки від вибухових хвиль. Земля ховає у собі сліди зниклих тварин, заміняючи їх слідами важкої техніки та окопами; річки наповнюються токсинами, що витісняють риб та птахів зі своїх звичних місць існування, але екосистема, попри все, намагається загоїти ці рани та відновити власну цілісність.',
          en: 'Trees that have stood unmoved for decades become silent witnesses of occupation and destruction. Fragments of metal remain in their trunks, traces of heavy machinery in their roots, burns from blast waves in their crowns. The earth conceals the traces of vanished animals, replacing them with the tracks of heavy vehicles and trenches; rivers fill with toxins that drive fish and birds from their habitats — and yet the ecosystem, despite everything, tries to heal these wounds and restore its own wholeness.',
        },
        {
          uk: 'Мета роботи — оприявнити невидиму ціну війни, яку платить довкілля. Це заклик до збереження пам’яті про екологічну трагедію та визнання природи як суб’єкта, що переживає біль і втрату, має право на життя та безпеку так само, як і людина.',
          en: 'The aim of the work is to make visible the invisible price of war paid by the environment. It is a call to preserve the memory of this ecological tragedy and to recognise nature as a subject that experiences pain and loss, and has the same right to life and safety as a human being.',
        },
      ],
      image: {
        src: 'assets/img/installation.jpg',
        alt: 'Пам’яті зраненої землі — інсталяція',
        caption: {
          uk: '2026 · олія на папері, туш на тканині, нитка · 150×70 см',
          en: '2026 · oil on paper, ink on fabric, thread · 150×70 cm',
        },
      },
    },

    /* ── Артбук «(не)забуті історії тварин» + PDF-щоденник ────── */
    {
      type: 'gallery',
      title: {
        uk: 'Проєкт «(не)забуті історії тварин»',
        en: 'Project “(un)forgotten stories of animals”',
      },
      paragraphs: [
        {
          uk: 'Це перша частина щоденника, що документує життя тварин під час війни. В ньому зберігаються історії, які я знаходжу у новинах, дописах, розповідях та замальовую, перетворюючи у пам’ять та архів.',
          en: 'This is the first part of a diary documenting the lives of animals during the war. It gathers the stories I find in the news, in posts and in personal accounts, and sketch — turning them into memory and archive.',
        },
        {
          uk: 'Життя тварин під час війни стає ще більш крихким і невидимим. Їх часто ігнорують, створюючи певну ієрархію страждань, де ми перестаємо помічати їх біль, що призводить до найстрашнішого — знецінення живого. Збереження цих історій є актом визнання важливості їх життя та болю.',
          en: 'In wartime, animal lives become even more fragile and invisible. They are often ignored, and a certain hierarchy of suffering emerges in which we stop noticing their pain — leading to the most frightening thing of all: the devaluation of the living. Preserving these stories is an act of recognising the importance of their lives and their pain.',
        },
        {
          uk: 'Проєкт пропонує не просто спостерігати за руйнуванням, а дивитись на них як на збереження свідчень про тих, хто проходить через пекло разом із нами. Документування приводить до усвідомлення: ми не маємо права на байдужість, якщо хочемо, щоб життя як таке мало значення. Тому зберігати такі сторінки в пам’яті є кроком до визнання їх права на життя та безпеку, визнання їх суб’єктності.',
          en: 'The project proposes not merely to observe destruction, but to see these pages as preserved testimony of those who go through this hell together with us. Documenting leads to a realisation: we have no right to indifference if we want life as such to matter. Keeping these pages in memory is a step towards recognising their right to life and safety — recognising their subjectivity.',
        },
        {
          uk: 'Я веду цей щоденник, щоб вберегти їх життя від забутих втрат, щоб недопустити нормалізацію, щоб показати, що їх життя має значення.',
          en: 'I keep this diary to protect their lives from becoming forgotten losses, to prevent normalisation, to show that their lives matter.',
        },
      ],
      link: {
        label: { uk: 'Електронна версія щоденника ↗', en: 'Digital version of the diary ↗' },
        href: 'https://drive.google.com/file/d/1DdH2s_T4d8zwFg7UMD0dLHuFDxRL68NY/view?usp=drive_link',
        preview: 'https://drive.google.com/file/d/1DdH2s_T4d8zwFg7UMD0dLHuFDxRL68NY/preview',
        embed: 'pdf',
      },
      groups: [
        {
          grid: 'grid-4',
          works: [
            { src: 'assets/img/artbook-stand.jpg', alt: 'Артбук (не)забуті історії тварин' },
            { src: 'assets/img/artbook-1.jpg', alt: 'Артбук — розворот' },
            { src: 'assets/img/artbook-2.jpg', alt: 'Артбук — сторінка' },
            { src: 'assets/img/artbook-3.jpg', alt: 'Артбук — сторінка' },
            { src: 'assets/img/artbook-4.jpg', alt: 'Артбук — сторінка' },
          ],
          caption: {
            uk: 'Артбук «(не)забуті історії тварин», 2026 · друк на папері та кальці · 14,8×14,8',
            en: 'Artbook “(un)forgotten stories of animals”, 2026 · print on paper and tracing paper · 14.8×14.8',
          },
        },
        {
          title: { uk: 'Ескізи до Артбуку', en: 'Sketches for the artbook' },
          grid: 'grid-sketches',
          works: [
            { src: 'assets/img/sketch-02.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-03.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-06.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-08.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-10.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-05.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-04.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-01.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-07.jpg', alt: 'Ескіз' },
            { src: 'assets/img/sketch-09.jpg', alt: 'Ескіз' },
          ],
        },
      ],
    },

    /* ── Серія «Між іншими» ───────────────────────────────────── */
    {
      type: 'gallery',
      title: { uk: 'Серія «Між іншими»', en: 'Series “Among Others”' },
      paragraphs: [
        {
          uk: 'Люди та тварини є частинами однієї екосистеми, ми взаємозалежні, і наша відповідальність стоїть у тому, щоб розуміти ці зв’язки. Кожне втручання людини в життя інших істот має наслідки і для самої людини, і для всього біому; зникнення одного виду порушує систему зв’язку, яка тисячоліттями будувалась, але руйнується з такою швидкістю, що адаптація до змін не встигає трапитися, і це приводить до критичних наслідків. Тому серія має на меті привернути увагу до питань співіснування, зв’язку, відповідальності і впливу.',
          en: 'Humans and animals are parts of one ecosystem; we are interdependent, and our responsibility lies in understanding these connections. Every human intervention in the lives of other beings has consequences both for humans themselves and for the whole biome; the disappearance of a single species disrupts a system of connections built over millennia, yet destroyed at such speed that adaptation cannot keep up — leading to critical consequences. The series aims to draw attention to questions of coexistence, connection, responsibility and impact.',
        },
      ],
      groups: [
        {
          grid: 'grid-2',
          works: [
            {
              src: 'assets/img/mizh-aksolotl.jpg', alt: 'Аксолотль',
              title: { uk: '«Аксолотль», 2025', en: '“Axolotl”, 2025' },
              materials: { uk: 'олія на полотні, нитка · 70×80 см', en: 'oil on canvas, thread · 70×80 cm' },
            },
            {
              src: 'assets/img/mizh-perehuznia.jpg', alt: 'Перегузня',
              title: { uk: '«Перегузня», 2025', en: '“Marbled Polecat”, 2025' },
              materials: { uk: 'олія на полотні, нитка · 70×80 см', en: 'oil on canvas, thread · 70×80 cm' },
            },
          ],
        },
      ],
    },

    /* ── Серія «Історії тих, хто не говорить» ─────────────────── */
    {
      type: 'gallery',
      title: {
        uk: 'Серія «Історії тих, хто не говорить»',
        en: 'Series “Stories of Those Who Do Not Speak”',
      },
      paragraphs: [
        {
          uk: 'Ця серія створена як документація випадків екоциду і історій тварин, що постраждали від війни через російську агресію в Україні. Тварини часто залишаються забутими жертвами, тому я фіксую їх історії, щоб зберегти свідчення і пам’ять про їх життя. Цей проєкт досліджує війну, довкілля та важливість кожного життя.',
          en: 'This series was created as documentation of ecocide and of the stories of animals harmed by the war of russian aggression against Ukraine. Animals often remain the forgotten victims, so I record their stories to preserve testimony and the memory of their lives. The project explores war, the environment and the value of every life.',
        },
      ],
      groups: [
        {
          grid: 'grid-3',
          works: [
            {
              src: 'assets/img/leleka.jpg', alt: 'Лелека',
              title: { uk: '«Лелека», 2025', en: '“Stork”, 2025' },
              materials: { uk: 'олія на полотні · 75×150', en: 'oil on canvas · 75×150' },
            },
            {
              src: 'assets/img/nikudy-tikaty.jpg', alt: 'Нікуди тікати',
              title: { uk: '«Нікуди тікати», 2025', en: '“Nowhere to Run”, 2025' },
              materials: { uk: 'олія на полотні · 75×150', en: 'oil on canvas · 75×150' },
            },
            {
              src: 'assets/img/u-travi-zhyve-vohon.jpg', alt: 'У траві живе вогонь',
              title: { uk: '«У траві живе вогонь», 2025', en: '“Fire Lives in the Grass”, 2025' },
              materials: { uk: 'олія на полотні · 65×150', en: 'oil on canvas · 65×150' },
            },
          ],
        },
      ],
    },

    /* ── Графіка ──────────────────────────────────────────────── */
    {
      type: 'gallery',
      title: { uk: 'Графіка', en: 'Works on paper' },
      groups: [
        {
          grid: 'grid-2',
          works: [
            {
              src: 'assets/img/stayni.jpg', alt: 'Стайні — це що, військовий об’єкт?',
              title: { uk: '«Стайні — це що, військовий об’єкт?», 2024', en: '“Stables — a military object, then?”, 2024' },
              materials: { uk: 'олівець на папері · 20×28 см', en: 'pencil on paper · 20×28 cm' },
            },
            {
              src: 'assets/img/morski-konyky.jpg', alt: 'Морські коники',
              title: { uk: '«Морські коники», 2026', en: '“Seahorses”, 2026' },
              materials: { uk: 'олівець, папір, калька · 13×29', en: 'pencil, paper, tracing paper · 13×29' },
            },
            {
              src: 'assets/img/nezlamnist.jpg', alt: 'Де закінчується незламність і починається безвідповідальність?',
              title: { uk: '«Де закінчується незламність і починається безвідповідальність?», 2026', en: '“Where does resilience end and irresponsibility begin?”, 2026' },
              materials: { uk: 'олівець, папір · 21×29', en: 'pencil, paper · 21×29' },
            },
            {
              src: 'assets/img/lis-zghoriv.jpg', alt: 'Ліс згорів, доля тварин невідома',
              title: { uk: '«Ліс згорів, доля тварин невідома», 2025', en: '“The forest burned down, the fate of the animals is unknown”, 2025' },
              materials: { uk: 'олівець, папір · 21×29', en: 'pencil, paper · 21×29' },
            },
          ],
        },
      ],
    },

    /* ── Серія «Змія» ─────────────────────────────────────────── */
    {
      type: 'gallery',
      title: { uk: 'Серія «Змія»', en: 'Series “Snake”' },
      paragraphs: [
        {
          uk: 'Серія досліджує подібність людини й змії — здатність до оновлення, трансформації, внутрішньої зміни і циклічність. Образ змії стає методом осмислення та опорою для певних періодів життя людини.',
          en: 'The series explores the affinity between the human and the snake — the capacity for renewal, transformation, inner change and cyclicality. The image of the snake becomes a method of reflection and a support for certain periods of a person’s life.',
        },
      ],
      groups: [
        {
          grid: 'grid-2',
          works: [
            {
              src: 'assets/img/zmiya-sam-sobi-zdobych.jpg', alt: 'Сам собі здобич',
              title: { uk: '«Сам собі здобич», 2024', en: '“Prey to Oneself”, 2024' },
              materials: { uk: 'олія на полотні · 120×50 см', en: 'oil on canvas · 120×50 cm' },
            },
            {
              src: 'assets/img/zmiya-shcho-ty-vidchuvaesh.jpg', alt: 'Що ти відчуваєш до змії, коли прожив її життя?',
              title: { uk: '«Що ти відчуваєш до змії, коли прожив її життя?», 2024', en: '“What do you feel towards the snake once you have lived its life?”, 2024' },
              materials: { uk: 'олія на полотні · 100×55 см', en: 'oil on canvas · 100×55 cm' },
            },
          ],
        },
        {
          grid: 'grid-1',
          works: [
            {
              src: 'assets/img/zmiya-nytka.jpg', alt: 'Нитка',
              title: { uk: '«Нитка», 2024', en: '“Thread”, 2024' },
              materials: { uk: 'олія на полотні · 80×20 см', en: 'oil on canvas · 80×20 cm' },
            },
          ],
        },
      ],
    },

    /* ── Серія «Стежки» ───────────────────────────────────────── */
    {
      type: 'gallery',
      title: { uk: 'Серія «Стежки»', en: 'Series “Paths”' },
      paragraphs: [
        {
          uk: 'Серія створена у селі Сокілець, де я прожила певний час і навчалася осмислювати себе через природу та тварин. Зустрічаючи їх, я шукала мінімальні форми взаємодії — поглядом або рухом — щоб встановити контакт і дослідити власні відчуття.',
          en: 'The series was created in the village of Sokilets, where I lived for a time and learned to make sense of myself through nature and animals. Meeting them, I looked for minimal forms of interaction — a glance or a movement — to establish contact and explore my own sensations.',
        },
      ],
      groups: [
        {
          grid: 'grid-1',
          works: [
            {
              src: 'assets/img/lebid.jpg', alt: 'Лебідь',
              title: { uk: '«Лебідь», 2023', en: '“Swan”, 2023' },
              materials: { uk: 'олія на полотні, вугільний олівець · 120×80 см', en: 'oil on canvas, charcoal pencil · 120×80 cm' },
            },
          ],
        },
        {
          grid: 'grid-2',
          works: [
            {
              src: 'assets/img/kazhan.jpg', alt: 'Кажан',
              title: { uk: '«Кажан», 2023', en: '“Bat”, 2023' },
              materials: { uk: 'олія на полотні, вугільний олівець · 80×120 см', en: 'oil on canvas, charcoal pencil · 80×120 cm' },
            },
            {
              src: 'assets/img/zviri.jpg', alt: 'Звірі',
              title: { uk: '«Звірі»', en: '“Beasts”' },
              materials: { uk: 'олія на полотні, вугільний олівець · 125×85 см', en: 'oil on canvas, charcoal pencil · 125×85 cm' },
            },
          ],
        },
      ],
    },

    /* ── Контакти ─────────────────────────────────────────────── */
    {
      type: 'contact',
      title: { uk: 'Контакти', en: 'Contact' },
    },
  ],
};
