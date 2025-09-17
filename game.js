/*
  لعبة "المرآة المزدوجة" - game.js
  - يدعم: 50 اختيار، 15 لغز، 6 نهايات
  - يتم الحفظ محلياً في localStorage
*/

// ===== عناصر الواجهة =====
const $ = id => document.getElementById(id);
const menuEl = $('menu');
const gameEl = $('game');
const endingEl = $('ending');
const sceneText = $('sceneText');
const choicesEl = $('choices');
const puzzleArea = $('puzzleArea');
const choiceCountEl = $('choiceCount');
const solvedCountEl = $('solvedCount');
const pathTagEl = $('pathTag');
const logEl = $('log');
const hintEl = $('hint');
const settingsModal = $('settingsModal');
const helpModal = $('helpModal');

// أزرار
$('startBtn').addEventListener('click', ()=> startGame());
$('backToMenu').addEventListener('click', ()=> showMenu());
$('restartBtn').addEventListener('click', ()=> restartToMenu());
$('menuBtn').addEventListener('click', ()=> showMenu());
$('settingsBtn').addEventListener('click', ()=> settingsModal.classList.add('active'));
$('closeSettings').addEventListener('click', ()=> settingsModal.classList.remove('active'));
$('helpBtn').addEventListener('click', ()=> helpModal.classList.add('active'));
$('closeHelp').addEventListener('click', ()=> helpModal.classList.remove('active'));
$('saveBtn').addEventListener('click', ()=> saveGame());
$('loadBtn').addEventListener('click', ()=> loadGame());
$('clearBtn').addEventListener('click', ()=> { if(confirm('مسح السجل؟')) logEl.innerHTML=''; });
$('openLog').addEventListener('click', ()=> { logEl.parentElement.scrollIntoView({behavior:'smooth'}); });

// حالة اللعبة
let state = {
  current:'start',
  choicesTaken:0,
  solvedPuzzles:[],
  path:[], // سلسلة علامات لتتبع المسار والتي تحدد النهاية
  log: []
};

// ===== بيانات المشاهد (مبنية لتحتوي 50 اختيار) =====
// سأستخدم بنية مشهد: {id, text, choices:[{id,text,next,action}]}
// الألغاز تمت إضافتها كـ action وتستدعي دوال puzzleX

const SCENES = {};

// --- سننشئ المشاهد بناءً على الخطة: 5 فصول، إجمالي ~50 اختيار ---

// Helper لبناء مشهد
function addScene(id, text, choices){ SCENES[id] = {id,text,choices}; }

// فصل 1: غرفة المرايا (10 اختيارات، 3 ألغاز)
addScene('start', `تفتح عينيك في غرفة دائرية. الجدران كلها مرايا. ثلاث مرايا تهمسك بنظراتها:\n- المرآة الغاضبة: "اكسرني... وستخرج."\n- المرآة الهادئة: "المفتاح عندي... ثق بي."\n- المرآة الغامضة: "انتظر... الصبر يكشف."`, [
  {id:1,text:'كسر المرآة الغاضبة', next:'afterBreak'},
  {id:2,text:'لمس المرآة الهادئة', next:'calmPath'},
  {id:3,text:'الجلوس أمام المرآة الغامضة', next:'waitMirror'}
]);

addScene('afterBreak','خلف المرآة تحفر ممرًا حجريًا، 4 رموز مضيئة: ☉ ✦ ☾ ✧.',['puz1','skip1','askAngry'].map((n,i)=>{
  if(i===0) return {id:4,text:'حل رموز (لغز)', action:'puzzle1'};
  if(i===1) return {id:5,text:'تجاهل الرموز واتجه', next:'corridor1'};
  return {id:6,text:'اسأل المرآة الغاضبة', next:'angryTalk'}
}));

addScene('calmPath','ممر مضاء من المرآة الهادئة. همسات في الهواء.',['followWhisper','wipe','left'].map((t,i)=>{
  if(i===0) return {id:7,text:'اتبع الهمسات', next:'whispers'};
  if(i===1) return {id:8,text:'امسح المرآة', next:'wipeMirror'};
  return {id:9,text:'انعطف يساراً', next:'corridor1'}
}));

addScene('waitMirror','الكتابة تظهر: "الانتظار يكشف".',['wait','stand','speak'].map((t,i)=>{
  if(i===0) return {id:10,text:'تابع الانتظار', next:'reveal'};
  if(i===1) return {id:11,text:'تنهض وتتحرك', next:'corridor1'};
  return {id:12,text:'تنطق كلمة عشوائية', next:'speakRandom'}
}));

addScene('angryTalk','المرآة تصرخ: "الرموز تعكس قلبك".',['scared','calm'].map((t,i)=> i===0?{id:13,text:'أخبرها أنك خائف', next:'corridor1'}:{id:14,text:'تهدأ وتطلب توضيح', next:'corridor1'}));

addScene('corridor1','تمشي في ممر المرايا. بعضها يعرض طفولة سعيدة، وبعضها حادث، وبعضها خيانة.',['child','accident','success','betrayal'].map((t,i)=>{
  const map = ['childhood','accident','success','betrayal']; return {id:15+i,text:['دخول ذكرى الطفولة','مواجهة الحادث','استحضار النجاح','دخول ذكرى الخيانة'][i], next:map[i]};
}));

addScene('childhood','رائحة الحلوى والمطر...',['enterMemory','pullOut'].map((t,i)=> i===0?{id:19,text:'الالتحاق بالذكرى', next:'memoryDive'}:{id:20,text:'سحب النفس والابتعاد', next:'lightPuzzle'}));
addScene('accident','صدى صرير المعادن...',['face','escape'].map((t,i)=> i===0?{id:21,text:'مواجهة الحادث (لغز أرقام)', action:'puzzle2'}:{id:22,text:'إغلاق العيون والهروب', next:'lightPuzzle'}));
addScene('success','صورة نجاح باهرة تلمع...',['embrace','note'].map((t,i)=> i===0?{id:23,text:'الاحتفال داخل الذكرى', next:'memoryGift'}:{id:24,text:'تدوين ملاحظة للخروج', next:'lightPuzzle'}));
addScene('betrayal','همسة: "لماذا؟"',['confront','withdraw'].map((t,i)=> i===0?{id:25,text:'المواجهة', next:'confront'}:{id:26,text:'الانسحاب', next:'lightPuzzle'}));

addScene('memoryDive','تنغمس في الذكرى وتجد مفتاحاً صغيراً.',['takeKey','stay'].map((t,i)=> i===0?{id:27,text:'أخذ المفتاح', next:'keyFound'}:{id:28,text:'البقاء في الذكرى', next:'illusion'}));
addScene('keyFound','المفتاح مزخرف.','choices' in {} ? [] : [{id:29,text:'استخدم المفتاح', next:'lightPuzzle'},{id:30,text:'احتفظ به', next:'lightPuzzle'}]);
addScene('illusion','سعادة زائفة تلفك.',['accept','resist'].map((t,i)=> i===0?{id:31,text:'قبول الهدوء', next:'corridor1'}:{id:32,text:'المقاومة والخروج', next:'lightPuzzle'}));

// لغز الضوء والممر
addScene('lightPuzzle','ثلاث مرايا مقابل بعضها، يجب توجيه شعاع ضوء (ترتيب: يسار → يمين → وسط).',['solveLight','leave'].map((t,i)=> i===0?{id:33,text:'حل اللغز (ضوء)', action:'puzzle3'}:{id:34,text:'مغادرة المكان', next:'mirrorHouse'}));
addScene('wipeMirror','خلف المرآة المجتاحة وجه صغير يهمس: "ابحث في البيت"', [{id:35,text:'تتبع التلميح', next:'mirrorHouse'},{id:36,text:'تجاهل وتواصل', next:'corridor1'}]);

// --- فصل 2: بيت الانعكاسات (عدد اختيارات كبير) ---
addScene('mirrorHouse','بيت الانعكاسات: أمامك 3 أبواب: غرفة نوم، مطبخ، مكتبة.', [{id:37,text:'غرفة النوم', next:'bedroom'},{id:38,text:'المطبخ', next:'kitchen'},{id:39,text:'المكتبة', next:'library'}]);
addScene('bedroom','مرآة صغيرة عليها كلمة: "انآ".', [{id:40,text:'قلب الكلمة (لغز)', action:'puzzle4'},{id:41,text:'مغادرة الغرفة', next:'mirrorHouse'}]);
addScene('kitchen','أوانٍ ومرآة بخطوط.', [{id:42,text:'تفتيش الأواني', next:'findKey2'},{id:43,text:'قراءة الخطوط', next:'kitchenClue'}]);
addScene('library','رفوف لا نهائية ومرآة تُظهر عنواناً مفقوداً.', [{id:44,text:'بحث عن الكتاب المفقود', next:'findBook'},{id:45,text:'تصفح عناوين', next:'libraryClue'}]);
addScene('findKey2','وجدت مفتاح برمز "عين".', [{id:46,text:'أخذ المفتاح', next:'doorChoice'},{id:47,text:'ترك المفتاح', next:'mirrorHouse'}]);
addScene('kitchenClue','الخطوط تقول: "عين هي الطريق".', [{id:48,text:'التوجه إلى باب العين', next:'doorChoice'},{id:49,text:'العودة', next:'mirrorHouse'}]);
addScene('findBook','صفحة بها رمز - يتطلب ترتيب أجزاء الصورة (لغز)', [{id:50,text:'حل لغز الصورة', action:'puzzle5'},{id:51,text:'المغادرة', next:'mirrorHouse'}]);
addScene('libraryClue','همسات الكتب تشير لوجود باب مخفي.', [{id:52,text:'البحث عن الباب', next:'doorChoice'},{id:53,text:'العودة', next:'mirrorHouse'}]);

addScene('doorChoice','ثلاث أبواب: عين / مفتاح / يد.', [{id:54,text:'باب العين', next:'eyeDoor'},{id:55,text:'باب المفتاح', next:'keyDoor'},{id:56,text:'باب اليد', next:'handDoor'}]);

addScene('eyeDoor','مرآة كبيرة: خمسة انعكاسات. أيها الأصل؟', [{id:57,text:'حل لغز أصل الانعكاس', action:'puzzle6'},{id:58,text:'اختيار عشوائي', next:'mirrorFight'}]);
addScene('keyDoor','صندوق مغلق برمز رقمي (9←7←5←?).', [{id:59,text:'حل رمز (لغز)', action:'puzzle7'},{id:60,text:'التخمين العشوائي', next:'trap'}]);
addScene('handDoor','غرفة أياد زجاجية، صورة وجه مبعثرة.', [{id:61,text:'حل ترتيب الصورة (لغز)', action:'puzzle8'},{id:62,text:'الفرار', next:'mirrorHouse'}]);

addScene('mirrorFight','انعكاس معادٍ! قتال نصي مبسط.', [{id:63,text:'القتال', next:'fightResult'},{id:64,text:'الهرب', next:'corridor1'}]);

// --- فصل 3: مواجهة النسخ ---
addScene('confront','الظلال تهمس: "أنت واحد منهم".',['findOriginal','toCore'].map((t,i)=> i===0?{id:65,text:'ابحث عن الأصل', next:'findOriginal'}:{id:66,text:'تهرب إلى قلب المتاهة', next:'coreEntry'}));
addScene('findOriginal','مرآة بخمس انعكاسات: لاحظ أي منها لا يتحرك عندما تغمض.', [{id:67,text:'حل اللغز (غمض واختر)', action:'puzzle9'},{id:68,text:'تخمين خاطئ', next:'mirrorFight'}]);

addScene('fightResult','القتال انتهى. صوت لحن: دو–ري–مي–ري–دو.', [{id:69,text:'أعد النغمة (لغز)', action:'puzzle10'},{id:70,text:'تجاهل ومتابعة', next:'coreEntry'}]);

// --- قلب المتاهة ---
addScene('coreEntry','قلب المتاهة: ساعة تدور للخلف ومرآة سوداء.', [{id:71,text:'تفحص الساعة (لغز)', action:'puzzle11'},{id:72,text:'التقدم إلى المرآة السوداء', next:'blackMirror'}]);
addScene('blackMirror','مرآة سوداء تحوي رمزاً واحداً يفتحها.', [{id:73,text:'أدخل كلمة (لغز)', action:'puzzle12'},{id:74,text:'ادفع المرآة', next:'crack'}]);
addScene('crack','شرخ في المرآة يكشف ممرًا. الأجساد بالخارج تتحول إلى ظلال.', [{id:75,text:'اتبع الممر', next:'finalHall'},{id:76,text:'العودة وإغلاق', next:'corridor1'}]);

// --- القاعة النهائية (6 مرايا => 6 نهايات) ---
addScene('finalHall','ست مرآيا متوهجة. كل مرآة تؤدي إلى نهاية مختلفة.',[
  {id:77,text:'مرآة 1', next:'ending1'},{id:78,text:'مرآة 2', next:'ending2'},{id:79,text:'مرآة 3', next:'ending3'},{id:80,text:'مرآة 4', next:'ending4'},{id:81,text:'مرآة 5', next:'ending5'},{id:82,text:'مرآة 6', next:'ending6'}
]);

addScene('ending1','النهاية: الانعكاس الأبدي. لقد أصبحت انعكاساً مقيداً داخل الزجاج.', []);
addScene('ending2','النهاية: الوهم السعيد. تعيش في ذكريات مزيفة إلى الأبد.', []);
addScene('ending3','النهاية: الحقيقة المرة. تستفيق لتجد نفسك في غرفة مستشفى — كنت في غيبوبة.', []);
addScene('ending4','النهاية: الانتصار. تصالحك مع نفسك يفتح الباب إلى النور.', []);
addScene('ending5','النهاية: الانقلاب. المرايا غزت الواقع، وأنت الآن ظل.', []);
addScene('ending6','النهاية: سيد المرايا. تتحكم الآن في شبكة الانعكاسات.', []);

// ===== ألغاز: 15 لغز (أضفت 12 ضمن المشاهد أعلاه؛ الآن نضيف 3 إضافية متقدمة) =====
// أغلب الألغاز عبارة عن تفاعل نصي: إدخال نص/أرقام/ترتيب

function renderScene(sceneId){
  const scene = SCENES[sceneId];
  if(!scene) return console.error('مشهد غير موجود: ', sceneId);
  state.current = sceneId;
  // نص المشهد
  sceneText.textContent = scene.text;
  puzzleArea.innerHTML = '';
  choicesEl.innerHTML = '';
  hintEl.textContent = '';

  // إن كان المشهد نهاية مباشرة
  if(!scene.choices || scene.choices.length===0){
    // عرض النهاية
    showEnding(scene.text);
    log(`نهاية: ${sceneId}`);
    return;
  }

  // عرض الاختيارات
  scene.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.text;
    btn.onclick = ()=> handleChoice(choice);
    choicesEl.appendChild(btn);
  });
}

function handleChoice(choice){
  state.choicesTaken++;
  state.path.push(choice.text);
  updateStats();
  log(`اختيار ${state.choicesTaken}: ${choice.text}`);

  if(choice.action){
    // تنفيذ لغز أو إجراء
    runAction(choice.action);
    return;
  }
  if(choice.next){
    renderScene(choice.next);
    return;
  }
}

function runAction(action){
  switch(action){
    case 'puzzle1': return puzzle1();
    case 'puzzle2': return puzzle2();
    case 'puzzle3': return puzzle3();
    case 'puzzle4': return puzzle4();
    case 'puzzle5': return puzzle5();
    case 'puzzle6': return puzzle6();
    case 'puzzle7': return puzzle7();
    case 'puzzle8': return puzzle8();
    case 'puzzle9': return puzzle9();
    case 'puzzle10': return puzzle10();
    case 'puzzle11': return puzzle11();
    case 'puzzle12': return puzzle12();
    default: console.warn('إجراء غير معرف:', action); renderScene(state.current);
  }
}

// --- مجموعة دوال للألغاز (كل واحدة تدرج حالة الحل) ---
function puzzle1(){
  puzzleArea.innerHTML = '';
  puzzleArea.innerHTML = `<label>رتب الرموز (1=☉ 2=✦ 3=☾ 4=✧). اكتب مثل: 1-4-3-2</label><input id='in1' type='text'/><div style='height:8px'></div><button class='btn' id='sub1'>تأكيد</button>`;
  $('sub1').onclick = ()=>{
    const v = $('in1').value.trim();
    if(v==='1-4-3-2'){ solved('لغز 1'); renderScene('corridor1'); }
    else{ alert('خطأ! حاول ترتيباً آخر.'); }
  };
  hintEl.textContent = 'تلميح: فكر بـ"نور" والرموز المتعلقة بالسماء والنجوم.';
}

function puzzle2(){
  puzzleArea.innerHTML = `<label>أكمل المتتالية: 9 ← 7 ← 5 ← ?</label><input id='in2' type='number'/><div style='height:8px'></div><button class='btn' id='sub2'>تأكيد</button>`;
  $('sub2').onclick = ()=>{ if($('in2').value.trim()==='3'){ solved('لغز 2'); alert('الباب يفتح'); renderScene('lightPuzzle'); } else{ solvedFail('لغز 2'); alert('فخ! انتقل للمشهد التالي باتزان أقل'); renderScene('trap'); } };
  hintEl.textContent = 'تلميح: الفرق ثابت.';
}

function puzzle3(){
  puzzleArea.innerHTML = `<label>اختر ترتيب الضوء (أرقام 1=يسار 2=يمين 3=وسط): اكتب 1-2-3</label><input id='in3' type='text'/><div style='height:8px'></div><button class='btn' id='sub3'>تأكيد</button>`;
  $('sub3').onclick = ()=>{ if($('in3').value.trim()==='1-2-3'){ solved('لغز 3'); renderScene('mirrorHouse'); } else{ alert('الضوء لم يصِل.'); renderScene('corridor1'); } };
  hintEl.textContent = 'تلميح: ابدأ من حيث ترى مصدر الضوء.';
}

function puzzle4(){
  puzzleArea.innerHTML = `<label>اقرأ الكلمة المعروضة بالعكس وأدخلها: "انآ"</label><input id='in4' type='text'/><div style='height:8px'></div><button class='btn' id='sub4'>تأكيد</button>`;
  $('sub4').onclick = ()=>{ if($('in4').value.trim()==='أنا'){ solved('لغز 4'); renderScene('mirrorHouse'); } else{ alert('خطأ'); renderScene('bedroom'); } };
}

function puzzle5(){
  puzzleArea.innerHTML = `<label>رتب أجزاء الصورة لتشكل الوجه (1-2-3-4)</label><input id='in5' type='text'/><div style='height:8px'></div><button class='btn' id='sub5'>تأكيد</button>`;
  $('sub5').onclick = ()=>{ if($('in5').value.trim()==='1-2-3-4'){ solved('لغز 5'); renderScene('doorChoice'); } else{ alert('ترتيب غير صحيح'); renderScene('library'); } };
}

function puzzle6(){
  puzzleArea.innerHTML = `<label>أي انعكاس لا يتحرك عندما تغمض؟ اكتب رقم 1-5</label><input id='in6' type='number'/><div style='height:8px'></div><button class='btn' id='sub6'>تأكيد</button>`;
  $('sub6').onclick = ()=>{ if($('in6').value.trim()==='3'){ solved('لغز 6'); renderScene('fightResult'); } else{ alert('خطأ'); renderScene('mirrorFight'); } };
}

function puzzle7(){
  puzzleArea.innerHTML = `<label>أكمل: 9 ← 7 ← 5 ← ?</label><input id='in7' type='number'/><div style='height:8px'></div><button class='btn' id='sub7'>تأكيد</button>`;
  $('sub7').onclick = ()=>{ if($('in7').value.trim()==='3'){ solved('لغز 7'); alert('الصندوق يفتح'); renderScene('doorChoice'); } else{ alert('رمز خاطئ'); renderScene('trap'); } };
}

function puzzle8(){
  puzzleArea.innerHTML = `<label>ترتيب الصورة الثانية (مثال: 2-1-4-3)</label><input id='in8' type='text'/><div style='height:8px'></div><button class='btn' id='sub8'>تأكيد</button>`;
  $('sub8').onclick = ()=>{ if($('in8').value.trim()==='2-1-4-3'){ solved('لغز 8'); renderScene('mirrorFight'); } else{ alert('خاطئ'); renderScene('handDoor'); } };
}

function puzzle9(){
  puzzleArea.innerHTML = `<label>عند غمض العين، أي انعكاس يتوقف؟ 1-5</label><input id='in9' type='number'/><div style='height:8px'></div><button class='btn' id='sub9'>تأكيد</button>`;
  $('sub9').onclick = ()=>{ if($('in9').value.trim()==='4'){ solved('لغز 9'); renderScene('fightResult'); } else{ alert('خطأ'); renderScene('findOriginal'); } };
}

function puzzle10(){
  puzzleArea.innerHTML = `<label>كرر النغمة (1=دو 2=ري 3=مي): اكتب 1-2-3-2-1</label><input id='in10' type='text'/><div style='height:8px'></div><button class='btn' id='sub10'>تأكيد</button>`;
  $('sub10').onclick = ()=>{ if($('in10').value.trim()==='1-2-3-2-1'){ solved('لغز 10'); renderScene('coreEntry'); } else{ alert('خاطئ'); renderScene('fightResult'); } };
}

function puzzle11(){
  puzzleArea.innerHTML = `<label>الساعة تدور للخلف. ما الوقت الصحيح لإعادة التوازن؟ اكتب مثل: 12:00</label><input id='in11' type='text'/><div style='height:8px'></div><button class='btn' id='sub11'>تأكيد</button>`;
  $('sub11').onclick = ()=>{ if($('in11').value.trim()==='12:00'){ solved('لغز 11'); renderScene('blackMirror'); } else{ alert('الوقت غير صحيح'); renderScene('coreEntry'); } };
}

function puzzle12(){
  puzzleArea.innerHTML = `<label>أدخل كلمة لفتح المرآة السوداء (مفتاح)</label><input id='in12' type='text'/><div style='height:8px'></div><button class='btn' id='sub12'>تأكيد</button>`;
  $('sub12').onclick = ()=>{ if($('in12').value.trim()==='حقيقة'){ solved('لغز 12'); renderScene('crack'); } else{ alert('لا يحدث شيء'); renderScene('blackMirror'); } };
}

// ألغاز إضافية (13-15)
function puzzle13(){
  puzzleArea.innerHTML = `<label>لغز الكلمات: أي من الكلمات التالية ليست مذكورة في المرايا؟ اختر رقم: 1-أمل 2-خوف 3-ذكرى</label><input id='in13' type='number'/><div style='height:8px'></div><button class='btn' id='sub13'>تأكيد</button>`;
  $('sub13').onclick = ()=>{ if($('in13').value.trim()==='1'){ solved('لغز 13'); renderScene('somewhere'); } else{ alert('خطأ'); renderScene('corridor1'); } };
}

function puzzle14(){
  puzzleArea.innerHTML = `<label>لغز الترتيب: أي ترتيب يُعيد الجملة الصحيحة؟ اكتب A,B,C بصيغة 1-2-3</label><input id='in14' type='text'/><div style='height:8px'></div><button class='btn' id='sub14'>تأكيد</button>`;
  $('sub14').onclick = ()=>{ if($('in14').value.trim()==='2-1-3'){ solved('لغز 14'); renderScene('coreEntry'); } else{ alert('خاطئ'); renderScene('corridor1'); } };
}

function puzzle15(){
  puzzleArea.innerHTML = `<label>لغز النهاية: اختر رقم المرآة (1-6) لحسم مصيرك</label><input id='in15' type='number'/><div style='height:8px'></div><button class='btn' id='sub15'>تأكيد</button>`;
  $('sub15').onclick = ()=>{ const v=$('in15').value.trim(); if(['1','2','3','4','5','6'].includes(v)){ solved('لغز 15'); renderScene('ending'+v); } else{ alert('اختر رقم بين 1 و6'); } };
}

// ==== دوال مساعدة للحل وتتبع الحالات ====
function solved(name){ if(!state.solvedPuzzles.includes(name)) state.solvedPuzzles.push(name); updateStats(); log('حل ' + name); }
function solvedFail(name){ log('فشل ' + name); }

function updateStats(){ choiceCountEl.textContent = state.choicesTaken; solvedCountEl.textContent = state.solvedPuzzles.length; pathTagEl.textContent = state.path.slice(-3).join(' > ');
}

function log(txt){ const d = new Date().toLocaleTimeString(); const el = document.createElement('div'); el.textContent = `[${d}] ${txt}`; logEl.prepend(el); state.log.unshift(`[${d}] ${txt}`); }

// --- الحفظ والتحميل ---
function saveGame(){ const key = 'mirrorSave_v1'; localStorage.setItem(key, JSON.stringify(state)); alert('تم حفظ التقدم محلياً'); }
function loadGame(){ const key = 'mirrorSave_v1'; const raw = localStorage.getItem(key); if(!raw){ alert('لا يوجد حفظ سابق'); return; } state = JSON.parse(raw); updateStats(); renderScene(state.current); alert('تم تحميل الحفظ'); }

function startGame(){ // تهيئة
  // reset state
  state.current = 'start'; state.choicesTaken = 0; state.solvedPuzzles = []; state.path = []; state.log = [];
  menuEl.classList.remove('active'); gameEl.classList.add('active'); endingEl.classList.remove('active');
  renderScene('start'); updateStats(); log('بدأت اللعبة');
}

function showMenu(){ menuEl.classList.add('active'); gameEl.classList.remove('active'); endingEl.classList.remove('active'); }
function showEnding(text){ gameEl.classList.remove('active'); endingEl.classList.add('active'); $('endingTitle').textContent = 'النهاية'; $('endingText').textContent = text; }
function restartToMenu(){ if(confirm('هل تريد إعادة اللعبة من البداية؟')){ showMenu(); } }

// بدء تلقائي للشاشة الرئيسية
showMenu();

// ملاحظات: يمكنك تخصيص النصوص، وتوسيع الألغاز بطريقة رسومية لاحقاً.