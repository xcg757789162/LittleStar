-- ============================================================
-- 05-seed-activities.sql — 亲子活动 + TPR 指令种子数据
-- ============================================================

-- ============================================================
-- 1. parent_activities — 15 条英语亲子活动
-- ============================================================

INSERT INTO api.parent_activities (id, related_node_ids, task_description, parent_guide, guidance_card, offline_extension, type, estimated_minutes, subject) VALUES
('pa-letter-find-home', '["english-letter-a", "english-letter-b", "english-letter-c"]', '和爸爸妈妈一起，找找家里以 A 开头的东西！Apple、Ant...你能找到几个？', '引导孩子在家中寻找以特定字母开头的物品，用英语说出名称。可以从 A 开始，每次换一个字母。', '🏠 字母寻宝游戏：和孩子一起在家中找以某个字母开头的物品，鼓励孩子用英语说出来。', '出门散步时，也可以玩这个游戏！看看路上有什么以今天学的字母开头的东西。', 'find', 5, 'english'),
('pa-letter-sky-write', '["eng-alphabet-a", "eng-alphabet-b", "eng-alphabet-c"]', '用手指在空中写字母！A-B-C，写得越大越好！', '和孩子一起用手指在空中书写字母，可以边写边念。尝试大写和小写，让孩子感受字母的形状。', '✍️ 空中写字：和孩子面对面，一起用手指在空中写字母，边写边念出字母名称。', '洗澡时可以在雾气玻璃上写字母，或者用水在地面上画字母，让学习融入日常。', 'play', 3, 'english'),
('pa-letter-body-shape', '["eng-alphabet-a", "eng-alphabet-b", "eng-alphabet-c"]', '用身体变成字母的样子！可以变成 T 吗？试试看！', '和孩子一起用身体摆出字母的形状，如 T（双臂平举）、L（一只手贴身体一只手伸出）。', '🤸 身体字母：和孩子一起用身体摆出字母形状，拍照记录，看看谁摆得更像！', '可以和家人一起合作摆出更复杂的字母，比如 H 需要两个人配合。拍照做成字母墙！', 'play', 5, 'english'),
('pa-song-abc', '["eng-song-abc", "eng-alphabet-a"]', '和爸爸妈妈一起唱 ABC 歌！Come on, let''s sing together! 🎵', '播放 ABC 歌，和孩子一起唱。可以加上手指指向对应的字母卡片，或者边唱边做动作。', '🎵 一起唱歌：播放 ABC 歌，和孩子一起大声唱出来。可以拍手打节奏。', '在车上、走路时都可以哼唱 ABC 歌。试试倒着唱 ZYX... 锻炼反应力！', 'sing', 3, 'english'),
('pa-song-twinkle', '["eng-song-twinkle"]', '和爸爸妈妈一起唱 Twinkle Twinkle Little Star！做星星闪闪的动作！⭐', '唱 "Twinkle Twinkle Little Star" 时，教孩子用双手做闪闪发光的动作（手指张开合上）。', '⭐ 星星歌：和孩子一起唱这首经典儿歌，边唱边用手做星星闪烁的动作。', '晚上看星星时唱这首歌，让孩子感受歌词的含义。问问孩子 "How many stars can you see?"', 'sing', 3, 'english'),
('pa-song-head-shoulders', '["english-song-head-shoulders", "english-tpr-body", "english-tpr-touch"]', '和爸爸妈妈一起唱 Head, Shoulders, Knees and Toes！摸到正确的位置！', '唱 "Head, Shoulders, Knees and Toes" 时做相应动作，逐渐加快速度，增加趣味性。', '🏃 身体歌：边唱边做动作，每唱到一个身体部位就摸一下。可以越唱越快！', '换成其他身体部位编新歌词，如 "Eyes, ears, mouth and nose"，创造属于你们的版本！', 'sing', 5, 'english'),
('pa-talk-greet-family', '["eng-greet-hello", "eng-greet-goodbye"]', '用英语和家人打招呼！Good morning, Daddy! Hello, Mommy! 💗', '鼓励孩子每天起床时用英语问候家人。提供固定句式："Good morning, [name]!" "Good night!"', '👋 英语问候：养成每天用英语打招呼的习惯，从简单的 Hello/Good morning 开始。', '设立"英语时间"，每天晚餐前5分钟全家只用英语交流简单问候和感谢。', 'talk', 2, 'english'),
('pa-talk-room-colors', '["english-colors"]', '看看房间里有什么颜色？用英语说出来！Red chair! Blue book!', '指着房间里的物品，引导孩子用 "颜色 + 物品" 的方式说英语，如 "Red apple", "Blue cup"。', '🎨 颜色描述：在家指着物品，让孩子说出颜色。"What color is this?" "It''s red!"', '出门时也玩颜色游戏："I see something blue!" 让孩子猜是什么。', 'talk', 5, 'english'),
('pa-talk-whats-this', '["english-dialogue-food", "english-dialogue-shopping"]', '指着东西问：What''s this? 然后大声说出来！This is a cup!', '用 "What''s this?" 和 "This is a ___" 的句式，让孩子练习日常物品的英语说法。', '🤔 What''s this 游戏：指着家里常见物品互相提问，练习 "What''s this? This is a ___."', '每天选3个新物品教孩子英语说法，一周下来就能学21个新词！', 'talk', 5, 'english'),
('pa-number-count-fruits', '["english-numbers", "english-fruits"]', '数一数家里有几个苹果？One, two, three... 用英语数！🍎', '让孩子数家里的水果、玩具等实物，用英语从 1 数到 10。每数一个就用手指点一下。', '🔢 英语数数：让孩子数家里的物品（水果、玩具），用英语说出数字。', '去超市时让孩子帮忙数水果："Please count the apples. How many apples?"', 'find', 3, 'english'),
('pa-number-count-shoes', '["english-numbers"]', '数数家里有几只鞋子？Two shoes make a pair! 👟', '整理鞋子时让孩子数数，引入 "pair" 的概念。"One pair, two pairs..."', '👟 数鞋子：整理鞋架时让孩子用英语数鞋子，学习 pair（一双）的概念。', '数袜子、手套等成对物品，强化 "pair" 的概念。问 "How many pairs?"', 'find', 3, 'english'),
('pa-mix-color-sort', '["english-colors"]', '颜色分类游戏！把玩具按颜色分一分，用英语说：Red group! Blue group!', '准备不同颜色的物品（积木、蜡笔、玩具），让孩子按颜色分类，边分边用英语说颜色。', '🧩 颜色分类：用家中物品（积木、蜡笔等）按颜色分类，练习颜色词汇。', '洗衣服时让孩子帮忙按颜色分类，"Put the red clothes here, blue clothes there!"', 'play', 5, 'english'),
('pa-mix-spot-difference', '["english-colors", "english-animals"]', '英语版找不同！看两幅图，找出不同的地方，用英语说出来！🔍', '准备两张相似但有差异的图片，让孩子找不同并用简单英语描述："This one has a cat!"', '🔍 找不同：准备简单的找不同图片，让孩子用英语描述差异。', '在绘本里也可以玩找不同："Can you find the difference between these two pages?"', 'play', 5, 'english'),
('pa-mix-draw-animal', '["english-animals"]', '画一只你最喜欢的动物，然后用英语告诉爸爸妈妈它是什么！🎨', '让孩子画一只动物，然后用英语说 "This is a [animal]." 可以描述颜色和大小。', '🎨 画动物：让孩子画喜欢的动物，用英语说出名称和特征 "It''s a big cat!"', '去动物园或看动物纪录片时，让孩子用英语说出看到的动物名称。', 'draw', 10, 'english'),
('pa-mix-simon-says', '["eng-body-head", "eng-body-hand", "eng-action-jump"]', '和爸爸妈妈一起玩 Simon Says 游戏！Simon says touch your nose! 👃', '玩 "Simon Says" 游戏：只有说 "Simon says..." 开头的指令才需要做，锻炼英语听力。', '🎮 Simon Says：经典英语指令游戏，锻炼听力和反应。只有 "Simon says" 开头的才做！', '让孩子当 "Simon" 发号施令，练习说英语指令。全家一起玩更有趣！', 'play', 5, 'english');

-- ============================================================
-- 2. tpr_instructions — 20 条 TPR 全身反应指令
-- ============================================================

INSERT INTO api.tpr_instructions (id, command, translation, action, emoji, difficulty, category, animation_type) VALUES
-- 身体动作
('tpr-stand-up', 'Stand up!', '站起来！', '从座位上站起来', '🧍', 1, 'body', 'up'),
('tpr-sit-down', 'Sit down!', '坐下！', '坐回座位', '🪑', 1, 'body', 'down'),
('tpr-clap-hands', 'Clap your hands!', '拍拍手！', '双手拍在一起', '👏', 1, 'body', 'clap'),
('tpr-stomp-feet', 'Stomp your feet!', '跺跺脚！', '用脚使劲跺地板', '🦶', 1, 'body', NULL),
('tpr-raise-hand', 'Raise your hand!', '举手！', '把手举高', '🙋', 1, 'body', 'up'),
-- 运动动作
('tpr-jump', 'Jump!', '跳！', '向上跳一下', '🦘', 1, 'move', 'jump'),
('tpr-turn-around', 'Turn around!', '转一圈！', '原地转一圈', '🔄', 1, 'move', 'turn'),
('tpr-walk', 'Walk!', '走！', '在原地踏步走', '🚶', 1, 'move', NULL),
('tpr-run', 'Run in place!', '原地跑！', '在原地快速跑步', '🏃', 2, 'move', NULL),
('tpr-spin', 'Spin around!', '转圈圈！', '快速转几圈', '💫', 2, 'move', 'turn'),
-- 面部表情
('tpr-smile', 'Smile!', '笑一笑！', '露出微笑', '😊', 1, 'face', NULL),
('tpr-open-mouth', 'Open your mouth!', '张嘴！', '把嘴巴张开', '😮', 1, 'face', NULL),
('tpr-close-eyes', 'Close your eyes!', '闭上眼睛！', '闭上双眼', '😌', 1, 'face', NULL),
('tpr-blink', 'Blink your eyes!', '眨眨眼！', '快速眨眼', '😉', 2, 'face', NULL),
('tpr-make-face', 'Make a funny face!', '做鬼脸！', '做一个搞笑的表情', '🤪', 2, 'face', NULL),
-- 指向物体
('tpr-touch-head', 'Touch your head!', '摸摸头！', '用手摸自己的头', '🤯', 1, 'object', 'touch'),
('tpr-touch-nose', 'Touch your nose!', '摸摸鼻子！', '用手指碰鼻子', '👃', 1, 'object', 'touch'),
('tpr-touch-ears', 'Touch your ears!', '摸摸耳朵！', '用手摸自己的耳朵', '👂', 1, 'object', 'touch'),
('tpr-point-up', 'Point up!', '指向上面！', '用手指指向天花板', '☝️', 2, 'object', 'up'),
('tpr-wave', 'Wave your hands!', '挥挥手！', '举手左右挥动', '👋', 1, 'object', 'wave');

-- ============================================================
-- 3. TPR 知识点 — INSERT 到 knowledge_nodes 表
-- ============================================================

INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index) VALUES
('english-tpr-body', 'english', 'TPR 身体动作指令', '听懂并做出身体动作指令：Stand up, Sit down, Clap your hands, Stomp your feet', '[]', '["english-tpr-move"]', 1, 'voice', 301),
('english-tpr-move', 'english', 'TPR 运动指令', '听懂并做出运动指令：Jump, Turn around, Walk, Run', '["english-tpr-body"]', '["english-tpr-face"]', 1, 'voice', 302),
('english-tpr-face', 'english', 'TPR 表情指令', '听懂并做出表情指令：Smile, Open your mouth, Close your eyes, Blink', '["english-tpr-body"]', '["english-tpr-touch"]', 1, 'voice', 303),
('english-tpr-touch', 'english', 'TPR 触摸指令', '听懂并做出触摸指令：Touch your head, Touch your nose, Point up, Wave', '["english-tpr-face"]', '[]', 2, 'voice', 304);

-- ============================================================
-- 4. TPR 题目 — INSERT 到 questions 表
-- ============================================================

INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
-- 身体动作
('en-tpr-body-001', 'english-tpr-body', 'voice', '{"text": "🧍 听指令做动作！Stand up! 站起来！", "hint": "快快站起来！然后说 \"I can stand up!\""}', '"Stand up"', 1, FALSE),
('en-tpr-body-002', 'english-tpr-body', 'multiple-choice', '{"text": "老师说 \"Clap your hands!\"，你应该做什么？👏", "options": [{"id": "a", "text": "跺跺脚", "isCorrect": false}, {"id": "b", "text": "拍拍手", "isCorrect": true}, {"id": "c", "text": "摇摇头", "isCorrect": false}]}', '"b"', 1, FALSE),
('en-tpr-body-003', 'english-tpr-body', 'multiple-choice', '{"text": "你想让朋友坐下来，应该说？🪑", "options": [{"id": "a", "text": "Stand up!", "isCorrect": false}, {"id": "b", "text": "Jump!", "isCorrect": false}, {"id": "c", "text": "Sit down!", "isCorrect": true}]}', '"c"', 1, FALSE),
-- 运动指令
('en-tpr-move-001', 'english-tpr-move', 'voice', '{"text": "🦘 Jump! Jump! Jump! 跳三下！", "hint": "蹦蹦蹦！说 \"I can jump!\""}', '"Jump"', 1, FALSE),
('en-tpr-move-002', 'english-tpr-move', 'multiple-choice', '{"text": "\"Turn around\" 是什么意思？🔄", "options": [{"id": "a", "text": "跳起来", "isCorrect": false}, {"id": "b", "text": "转一圈", "isCorrect": true}, {"id": "c", "text": "坐下来", "isCorrect": false}]}', '"b"', 1, FALSE),
('en-tpr-move-003', 'english-tpr-move', 'multiple-choice', '{"text": "小兔子🐰最喜欢做什么动作？", "options": [{"id": "a", "text": "Jump! 跳跳跳！", "isCorrect": true}, {"id": "b", "text": "Sit down! 坐下！", "isCorrect": false}, {"id": "c", "text": "Sleep! 睡觉！", "isCorrect": false}]}', '"a"', 1, FALSE),
-- 表情指令
('en-tpr-face-001', 'english-tpr-face', 'voice', '{"text": "😊 Smile! 笑一笑！给我看看你最灿烂的笑容！", "hint": "露出大大的笑容！说 \"I am happy!\""}', '"Smile"', 1, FALSE),
('en-tpr-face-002', 'english-tpr-face', 'multiple-choice', '{"text": "老师说 \"Close your eyes!\"，你应该做什么？", "options": [{"id": "a", "text": "张开嘴巴 😮", "isCorrect": false}, {"id": "b", "text": "闭上眼睛 😌", "isCorrect": true}, {"id": "c", "text": "做鬼脸 🤪", "isCorrect": false}]}', '"b"', 1, FALSE),
('en-tpr-face-003', 'english-tpr-face', 'multiple-choice', '{"text": "\"Open your mouth\" 是什么意思？", "options": [{"id": "a", "text": "闭上嘴巴", "isCorrect": false}, {"id": "b", "text": "张开嘴巴", "isCorrect": true}, {"id": "c", "text": "眨眨眼", "isCorrect": false}]}', '"b"', 1, FALSE),
-- 触摸指令
('en-tpr-touch-001', 'english-tpr-touch', 'voice', '{"text": "👃 Touch your nose! 摸摸你的鼻子！", "hint": "用手指碰碰鼻子！说 \"This is my nose!\""}', '"Touch your nose"', 2, FALSE),
('en-tpr-touch-002', 'english-tpr-touch', 'multiple-choice', '{"text": "老师说 \"Touch your head!\"，你应该摸哪里？", "options": [{"id": "a", "text": "摸头 🤯", "isCorrect": true}, {"id": "b", "text": "摸鼻子 👃", "isCorrect": false}, {"id": "c", "text": "摸耳朵 👂", "isCorrect": false}]}', '"a"', 2, FALSE),
('en-tpr-touch-003', 'english-tpr-touch', 'multiple-choice', '{"text": "用英语说\"挥挥手\"应该怎么说？👋", "options": [{"id": "a", "text": "Clap your hands!", "isCorrect": false}, {"id": "b", "text": "Touch your head!", "isCorrect": false}, {"id": "c", "text": "Wave your hands!", "isCorrect": true}]}', '"c"', 2, FALSE);
