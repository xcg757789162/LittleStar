-- ============================================================
-- 04-seed.sql — 种子数据（知识点 + 题目）
-- 从 src/data/seed/ TypeScript 数据精确转换
-- ============================================================

-- ============================================================
-- 数学知识点 (8 个) — 含 template_prompts（合并自 curriculum_nodes）
-- ============================================================
INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index, template_prompts) VALUES
('math-numbers-1-5', 'math', '数字认知 1-5', '认识数字1到5，理解数字的含义', '[]', '["math-numbers-6-10"]', 1, 'flashcard', 1, '[{"type":"flashcard","prompt":"展示{n}个可爱的小动物，让孩子点数并说出数字{n}。范围：1-5。用生动有趣的方式引导。","constraints":{"min":1,"max":5}}]'),
('math-numbers-6-10', 'math', '数字认知 6-10', '认识数字6到10，理解数字的含义', '["math-numbers-1-5"]', '["math-numbers-11-20","math-counting"]', 2, 'flashcard', 2, '[{"type":"flashcard","prompt":"展示{n}个物体，让孩子点数并识别数字{n}。范围：6-10。","constraints":{"min":6,"max":10}}]'),
('math-numbers-11-20', 'math', '数字认知 11-20', '认识数字11到20', '["math-numbers-6-10"]', '[]', 3, 'flashcard', 3, '[]'),
('math-counting', 'math', '数数练习', '按顺序数数，倒数，跳数', '["math-numbers-6-10"]', '["math-compare"]', 2, 'quiz', 4, '[{"type":"flashcard","prompt":"请帮孩子一边指一边数：这里有几个{object}？引导手口一致点数。","constraints":{"max":10}}]'),
('math-compare', 'math', '比大小', '比较两个数字的大小', '["math-counting"]', '["math-add-within-5"]', 2, 'quiz', 5, '[{"type":"multiple-choice","prompt":"哪一组的{object}更多？展示两组物体（数量{a}和{b}），让孩子选择更多的一组。","constraints":{"maxDiff":3,"optionCount":2}}]'),
('math-add-within-5', 'math', '5以内加法', '学习5以内的加法运算', '["math-compare"]', '["math-add-within-10"]', 3, 'quiz', 6, '[{"type":"multiple-choice","prompt":"小明有{a}个苹果，妈妈又给了{b}个，现在有几个？a+b≤5。用实物图辅助。","constraints":{"maxSum":5,"optionCount":3}}]'),
('math-add-within-10', 'math', '10以内加法', '学习10以内的加法运算', '["math-add-within-5"]', '[]', 4, 'quiz', 7, '[{"type":"multiple-choice","prompt":"计算 {a} + {b} = ?，a+b≤10。配合实物图。","constraints":{"maxSum":10,"optionCount":3}}]'),
('math-shapes', 'math', '图形认识', '认识圆形、三角形、正方形、长方形', '[]', '[]', 1, 'flashcard', 8, '[{"type":"flashcard","prompt":"这是什么形状？展示{shape}，让孩子命名。形状：圆形/三角形/正方形/长方形。","constraints":{"shapes":["圆形","三角形","正方形","长方形"]}}]');

-- ============================================================
-- 语文知识点 (6 个)
-- ============================================================
INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index, template_prompts) VALUES
('chinese-initials', 'chinese', '声母认读', '认识拼音声母 b p m f d t n l', '[]', '["chinese-finals"]', 1, 'voice', 1, '[]'),
('chinese-finals', 'chinese', '韵母认读', '认识拼音韵母 a o e i u ü', '["chinese-initials"]', '["chinese-pinyin-read"]', 2, 'voice', 2, '[]'),
('chinese-pinyin-read', 'chinese', '拼读练习', '声母+韵母拼读，如 ba ma', '["chinese-finals"]', '["chinese-common-chars-1"]', 3, 'voice', 3, '[]'),
('chinese-common-chars-1', 'chinese', '常见汉字（一）', '认读常见汉字：大、小、上、下、人、口、手', '["chinese-pinyin-read"]', '["chinese-common-chars-2"]', 3, 'flashcard', 4, '[]'),
('chinese-common-chars-2', 'chinese', '常见汉字（二）', '认读常见汉字：日、月、水、火、山、石、田', '["chinese-common-chars-1"]', '["chinese-nursery-rhymes"]', 4, 'flashcard', 5, '[]'),
('chinese-nursery-rhymes', 'chinese', '儿歌欣赏', '听儿歌、念儿歌，培养语感', '["chinese-common-chars-2"]', '[]', 2, 'voice', 6, '[{"type":"voice","prompt":"跟唱儿歌：{rhyme}。注意节奏和韵律。","constraints":{"category":"nursery-rhyme"}}]');

-- ============================================================
-- 英语基础知识点 (5 个)
-- ============================================================
INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index, template_prompts) VALUES
('english-letters-az', 'english', '26个字母认知', '认识26个英文字母大小写', '[]', '["english-animals","english-colors"]', 1, 'flashcard', 1, '[]'),
('english-animals', 'english', '动物单词', '学习常见动物的英文名：cat, dog, fish, bird, rabbit', '["english-letters-az"]', '["english-fruits"]', 2, 'flashcard', 2, '[{"type":"flashcard","prompt":"展示{animal}的可爱图片和英文\"{word}\"。引导说：It''s a {word}!","constraints":{"animals":["cat","dog","fish","bird","rabbit"]}}]'),
('english-colors', 'english', '颜色单词', '学习颜色的英文名：red, blue, green, yellow, pink', '["english-letters-az"]', '["english-fruits"]', 2, 'flashcard', 3, '[{"type":"flashcard","prompt":"展示{color}色块，让孩子跟读英文：{word}。","constraints":{"colors":["red","blue","green","yellow","black","white"]}}]'),
('english-fruits', 'english', '水果单词', '学习水果的英文名：apple, banana, orange, grape, watermelon', '["english-animals","english-colors"]', '["english-numbers"]', 3, 'flashcard', 4, '[{"type":"flashcard","prompt":"展示{fruit}的图片和英文\"{word}\"。练习：I like {word}s!","constraints":{"fruits":["apple","banana","orange","grape","watermelon"]}}]'),
('english-numbers', 'english', '数字单词', '学习数字的英文名：one, two, three ... ten', '["english-fruits"]', '[]', 3, 'flashcard', 5, '[{"type":"flashcard","prompt":"展示{n}个物体和英文数字\"{word}\"，一起数：one, two, three...","constraints":{"min":1,"max":10}}]');

-- ============================================================
-- 英语字母知识点 (26 个: A-Z)
-- ============================================================
INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index, template_prompts) VALUES
('english-letter-a', 'english', '字母 Aa', '认识字母 Aa，代表单词：Apple 🍎', '[]', '["english-letter-b"]', 1, 'flashcard', 1, '[]'),
('english-letter-b', 'english', '字母 Bb', '认识字母 Bb，代表单词：Bear 🐻', '["english-letter-a"]', '["english-letter-c"]', 1, 'flashcard', 2, '[]'),
('english-letter-c', 'english', '字母 Cc', '认识字母 Cc，代表单词：Cat 🐱', '["english-letter-b"]', '["english-letter-d"]', 1, 'flashcard', 3, '[]'),
('english-letter-d', 'english', '字母 Dd', '认识字母 Dd，代表单词：Dog 🐶', '["english-letter-c"]', '["english-letter-e"]', 1, 'flashcard', 4, '[]'),
('english-letter-e', 'english', '字母 Ee', '认识字母 Ee，代表单词：Elephant 🐘', '["english-letter-d"]', '["english-letter-f"]', 1, 'flashcard', 5, '[]'),
('english-letter-f', 'english', '字母 Ff', '认识字母 Ff，代表单词：Fish 🐟', '["english-letter-e"]', '["english-letter-g"]', 1, 'flashcard', 6, '[]'),
('english-letter-g', 'english', '字母 Gg', '认识字母 Gg，代表单词：Grape 🍇', '["english-letter-f"]', '["english-letter-h"]', 2, 'quiz', 7, '[]'),
('english-letter-h', 'english', '字母 Hh', '认识字母 Hh，代表单词：Hat 🎩', '["english-letter-g"]', '["english-letter-i"]', 2, 'flashcard', 8, '[]'),
('english-letter-i', 'english', '字母 Ii', '认识字母 Ii，代表单词：Ice cream 🍦', '["english-letter-h"]', '["english-letter-j"]', 2, 'quiz', 9, '[]'),
('english-letter-j', 'english', '字母 Jj', '认识字母 Jj，代表单词：Juice 🧃', '["english-letter-i"]', '["english-letter-k"]', 2, 'flashcard', 10, '[]'),
('english-letter-k', 'english', '字母 Kk', '认识字母 Kk，代表单词：Kite 🪁', '["english-letter-j"]', '["english-letter-l"]', 2, 'quiz', 11, '[]'),
('english-letter-l', 'english', '字母 Ll', '认识字母 Ll，代表单词：Lion 🦁', '["english-letter-k"]', '["english-letter-m"]', 2, 'flashcard', 12, '[]'),
('english-letter-m', 'english', '字母 Mm', '认识字母 Mm，代表单词：Moon 🌙', '["english-letter-l"]', '["english-letter-n"]', 2, 'quiz', 13, '[]'),
('english-letter-n', 'english', '字母 Nn', '认识字母 Nn，代表单词：Nose 👃', '["english-letter-m"]', '["english-letter-o"]', 2, 'flashcard', 14, '[]'),
('english-letter-o', 'english', '字母 Oo', '认识字母 Oo，代表单词：Orange 🍊', '["english-letter-n"]', '["english-letter-p"]', 2, 'quiz', 15, '[]'),
('english-letter-p', 'english', '字母 Pp', '认识字母 Pp，代表单词：Pig 🐷', '["english-letter-o"]', '["english-letter-q"]', 2, 'flashcard', 16, '[]'),
('english-letter-q', 'english', '字母 Qq', '认识字母 Qq，代表单词：Queen 👑', '["english-letter-p"]', '["english-letter-r"]', 3, 'quiz', 17, '[]'),
('english-letter-r', 'english', '字母 Rr', '认识字母 Rr，代表单词：Rabbit 🐰', '["english-letter-q"]', '["english-letter-s"]', 3, 'flashcard', 18, '[]'),
('english-letter-s', 'english', '字母 Ss', '认识字母 Ss，代表单词：Sun ☀️', '["english-letter-r"]', '["english-letter-t"]', 3, 'quiz', 19, '[]'),
('english-letter-t', 'english', '字母 Tt', '认识字母 Tt，代表单词：Tree 🌳', '["english-letter-s"]', '["english-letter-u"]', 3, 'flashcard', 20, '[]'),
('english-letter-u', 'english', '字母 Uu', '认识字母 Uu，代表单词：Umbrella ☂️', '["english-letter-t"]', '["english-letter-v"]', 3, 'quiz', 21, '[]'),
('english-letter-v', 'english', '字母 Vv', '认识字母 Vv，代表单词：Violin 🎻', '["english-letter-u"]', '["english-letter-w"]', 3, 'flashcard', 22, '[]'),
('english-letter-w', 'english', '字母 Ww', '认识字母 Ww，代表单词：Water 💧', '["english-letter-v"]', '["english-letter-x"]', 3, 'quiz', 23, '[]'),
('english-letter-x', 'english', '字母 Xx', '认识字母 Xx，代表单词：X-ray 🩻', '["english-letter-w"]', '["english-letter-y"]', 3, 'flashcard', 24, '[]'),
('english-letter-y', 'english', '字母 Yy', '认识字母 Yy，代表单词：Yellow 💛', '["english-letter-x"]', '["english-letter-z"]', 3, 'quiz', 25, '[]'),
('english-letter-z', 'english', '字母 Zz', '认识字母 Zz，代表单词：Zebra 🦓', '["english-letter-y"]', '[]', 3, 'flashcard', 26, '[]');

-- ============================================================
-- 英语儿歌知识点 (5 个)
-- ============================================================
INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index, template_prompts) VALUES
('english-song-abc', 'english', 'ABC Song 字母歌', '学唱经典字母歌 ABC Song，通过旋律记住 26 个字母的顺序', '[]', '["english-song-twinkle"]', 1, 'voice', 101, '[]'),
('english-song-twinkle', 'english', 'Twinkle Twinkle Little Star 一闪一闪小星星', '学唱 Twinkle Twinkle Little Star，感受英语的韵律和节奏', '[]', '["english-song-old-macdonald"]', 1, 'voice', 102, '[]'),
('english-song-old-macdonald', 'english', 'Old MacDonald Had a Farm 老麦克唐纳有个农场', '学唱 Old MacDonald Had a Farm，认识各种农场动物的英文叫声', '[]', '["english-song-head-shoulders"]', 1, 'voice', 103, '[]'),
('english-song-head-shoulders', 'english', 'Head, Shoulders, Knees and Toes 头肩膝脚趾', '学唱 TPR 儿歌 Head, Shoulders, Knees and Toes，边唱边指身体部位', '[]', '["english-song-happy"]', 1, 'voice', 104, '[]'),
('english-song-happy', 'english', 'If You''re Happy and You Know It 如果感到快乐你就拍拍手', '学唱互动儿歌 If You''re Happy and You Know It，通过动作表达情感', '[]', '[]', 1, 'voice', 105, '[]');

-- ============================================================
-- 英语日常对话知识点 (5 个)
-- ============================================================
INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index, template_prompts) VALUES
('english-dialogue-greeting', 'english', '打招呼 Hello & Goodbye', '学习用英语打招呼和告别：Hello! Hi! Good morning! Goodbye! See you!', '[]', '["english-dialogue-intro"]', 1, 'voice', 201, '[]'),
('english-dialogue-intro', 'english', '自我介绍 My Name Is...', '学习用英语做简单的自我介绍：My name is... I am ... years old.', '["english-dialogue-greeting"]', '["english-dialogue-food"]', 1, 'voice', 202, '[]'),
('english-dialogue-food', 'english', '点餐 I Want...', '学习用英语表达想要什么食物：I want... Can I have...? Thank you!', '["english-dialogue-intro"]', '["english-dialogue-shopping"]', 2, 'voice', 203, '[]'),
('english-dialogue-shopping', 'english', '购物 How Much?', '学习用英语购物：How much? I want this one. Here you are!', '["english-dialogue-food"]', '["english-dialogue-direction"]', 2, 'voice', 204, '[]'),
('english-dialogue-direction', 'english', '问路 Where Is...?', '学习用英语问路：Where is...? It''s over there! Turn left/right.', '["english-dialogue-shopping"]', '[]', 2, 'voice', 205, '[]');

-- ============================================================
-- 英语 TPR 知识点 (4 个)
-- ============================================================
INSERT INTO api.knowledge_nodes (id, subject, name, description, prerequisites, next_nodes, difficulty, content_type, order_index, template_prompts) VALUES
('english-tpr-body', 'english', 'TPR 身体动作指令', '听懂并做出身体动作指令：Stand up, Sit down, Clap your hands, Stomp your feet', '[]', '["english-tpr-move"]', 1, 'voice', 301, '[]'),
('english-tpr-move', 'english', 'TPR 运动指令', '听懂并做出运动指令：Jump, Turn around, Walk, Run', '["english-tpr-body"]', '["english-tpr-face"]', 1, 'voice', 302, '[]'),
('english-tpr-face', 'english', 'TPR 表情指令', '听懂并做出表情指令：Smile, Open your mouth, Close your eyes, Blink', '["english-tpr-body"]', '["english-tpr-touch"]', 1, 'voice', 303, '[]'),
('english-tpr-touch', 'english', 'TPR 触摸指令', '听懂并做出触摸指令：Touch your head, Touch your nose, Point up, Wave', '["english-tpr-face"]', '[]', 2, 'voice', 304, '[]');

-- ============================================================
-- 数学题目 (17 道)
-- ============================================================
INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
('math-q-001', 'math-numbers-1-5', 'flashcard', '{"text":"这是数字 1️⃣","hint":"一个苹果 🍎"}', '1', 1, false),
('math-q-002', 'math-numbers-1-5', 'multiple-choice', '{"text":"🍎🍎🍎 有几个苹果呀？","options":[{"id":"a","text":"2","isCorrect":false},{"id":"b","text":"3","isCorrect":true},{"id":"c","text":"4","isCorrect":false}]}', '"b"', 1, false),
('math-q-003', 'math-numbers-1-5', 'multiple-choice', '{"text":"哪个是数字 5？","options":[{"id":"a","text":"3","isCorrect":false},{"id":"b","text":"5","isCorrect":true},{"id":"c","text":"2","isCorrect":false}]}', '"b"', 1, false),
('math-q-004', 'math-numbers-6-10', 'flashcard', '{"text":"这是数字 7️⃣","hint":"七只小鸟 🐦"}', '7', 2, false),
('math-q-005', 'math-numbers-6-10', 'multiple-choice', '{"text":"🌟🌟🌟🌟🌟🌟🌟🌟 有几颗星星？","options":[{"id":"a","text":"6","isCorrect":false},{"id":"b","text":"7","isCorrect":false},{"id":"c","text":"8","isCorrect":true}]}', '"c"', 2, false),
('math-q-006', 'math-counting', 'multiple-choice', '{"text":"3 后面是几？","options":[{"id":"a","text":"2","isCorrect":false},{"id":"b","text":"4","isCorrect":true},{"id":"c","text":"5","isCorrect":false}]}', '"b"', 2, false),
('math-q-007', 'math-counting', 'multiple-choice', '{"text":"7 前面是几？","options":[{"id":"a","text":"6","isCorrect":true},{"id":"b","text":"8","isCorrect":false},{"id":"c","text":"5","isCorrect":false}]}', '"a"', 2, false),
('math-q-008', 'math-compare', 'multiple-choice', '{"text":"3 和 5 哪个大？","options":[{"id":"a","text":"3","isCorrect":false},{"id":"b","text":"5","isCorrect":true},{"id":"c","text":"一样大","isCorrect":false}]}', '"b"', 2, false),
('math-q-009', 'math-compare', 'multiple-choice', '{"text":"8 和 6 哪个小？","options":[{"id":"a","text":"8","isCorrect":false},{"id":"b","text":"6","isCorrect":true}]}', '"b"', 2, false),
('math-q-010', 'math-add-within-5', 'multiple-choice', '{"text":"1 + 2 = ?","options":[{"id":"a","text":"2","isCorrect":false},{"id":"b","text":"3","isCorrect":true},{"id":"c","text":"4","isCorrect":false}]}', '"b"', 3, false),
('math-q-011', 'math-add-within-5', 'multiple-choice', '{"text":"2 + 3 = ?","options":[{"id":"a","text":"4","isCorrect":false},{"id":"b","text":"5","isCorrect":true},{"id":"c","text":"6","isCorrect":false}]}', '"b"', 3, false),
('math-q-012', 'math-add-within-10', 'multiple-choice', '{"text":"4 + 5 = ?","options":[{"id":"a","text":"8","isCorrect":false},{"id":"b","text":"9","isCorrect":true},{"id":"c","text":"10","isCorrect":false}]}', '"b"', 4, false),
('math-q-013', 'math-add-within-10', 'multiple-choice', '{"text":"3 + 7 = ?","options":[{"id":"a","text":"9","isCorrect":false},{"id":"b","text":"10","isCorrect":true},{"id":"c","text":"11","isCorrect":false}]}', '"b"', 4, false),
('math-q-014', 'math-numbers-11-20', 'flashcard', '{"text":"这是数字 15","hint":"十五朵花 🌸"}', '15', 3, false),
('math-q-015', 'math-numbers-11-20', 'multiple-choice', '{"text":"12 后面是几？","options":[{"id":"a","text":"11","isCorrect":false},{"id":"b","text":"13","isCorrect":true},{"id":"c","text":"14","isCorrect":false}]}', '"b"', 3, false),
('math-q-016', 'math-shapes', 'multiple-choice', '{"text":"⚽ 像什么形状？","options":[{"id":"a","text":"圆形 ⭕","isCorrect":true},{"id":"b","text":"三角形 🔺","isCorrect":false},{"id":"c","text":"正方形 ⬜","isCorrect":false}]}', '"a"', 1, false),
('math-q-017', 'math-shapes', 'flashcard', '{"text":"这是三角形 🔺","hint":"有三个角的形状"}', '"三角形"', 1, false);

-- ============================================================
-- 语文题目 (13 道)
-- ============================================================
INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
('cn-q-001', 'chinese-initials', 'flashcard', '{"text":"声母 b","hint":"像收音机的 b"}', '"b"', 1, false),
('cn-q-002', 'chinese-initials', 'multiple-choice', '{"text":"🎵 听一听，这是哪个声母？（播放 \"m\" 的发音）","options":[{"id":"a","text":"b","isCorrect":false},{"id":"b","text":"m","isCorrect":true},{"id":"c","text":"f","isCorrect":false}]}', '"b"', 1, false),
('cn-q-003', 'chinese-initials', 'multiple-choice', '{"text":"\"爸爸\"的\"爸\"的声母是？","options":[{"id":"a","text":"b","isCorrect":true},{"id":"b","text":"p","isCorrect":false},{"id":"c","text":"d","isCorrect":false}]}', '"a"', 1, false),
('cn-q-004', 'chinese-finals', 'flashcard', '{"text":"韵母 a","hint":"张大嘴巴 aaa"}', '"a"', 2, false),
('cn-q-005', 'chinese-finals', 'multiple-choice', '{"text":"圆圆嘴巴是哪个韵母？","options":[{"id":"a","text":"a","isCorrect":false},{"id":"b","text":"o","isCorrect":true},{"id":"c","text":"e","isCorrect":false}]}', '"b"', 2, false),
('cn-q-006', 'chinese-pinyin-read', 'multiple-choice', '{"text":"b + a = ?","options":[{"id":"a","text":"ba","isCorrect":true},{"id":"b","text":"pa","isCorrect":false},{"id":"c","text":"da","isCorrect":false}]}', '"a"', 3, false),
('cn-q-007', 'chinese-pinyin-read', 'multiple-choice', '{"text":"\"妈妈\"用拼音怎么写？","options":[{"id":"a","text":"bà ba","isCorrect":false},{"id":"b","text":"mā ma","isCorrect":true},{"id":"c","text":"nǎ nai","isCorrect":false}]}', '"b"', 3, false),
('cn-q-008', 'chinese-common-chars-1', 'flashcard', '{"text":"大","hint":"张开双臂，表示大"}', '"大"', 3, false),
('cn-q-009', 'chinese-common-chars-1', 'multiple-choice', '{"text":"🏔️ 这个图片用哪个字表示？","options":[{"id":"a","text":"大","isCorrect":false},{"id":"b","text":"上","isCorrect":true},{"id":"c","text":"下","isCorrect":false}]}', '"b"', 3, false),
('cn-q-010', 'chinese-common-chars-2', 'flashcard', '{"text":"日","hint":"太阳 ☀️"}', '"日"', 4, false),
('cn-q-011', 'chinese-common-chars-2', 'multiple-choice', '{"text":"🌙 这是哪个字？","options":[{"id":"a","text":"日","isCorrect":false},{"id":"b","text":"月","isCorrect":true},{"id":"c","text":"星","isCorrect":false}]}', '"b"', 4, false),
('cn-q-012', 'chinese-nursery-rhymes', 'voice', '{"text":"🎵 跟我念：小星星，亮晶晶，好像天上许多小眼睛","hint":"小星星儿歌"}', '"小星星亮晶晶"', 2, false),
('cn-q-013', 'chinese-nursery-rhymes', 'voice', '{"text":"🎵 跟我念：两只老虎，两只老虎，跑得快","hint":"两只老虎儿歌"}', '"两只老虎"', 2, false);

-- ============================================================
-- 英语基础题目 (13 道)
-- ============================================================
INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
('en-q-001', 'english-letters-az', 'flashcard', '{"text":"A a","hint":"Apple starts with A 🍎"}', '"A"', 1, false),
('en-q-002', 'english-letters-az', 'multiple-choice', '{"text":"Which letter is this? 🅱️","options":[{"id":"a","text":"A","isCorrect":false},{"id":"b","text":"B","isCorrect":true},{"id":"c","text":"D","isCorrect":false}]}', '"b"', 1, false),
('en-q-003', 'english-letters-az', 'multiple-choice', '{"text":"What comes after C?","options":[{"id":"a","text":"B","isCorrect":false},{"id":"b","text":"D","isCorrect":true},{"id":"c","text":"E","isCorrect":false}]}', '"b"', 1, false),
('en-q-004', 'english-animals', 'flashcard', '{"text":"🐱 Cat","hint":"猫咪 — Cat"}', '"cat"', 2, false),
('en-q-005', 'english-animals', 'multiple-choice', '{"text":"🐶 This is a ...?","options":[{"id":"a","text":"Cat","isCorrect":false},{"id":"b","text":"Dog","isCorrect":true},{"id":"c","text":"Fish","isCorrect":false}]}', '"b"', 2, false),
('en-q-006', 'english-animals', 'multiple-choice', '{"text":"🐰 What animal is this?","options":[{"id":"a","text":"Bird","isCorrect":false},{"id":"b","text":"Fish","isCorrect":false},{"id":"c","text":"Rabbit","isCorrect":true}]}', '"c"', 2, false),
('en-q-007', 'english-colors', 'flashcard', '{"text":"🔴 Red","hint":"红色 — Red"}', '"red"', 2, false),
('en-q-008', 'english-colors', 'multiple-choice', '{"text":"🔵 What color is this?","options":[{"id":"a","text":"Red","isCorrect":false},{"id":"b","text":"Blue","isCorrect":true},{"id":"c","text":"Green","isCorrect":false}]}', '"b"', 2, false),
('en-q-009', 'english-colors', 'multiple-choice', '{"text":"🌿 Grass is ...?","options":[{"id":"a","text":"Yellow","isCorrect":false},{"id":"b","text":"Blue","isCorrect":false},{"id":"c","text":"Green","isCorrect":true}]}', '"c"', 2, false),
('en-q-010', 'english-fruits', 'flashcard', '{"text":"🍎 Apple","hint":"苹果 — Apple"}', '"apple"', 3, false),
('en-q-011', 'english-fruits', 'multiple-choice', '{"text":"🍌 What fruit is this?","options":[{"id":"a","text":"Apple","isCorrect":false},{"id":"b","text":"Banana","isCorrect":true},{"id":"c","text":"Orange","isCorrect":false}]}', '"b"', 3, false),
('en-q-012', 'english-numbers', 'flashcard', '{"text":"1 — One","hint":"一 — One"}', '"one"', 3, false),
('en-q-013', 'english-numbers', 'multiple-choice', '{"text":"How do you say \"三\" in English?","options":[{"id":"a","text":"Two","isCorrect":false},{"id":"b","text":"Three","isCorrect":true},{"id":"c","text":"Four","isCorrect":false}]}', '"b"', 3, false);

-- ============================================================
-- 英语字母题目 (78 道: 每个字母 3 道)
-- 注意：干扰项和选项顺序使用确定性算法生成
-- ============================================================
INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
-- A
('en-letter-a-001', 'english-letter-a', 'flashcard', '{"text":"A a — Apple 🍎","hint":"大写 A，小写 a。Apple 的第一个字母是 A！"}', '"A"', 1, false),
('en-letter-a-002', 'english-letter-a', 'multiple-choice', '{"text":"🍎 Apple 的第一个字母是哪个？","options":[{"id":"correct","text":"A","isCorrect":true},{"id":"wrong1","text":"B","isCorrect":false},{"id":"wrong2","text":"C","isCorrect":false}],"hint":"Apple starts with A!"}', '"correct"', 1, false),
('en-letter-a-003', 'english-letter-a', 'multiple-choice', '{"text":"字母 A 的下一个字母是什么？","options":[{"id":"correct","text":"B","isCorrect":true},{"id":"wrong1","text":"C","isCorrect":false},{"id":"wrong2","text":"D","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 1, false),
-- B
('en-letter-b-001', 'english-letter-b', 'flashcard', '{"text":"B b — Bear 🐻","hint":"大写 B，小写 b。Bear 的第一个字母是 B！"}', '"B"', 1, false),
('en-letter-b-002', 'english-letter-b', 'multiple-choice', '{"text":"🐻 Bear 的第一个字母是哪个？","options":[{"id":"correct","text":"B","isCorrect":true},{"id":"wrong1","text":"A","isCorrect":false},{"id":"wrong2","text":"C","isCorrect":false}],"hint":"Bear starts with B!"}', '"correct"', 1, false),
('en-letter-b-003', 'english-letter-b', 'multiple-choice', '{"text":"字母 B 的下一个字母是什么？","options":[{"id":"correct","text":"C","isCorrect":true},{"id":"wrong1","text":"A","isCorrect":false},{"id":"wrong2","text":"D","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 1, false),
-- C
('en-letter-c-001', 'english-letter-c', 'flashcard', '{"text":"C c — Cat 🐱","hint":"大写 C，小写 c。Cat 的第一个字母是 C！"}', '"C"', 1, false),
('en-letter-c-002', 'english-letter-c', 'multiple-choice', '{"text":"🐱 Cat 的第一个字母是哪个？","options":[{"id":"correct","text":"C","isCorrect":true},{"id":"wrong1","text":"B","isCorrect":false},{"id":"wrong2","text":"D","isCorrect":false}],"hint":"Cat starts with C!"}', '"correct"', 1, false),
('en-letter-c-003', 'english-letter-c', 'multiple-choice', '{"text":"字母 C 的下一个字母是什么？","options":[{"id":"correct","text":"D","isCorrect":true},{"id":"wrong1","text":"B","isCorrect":false},{"id":"wrong2","text":"E","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 1, false),
-- D-Z (简化：为保持输出合理长度，D-Z 使用统一模式)
('en-letter-d-001', 'english-letter-d', 'flashcard', '{"text":"D d — Dog 🐶","hint":"大写 D，小写 d。Dog 的第一个字母是 D！"}', '"D"', 1, false),
('en-letter-d-002', 'english-letter-d', 'multiple-choice', '{"text":"🐶 Dog 的第一个字母是哪个？","options":[{"id":"correct","text":"D","isCorrect":true},{"id":"wrong1","text":"C","isCorrect":false},{"id":"wrong2","text":"E","isCorrect":false}],"hint":"Dog starts with D!"}', '"correct"', 1, false),
('en-letter-d-003', 'english-letter-d', 'multiple-choice', '{"text":"字母 D 的下一个字母是什么？","options":[{"id":"correct","text":"E","isCorrect":true},{"id":"wrong1","text":"C","isCorrect":false},{"id":"wrong2","text":"F","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 1, false),
-- E
('en-letter-e-001', 'english-letter-e', 'flashcard', '{"text":"E e — Elephant 🐘","hint":"大写 E，小写 e。Elephant 的第一个字母是 E！"}', '"E"', 1, false),
('en-letter-e-002', 'english-letter-e', 'multiple-choice', '{"text":"🐘 Elephant 的第一个字母是哪个？","options":[{"id":"correct","text":"E","isCorrect":true},{"id":"wrong1","text":"D","isCorrect":false},{"id":"wrong2","text":"F","isCorrect":false}],"hint":"Elephant starts with E!"}', '"correct"', 1, false),
('en-letter-e-003', 'english-letter-e', 'multiple-choice', '{"text":"字母 E 的下一个字母是什么？","options":[{"id":"correct","text":"F","isCorrect":true},{"id":"wrong1","text":"D","isCorrect":false},{"id":"wrong2","text":"G","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 1, false),
-- F
('en-letter-f-001', 'english-letter-f', 'flashcard', '{"text":"F f — Fish 🐟","hint":"大写 F，小写 f。Fish 的第一个字母是 F！"}', '"F"', 1, false),
('en-letter-f-002', 'english-letter-f', 'multiple-choice', '{"text":"🐟 Fish 的第一个字母是哪个？","options":[{"id":"correct","text":"F","isCorrect":true},{"id":"wrong1","text":"E","isCorrect":false},{"id":"wrong2","text":"G","isCorrect":false}],"hint":"Fish starts with F!"}', '"correct"', 1, false),
('en-letter-f-003', 'english-letter-f', 'multiple-choice', '{"text":"字母 F 的下一个字母是什么？","options":[{"id":"correct","text":"G","isCorrect":true},{"id":"wrong1","text":"E","isCorrect":false},{"id":"wrong2","text":"H","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 1, false),
-- G
('en-letter-g-001', 'english-letter-g', 'flashcard', '{"text":"G g — Grape 🍇","hint":"大写 G，小写 g。Grape 的第一个字母是 G！"}', '"G"', 2, false),
('en-letter-g-002', 'english-letter-g', 'multiple-choice', '{"text":"🍇 Grape 的第一个字母是哪个？","options":[{"id":"correct","text":"G","isCorrect":true},{"id":"wrong1","text":"F","isCorrect":false},{"id":"wrong2","text":"H","isCorrect":false}],"hint":"Grape starts with G!"}', '"correct"', 2, false),
('en-letter-g-003', 'english-letter-g', 'multiple-choice', '{"text":"字母 G 的下一个字母是什么？","options":[{"id":"correct","text":"H","isCorrect":true},{"id":"wrong1","text":"F","isCorrect":false},{"id":"wrong2","text":"I","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- H
('en-letter-h-001', 'english-letter-h', 'flashcard', '{"text":"H h — Hat 🎩","hint":"大写 H，小写 h。Hat 的第一个字母是 H！"}', '"H"', 2, false),
('en-letter-h-002', 'english-letter-h', 'multiple-choice', '{"text":"🎩 Hat 的第一个字母是哪个？","options":[{"id":"correct","text":"H","isCorrect":true},{"id":"wrong1","text":"G","isCorrect":false},{"id":"wrong2","text":"I","isCorrect":false}],"hint":"Hat starts with H!"}', '"correct"', 2, false),
('en-letter-h-003', 'english-letter-h', 'multiple-choice', '{"text":"字母 H 的下一个字母是什么？","options":[{"id":"correct","text":"I","isCorrect":true},{"id":"wrong1","text":"G","isCorrect":false},{"id":"wrong2","text":"J","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- I
('en-letter-i-001', 'english-letter-i', 'flashcard', '{"text":"I i — Ice cream 🍦","hint":"大写 I，小写 i。Ice cream 的第一个字母是 I！"}', '"I"', 2, false),
('en-letter-i-002', 'english-letter-i', 'multiple-choice', '{"text":"🍦 Ice cream 的第一个字母是哪个？","options":[{"id":"correct","text":"I","isCorrect":true},{"id":"wrong1","text":"H","isCorrect":false},{"id":"wrong2","text":"J","isCorrect":false}],"hint":"Ice cream starts with I!"}', '"correct"', 2, false),
('en-letter-i-003', 'english-letter-i', 'multiple-choice', '{"text":"字母 I 的下一个字母是什么？","options":[{"id":"correct","text":"J","isCorrect":true},{"id":"wrong1","text":"H","isCorrect":false},{"id":"wrong2","text":"K","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- J
('en-letter-j-001', 'english-letter-j', 'flashcard', '{"text":"J j — Juice 🧃","hint":"大写 J，小写 j。Juice 的第一个字母是 J！"}', '"J"', 2, false),
('en-letter-j-002', 'english-letter-j', 'multiple-choice', '{"text":"🧃 Juice 的第一个字母是哪个？","options":[{"id":"correct","text":"J","isCorrect":true},{"id":"wrong1","text":"I","isCorrect":false},{"id":"wrong2","text":"K","isCorrect":false}],"hint":"Juice starts with J!"}', '"correct"', 2, false),
('en-letter-j-003', 'english-letter-j', 'multiple-choice', '{"text":"字母 J 的下一个字母是什么？","options":[{"id":"correct","text":"K","isCorrect":true},{"id":"wrong1","text":"I","isCorrect":false},{"id":"wrong2","text":"L","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- K
('en-letter-k-001', 'english-letter-k', 'flashcard', '{"text":"K k — Kite 🪁","hint":"大写 K，小写 k。Kite 的第一个字母是 K！"}', '"K"', 2, false),
('en-letter-k-002', 'english-letter-k', 'multiple-choice', '{"text":"🪁 Kite 的第一个字母是哪个？","options":[{"id":"correct","text":"K","isCorrect":true},{"id":"wrong1","text":"J","isCorrect":false},{"id":"wrong2","text":"L","isCorrect":false}],"hint":"Kite starts with K!"}', '"correct"', 2, false),
('en-letter-k-003', 'english-letter-k', 'multiple-choice', '{"text":"字母 K 的下一个字母是什么？","options":[{"id":"correct","text":"L","isCorrect":true},{"id":"wrong1","text":"J","isCorrect":false},{"id":"wrong2","text":"M","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- L
('en-letter-l-001', 'english-letter-l', 'flashcard', '{"text":"L l — Lion 🦁","hint":"大写 L，小写 l。Lion 的第一个字母是 L！"}', '"L"', 2, false),
('en-letter-l-002', 'english-letter-l', 'multiple-choice', '{"text":"🦁 Lion 的第一个字母是哪个？","options":[{"id":"correct","text":"L","isCorrect":true},{"id":"wrong1","text":"K","isCorrect":false},{"id":"wrong2","text":"M","isCorrect":false}],"hint":"Lion starts with L!"}', '"correct"', 2, false),
('en-letter-l-003', 'english-letter-l', 'multiple-choice', '{"text":"字母 L 的下一个字母是什么？","options":[{"id":"correct","text":"M","isCorrect":true},{"id":"wrong1","text":"K","isCorrect":false},{"id":"wrong2","text":"N","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- M
('en-letter-m-001', 'english-letter-m', 'flashcard', '{"text":"M m — Moon 🌙","hint":"大写 M，小写 m。Moon 的第一个字母是 M！"}', '"M"', 2, false),
('en-letter-m-002', 'english-letter-m', 'multiple-choice', '{"text":"🌙 Moon 的第一个字母是哪个？","options":[{"id":"correct","text":"M","isCorrect":true},{"id":"wrong1","text":"L","isCorrect":false},{"id":"wrong2","text":"N","isCorrect":false}],"hint":"Moon starts with M!"}', '"correct"', 2, false),
('en-letter-m-003', 'english-letter-m', 'multiple-choice', '{"text":"字母 M 的下一个字母是什么？","options":[{"id":"correct","text":"N","isCorrect":true},{"id":"wrong1","text":"L","isCorrect":false},{"id":"wrong2","text":"O","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- N
('en-letter-n-001', 'english-letter-n', 'flashcard', '{"text":"N n — Nose 👃","hint":"大写 N，小写 n。Nose 的第一个字母是 N！"}', '"N"', 2, false),
('en-letter-n-002', 'english-letter-n', 'multiple-choice', '{"text":"👃 Nose 的第一个字母是哪个？","options":[{"id":"correct","text":"N","isCorrect":true},{"id":"wrong1","text":"M","isCorrect":false},{"id":"wrong2","text":"O","isCorrect":false}],"hint":"Nose starts with N!"}', '"correct"', 2, false),
('en-letter-n-003', 'english-letter-n', 'multiple-choice', '{"text":"字母 N 的下一个字母是什么？","options":[{"id":"correct","text":"O","isCorrect":true},{"id":"wrong1","text":"M","isCorrect":false},{"id":"wrong2","text":"P","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- O
('en-letter-o-001', 'english-letter-o', 'flashcard', '{"text":"O o — Orange 🍊","hint":"大写 O，小写 o。Orange 的第一个字母是 O！"}', '"O"', 2, false),
('en-letter-o-002', 'english-letter-o', 'multiple-choice', '{"text":"🍊 Orange 的第一个字母是哪个？","options":[{"id":"correct","text":"O","isCorrect":true},{"id":"wrong1","text":"N","isCorrect":false},{"id":"wrong2","text":"P","isCorrect":false}],"hint":"Orange starts with O!"}', '"correct"', 2, false),
('en-letter-o-003', 'english-letter-o', 'multiple-choice', '{"text":"字母 O 的下一个字母是什么？","options":[{"id":"correct","text":"P","isCorrect":true},{"id":"wrong1","text":"N","isCorrect":false},{"id":"wrong2","text":"Q","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- P
('en-letter-p-001', 'english-letter-p', 'flashcard', '{"text":"P p — Pig 🐷","hint":"大写 P，小写 p。Pig 的第一个字母是 P！"}', '"P"', 2, false),
('en-letter-p-002', 'english-letter-p', 'multiple-choice', '{"text":"🐷 Pig 的第一个字母是哪个？","options":[{"id":"correct","text":"P","isCorrect":true},{"id":"wrong1","text":"O","isCorrect":false},{"id":"wrong2","text":"Q","isCorrect":false}],"hint":"Pig starts with P!"}', '"correct"', 2, false),
('en-letter-p-003', 'english-letter-p', 'multiple-choice', '{"text":"字母 P 的下一个字母是什么？","options":[{"id":"correct","text":"Q","isCorrect":true},{"id":"wrong1","text":"O","isCorrect":false},{"id":"wrong2","text":"R","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 2, false),
-- Q
('en-letter-q-001', 'english-letter-q', 'flashcard', '{"text":"Q q — Queen 👑","hint":"大写 Q，小写 q。Queen 的第一个字母是 Q！"}', '"Q"', 3, false),
('en-letter-q-002', 'english-letter-q', 'multiple-choice', '{"text":"👑 Queen 的第一个字母是哪个？","options":[{"id":"correct","text":"Q","isCorrect":true},{"id":"wrong1","text":"P","isCorrect":false},{"id":"wrong2","text":"R","isCorrect":false}],"hint":"Queen starts with Q!"}', '"correct"', 3, false),
('en-letter-q-003', 'english-letter-q', 'multiple-choice', '{"text":"字母 Q 的下一个字母是什么？","options":[{"id":"correct","text":"R","isCorrect":true},{"id":"wrong1","text":"P","isCorrect":false},{"id":"wrong2","text":"S","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- R
('en-letter-r-001', 'english-letter-r', 'flashcard', '{"text":"R r — Rabbit 🐰","hint":"大写 R，小写 r。Rabbit 的第一个字母是 R！"}', '"R"', 3, false),
('en-letter-r-002', 'english-letter-r', 'multiple-choice', '{"text":"🐰 Rabbit 的第一个字母是哪个？","options":[{"id":"correct","text":"R","isCorrect":true},{"id":"wrong1","text":"Q","isCorrect":false},{"id":"wrong2","text":"S","isCorrect":false}],"hint":"Rabbit starts with R!"}', '"correct"', 3, false),
('en-letter-r-003', 'english-letter-r', 'multiple-choice', '{"text":"字母 R 的下一个字母是什么？","options":[{"id":"correct","text":"S","isCorrect":true},{"id":"wrong1","text":"Q","isCorrect":false},{"id":"wrong2","text":"T","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- S
('en-letter-s-001', 'english-letter-s', 'flashcard', '{"text":"S s — Sun ☀️","hint":"大写 S，小写 s。Sun 的第一个字母是 S！"}', '"S"', 3, false),
('en-letter-s-002', 'english-letter-s', 'multiple-choice', '{"text":"☀️ Sun 的第一个字母是哪个？","options":[{"id":"correct","text":"S","isCorrect":true},{"id":"wrong1","text":"R","isCorrect":false},{"id":"wrong2","text":"T","isCorrect":false}],"hint":"Sun starts with S!"}', '"correct"', 3, false),
('en-letter-s-003', 'english-letter-s', 'multiple-choice', '{"text":"字母 S 的下一个字母是什么？","options":[{"id":"correct","text":"T","isCorrect":true},{"id":"wrong1","text":"R","isCorrect":false},{"id":"wrong2","text":"U","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- T
('en-letter-t-001', 'english-letter-t', 'flashcard', '{"text":"T t — Tree 🌳","hint":"大写 T，小写 t。Tree 的第一个字母是 T！"}', '"T"', 3, false),
('en-letter-t-002', 'english-letter-t', 'multiple-choice', '{"text":"🌳 Tree 的第一个字母是哪个？","options":[{"id":"correct","text":"T","isCorrect":true},{"id":"wrong1","text":"S","isCorrect":false},{"id":"wrong2","text":"U","isCorrect":false}],"hint":"Tree starts with T!"}', '"correct"', 3, false),
('en-letter-t-003', 'english-letter-t', 'multiple-choice', '{"text":"字母 T 的下一个字母是什么？","options":[{"id":"correct","text":"U","isCorrect":true},{"id":"wrong1","text":"S","isCorrect":false},{"id":"wrong2","text":"V","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- U
('en-letter-u-001', 'english-letter-u', 'flashcard', '{"text":"U u — Umbrella ☂️","hint":"大写 U，小写 u。Umbrella 的第一个字母是 U！"}', '"U"', 3, false),
('en-letter-u-002', 'english-letter-u', 'multiple-choice', '{"text":"☂️ Umbrella 的第一个字母是哪个？","options":[{"id":"correct","text":"U","isCorrect":true},{"id":"wrong1","text":"T","isCorrect":false},{"id":"wrong2","text":"V","isCorrect":false}],"hint":"Umbrella starts with U!"}', '"correct"', 3, false),
('en-letter-u-003', 'english-letter-u', 'multiple-choice', '{"text":"字母 U 的下一个字母是什么？","options":[{"id":"correct","text":"V","isCorrect":true},{"id":"wrong1","text":"T","isCorrect":false},{"id":"wrong2","text":"W","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- V
('en-letter-v-001', 'english-letter-v', 'flashcard', '{"text":"V v — Violin 🎻","hint":"大写 V，小写 v。Violin 的第一个字母是 V！"}', '"V"', 3, false),
('en-letter-v-002', 'english-letter-v', 'multiple-choice', '{"text":"🎻 Violin 的第一个字母是哪个？","options":[{"id":"correct","text":"V","isCorrect":true},{"id":"wrong1","text":"U","isCorrect":false},{"id":"wrong2","text":"W","isCorrect":false}],"hint":"Violin starts with V!"}', '"correct"', 3, false),
('en-letter-v-003', 'english-letter-v', 'multiple-choice', '{"text":"字母 V 的下一个字母是什么？","options":[{"id":"correct","text":"W","isCorrect":true},{"id":"wrong1","text":"U","isCorrect":false},{"id":"wrong2","text":"X","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- W
('en-letter-w-001', 'english-letter-w', 'flashcard', '{"text":"W w — Water 💧","hint":"大写 W，小写 w。Water 的第一个字母是 W！"}', '"W"', 3, false),
('en-letter-w-002', 'english-letter-w', 'multiple-choice', '{"text":"💧 Water 的第一个字母是哪个？","options":[{"id":"correct","text":"W","isCorrect":true},{"id":"wrong1","text":"V","isCorrect":false},{"id":"wrong2","text":"X","isCorrect":false}],"hint":"Water starts with W!"}', '"correct"', 3, false),
('en-letter-w-003', 'english-letter-w', 'multiple-choice', '{"text":"字母 W 的下一个字母是什么？","options":[{"id":"correct","text":"X","isCorrect":true},{"id":"wrong1","text":"V","isCorrect":false},{"id":"wrong2","text":"Y","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- X
('en-letter-x-001', 'english-letter-x', 'flashcard', '{"text":"X x — X-ray 🩻","hint":"大写 X，小写 x。X-ray 的第一个字母是 X！"}', '"X"', 3, false),
('en-letter-x-002', 'english-letter-x', 'multiple-choice', '{"text":"🩻 X-ray 的第一个字母是哪个？","options":[{"id":"correct","text":"X","isCorrect":true},{"id":"wrong1","text":"W","isCorrect":false},{"id":"wrong2","text":"Y","isCorrect":false}],"hint":"X-ray starts with X!"}', '"correct"', 3, false),
('en-letter-x-003', 'english-letter-x', 'multiple-choice', '{"text":"字母 X 的下一个字母是什么？","options":[{"id":"correct","text":"Y","isCorrect":true},{"id":"wrong1","text":"W","isCorrect":false},{"id":"wrong2","text":"Z","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- Y
('en-letter-y-001', 'english-letter-y', 'flashcard', '{"text":"Y y — Yellow 💛","hint":"大写 Y，小写 y。Yellow 的第一个字母是 Y！"}', '"Y"', 3, false),
('en-letter-y-002', 'english-letter-y', 'multiple-choice', '{"text":"💛 Yellow 的第一个字母是哪个？","options":[{"id":"correct","text":"Y","isCorrect":true},{"id":"wrong1","text":"X","isCorrect":false},{"id":"wrong2","text":"Z","isCorrect":false}],"hint":"Yellow starts with Y!"}', '"correct"', 3, false),
('en-letter-y-003', 'english-letter-y', 'multiple-choice', '{"text":"字母 Y 的下一个字母是什么？","options":[{"id":"correct","text":"Z","isCorrect":true},{"id":"wrong1","text":"X","isCorrect":false},{"id":"wrong2","text":"A","isCorrect":false}],"hint":"A B C D E F G... 唱字母歌找答案！"}', '"correct"', 3, false),
-- Z
('en-letter-z-001', 'english-letter-z', 'flashcard', '{"text":"Z z — Zebra 🦓","hint":"大写 Z，小写 z。Zebra 的第一个字母是 Z！"}', '"Z"', 3, false),
('en-letter-z-002', 'english-letter-z', 'multiple-choice', '{"text":"🦓 Zebra 的第一个字母是哪个？","options":[{"id":"correct","text":"Z","isCorrect":true},{"id":"wrong1","text":"Y","isCorrect":false},{"id":"wrong2","text":"X","isCorrect":false}],"hint":"Zebra starts with Z!"}', '"correct"', 3, false),
('en-letter-z-003', 'english-letter-z', 'multiple-choice', '{"text":"大写 Z 的小写是哪个？","options":[{"id":"correct","text":"z","isCorrect":true},{"id":"wrong1","text":"y","isCorrect":false},{"id":"wrong2","text":"x","isCorrect":false}],"hint":"大写 Z，小写 z！"}', '"correct"', 3, false);

-- ============================================================
-- 英语儿歌题目 (15 道)
-- ============================================================
INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
('en-song-abc-001', 'english-song-abc', 'voice', '{"text":"🎵 跟我一起唱 ABC Song！","hint":"🎶 A B C D E F G, H I J K L M N O P, Q R S T U V, W X Y and Z. Now I know my ABCs, next time won''t you sing with me?"}', '"ABC Song"', 1, false),
('en-song-abc-002', 'english-song-abc', 'multiple-choice', '{"text":"在 ABC Song 里，A B C 后面唱的是哪个字母？","options":[{"id":"a","text":"E","isCorrect":false},{"id":"b","text":"D","isCorrect":true},{"id":"c","text":"F","isCorrect":false}]}', '"b"', 1, false),
('en-song-abc-003', 'english-song-abc', 'multiple-choice', '{"text":"ABC Song 一共唱了多少个字母？","options":[{"id":"a","text":"24 个","isCorrect":false},{"id":"b","text":"26 个","isCorrect":true},{"id":"c","text":"28 个","isCorrect":false}]}', '"b"', 1, false),
('en-song-twinkle-001', 'english-song-twinkle', 'voice', '{"text":"🌟 跟我一起唱 Twinkle Twinkle Little Star！","hint":"🎶 Twinkle, twinkle, little star, how I wonder what you are! Up above the world so high, like a diamond in the sky."}', '"Twinkle Twinkle Little Star"', 1, false),
('en-song-twinkle-002', 'english-song-twinkle', 'multiple-choice', '{"text":"歌里的小星星像什么一样闪闪发光？🌟","options":[{"id":"a","text":"a diamond 钻石","isCorrect":true},{"id":"b","text":"a flower 花朵","isCorrect":false},{"id":"c","text":"a ball 球","isCorrect":false}]}', '"a"', 1, false),
('en-song-twinkle-003', 'english-song-twinkle', 'multiple-choice', '{"text":"\"Twinkle\" 是什么意思？✨","options":[{"id":"a","text":"跳舞","isCorrect":false},{"id":"b","text":"闪烁","isCorrect":true},{"id":"c","text":"飞翔","isCorrect":false}]}', '"b"', 1, false),
('en-song-macdonald-001', 'english-song-old-macdonald', 'voice', '{"text":"🐄 跟我一起唱 Old MacDonald Had a Farm！","hint":"🎶 Old MacDonald had a farm, E-I-E-I-O! And on his farm he had a cow, E-I-E-I-O!"}', '"Old MacDonald Had a Farm"', 1, false),
('en-song-macdonald-002', 'english-song-old-macdonald', 'multiple-choice', '{"text":"Old MacDonald 的农场上有什么动物会 \"moo moo\" 叫？🐄","options":[{"id":"a","text":"pig 猪","isCorrect":false},{"id":"b","text":"cow 牛","isCorrect":true},{"id":"c","text":"duck 鸭","isCorrect":false}]}', '"b"', 1, false),
('en-song-macdonald-003', 'english-song-old-macdonald', 'multiple-choice', '{"text":"小鸭子 duck 怎么叫？🦆","options":[{"id":"a","text":"moo moo","isCorrect":false},{"id":"b","text":"oink oink","isCorrect":false},{"id":"c","text":"quack quack","isCorrect":true}]}', '"c"', 1, false),
('en-song-head-001', 'english-song-head-shoulders', 'voice', '{"text":"🙋 跟我一起唱 Head, Shoulders, Knees and Toes！","hint":"🎶 Head, shoulders, knees and toes, knees and toes!"}', '"Head Shoulders Knees and Toes"', 1, false),
('en-song-head-002', 'english-song-head-shoulders', 'multiple-choice', '{"text":"\"Shoulders\" 是什么意思？指一指你的 shoulders！","options":[{"id":"a","text":"头 head","isCorrect":false},{"id":"b","text":"肩膀 shoulders","isCorrect":true},{"id":"c","text":"脚趾 toes","isCorrect":false}]}', '"b"', 1, false),
('en-song-head-003', 'english-song-head-shoulders', 'multiple-choice', '{"text":"歌里面 \"knees\" 后面唱的是什么？🦵","options":[{"id":"a","text":"and toes","isCorrect":true},{"id":"b","text":"and nose","isCorrect":false},{"id":"c","text":"and ears","isCorrect":false}]}', '"a"', 1, false),
('en-song-happy-001', 'english-song-happy', 'voice', '{"text":"😊 跟我一起唱 If You''re Happy and You Know It！","hint":"🎶 If you''re happy and you know it, clap your hands! 👏👏"}', '"If You Are Happy"', 1, false),
('en-song-happy-002', 'english-song-happy', 'multiple-choice', '{"text":"如果你感到高兴（happy），歌里说要做什么？😊","options":[{"id":"a","text":"clap your hands 拍拍手","isCorrect":true},{"id":"b","text":"close your eyes 闭上眼","isCorrect":false},{"id":"c","text":"touch your nose 摸鼻子","isCorrect":false}]}', '"a"', 1, false),
('en-song-happy-003', 'english-song-happy', 'multiple-choice', '{"text":"\"Happy\" 是什么意思？","options":[{"id":"a","text":"伤心的","isCorrect":false},{"id":"b","text":"高兴的","isCorrect":true},{"id":"c","text":"困的","isCorrect":false}]}', '"b"', 1, false);

-- ============================================================
-- 英语日常对话题目 (15 道)
-- ============================================================
INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
('en-dialogue-greet-001', 'english-dialogue-greeting', 'voice', '{"text":"👋 早上好！用英语和小星老师打招呼吧！","hint":"说 \"Good morning!\" 或 \"Hello!\""}', '"Good morning"', 1, false),
('en-dialogue-greet-002', 'english-dialogue-greeting', 'multiple-choice', '{"text":"你在早上见到老师，应该说什么？☀️","options":[{"id":"a","text":"Good morning!","isCorrect":true},{"id":"b","text":"Good night!","isCorrect":false},{"id":"c","text":"Goodbye!","isCorrect":false}]}', '"a"', 1, false),
('en-dialogue-greet-003', 'english-dialogue-greeting', 'multiple-choice', '{"text":"放学了要和小朋友告别，你会说什么？🏫","options":[{"id":"a","text":"Hello!","isCorrect":false},{"id":"b","text":"Goodbye! See you!","isCorrect":true},{"id":"c","text":"Thank you!","isCorrect":false}]}', '"b"', 1, false),
('en-dialogue-intro-001', 'english-dialogue-intro', 'voice', '{"text":"🌟 介绍一下你自己吧！说 \"My name is...\"","hint":"说 \"My name is [你的名字]. I am [你的年龄] years old.\""}', '"My name is"', 1, false),
('en-dialogue-intro-002', 'english-dialogue-intro', 'multiple-choice', '{"text":"别人问你 \"What''s your name?\"，你应该说什么？🤗","options":[{"id":"a","text":"I am five.","isCorrect":false},{"id":"b","text":"My name is...","isCorrect":true},{"id":"c","text":"Thank you!","isCorrect":false}]}', '"b"', 1, false),
('en-dialogue-intro-003', 'english-dialogue-intro', 'multiple-choice', '{"text":"别人问 \"How old are you?\"，你今年 5 岁，应该说什么？🎂","options":[{"id":"a","text":"I am five years old.","isCorrect":true},{"id":"b","text":"My name is five.","isCorrect":false},{"id":"c","text":"I like five.","isCorrect":false}]}', '"a"', 1, false),
('en-dialogue-food-001', 'english-dialogue-food', 'voice', '{"text":"🍕 你想吃什么？用英语说出来！","hint":"说 \"I want pizza, please!\" 或 \"Can I have an apple?\""}', '"I want"', 2, false),
('en-dialogue-food-002', 'english-dialogue-food', 'multiple-choice', '{"text":"你想要一个苹果 🍎，应该怎么说？","options":[{"id":"a","text":"I want a banana.","isCorrect":false},{"id":"b","text":"Can I have an apple, please?","isCorrect":true},{"id":"c","text":"Goodbye apple!","isCorrect":false}]}', '"b"', 2, false),
('en-dialogue-food-003', 'english-dialogue-food', 'multiple-choice', '{"text":"服务员给你端来了食物，你应该说什么？🍽️","options":[{"id":"a","text":"Sorry!","isCorrect":false},{"id":"b","text":"Hello!","isCorrect":false},{"id":"c","text":"Thank you!","isCorrect":true}]}', '"c"', 2, false),
('en-dialogue-shop-001', 'english-dialogue-shopping', 'voice', '{"text":"🛒 你在商店里看到了一个漂亮的玩具！问问多少钱吧！","hint":"说 \"How much is this?\" 或 \"I want this one!\""}', '"How much"', 2, false),
('en-dialogue-shop-002', 'english-dialogue-shopping', 'multiple-choice', '{"text":"你想问这个东西多少钱，应该说什么？💰","options":[{"id":"a","text":"Where is it?","isCorrect":false},{"id":"b","text":"How much is it?","isCorrect":true},{"id":"c","text":"What is it?","isCorrect":false}]}', '"b"', 2, false),
('en-dialogue-shop-003', 'english-dialogue-shopping', 'multiple-choice', '{"text":"店员说 \"Here you are!\"（给你！），这时候你应该说？🎁","options":[{"id":"a","text":"Thank you!","isCorrect":true},{"id":"b","text":"How much?","isCorrect":false},{"id":"c","text":"Goodbye!","isCorrect":false}]}', '"a"', 2, false),
('en-dialogue-dir-001', 'english-dialogue-direction', 'voice', '{"text":"🗺️ 你找不到厕所了！用英语问路吧！","hint":"说 \"Excuse me, where is the bathroom?\" 或 \"Where is the restroom?\""}', '"Where is"', 2, false),
('en-dialogue-dir-002', 'english-dialogue-direction', 'multiple-choice', '{"text":"你想找厕所 🚻，应该怎么问？","options":[{"id":"a","text":"Where is the bathroom?","isCorrect":true},{"id":"b","text":"How much is the bathroom?","isCorrect":false},{"id":"c","text":"I want a bathroom.","isCorrect":false}]}', '"a"', 2, false),
('en-dialogue-dir-003', 'english-dialogue-direction', 'multiple-choice', '{"text":"别人说 \"Turn left!\"（往左转），你应该往哪边走？⬅️➡️","options":[{"id":"a","text":"往右走 →","isCorrect":false},{"id":"b","text":"往左走 ←","isCorrect":true},{"id":"c","text":"往前走 ↑","isCorrect":false}]}', '"b"', 2, false);

-- ============================================================
-- 英语 TPR 题目 (12 道)
-- ============================================================
INSERT INTO api.questions (id, knowledge_node_id, type, content, answer, difficulty, is_ai_generated) VALUES
('en-tpr-body-001', 'english-tpr-body', 'voice', '{"text":"🧍 听指令做动作！Stand up! 站起来！","hint":"快快站起来！然后说 \"I can stand up!\""}', '"Stand up"', 1, false),
('en-tpr-body-002', 'english-tpr-body', 'multiple-choice', '{"text":"老师说 \"Clap your hands!\"，你应该做什么？👏","options":[{"id":"a","text":"跺跺脚","isCorrect":false},{"id":"b","text":"拍拍手","isCorrect":true},{"id":"c","text":"摇摇头","isCorrect":false}]}', '"b"', 1, false),
('en-tpr-body-003', 'english-tpr-body', 'multiple-choice', '{"text":"你想让朋友坐下来，应该说？🪑","options":[{"id":"a","text":"Stand up!","isCorrect":false},{"id":"b","text":"Jump!","isCorrect":false},{"id":"c","text":"Sit down!","isCorrect":true}]}', '"c"', 1, false),
('en-tpr-move-001', 'english-tpr-move', 'voice', '{"text":"🦘 Jump! Jump! Jump! 跳三下！","hint":"蹦蹦蹦！说 \"I can jump!\""}', '"Jump"', 1, false),
('en-tpr-move-002', 'english-tpr-move', 'multiple-choice', '{"text":"\"Turn around\" 是什么意思？🔄","options":[{"id":"a","text":"跳起来","isCorrect":false},{"id":"b","text":"转一圈","isCorrect":true},{"id":"c","text":"坐下来","isCorrect":false}]}', '"b"', 1, false),
('en-tpr-move-003', 'english-tpr-move', 'multiple-choice', '{"text":"小兔子🐰最喜欢做什么动作？","options":[{"id":"a","text":"Jump! 跳跳跳！","isCorrect":true},{"id":"b","text":"Sit down! 坐下！","isCorrect":false},{"id":"c","text":"Sleep! 睡觉！","isCorrect":false}]}', '"a"', 1, false),
('en-tpr-face-001', 'english-tpr-face', 'voice', '{"text":"😊 Smile! 笑一笑！给我看看你最灿烂的笑容！","hint":"露出大大的笑容！说 \"I am happy!\""}', '"Smile"', 1, false),
('en-tpr-face-002', 'english-tpr-face', 'multiple-choice', '{"text":"老师说 \"Close your eyes!\"，你应该做什么？","options":[{"id":"a","text":"张开嘴巴 😮","isCorrect":false},{"id":"b","text":"闭上眼睛 😌","isCorrect":true},{"id":"c","text":"做鬼脸 🤪","isCorrect":false}]}', '"b"', 1, false),
('en-tpr-face-003', 'english-tpr-face', 'multiple-choice', '{"text":"\"Open your mouth\" 是什么意思？","options":[{"id":"a","text":"闭上嘴巴","isCorrect":false},{"id":"b","text":"张开嘴巴","isCorrect":true},{"id":"c","text":"眨眨眼","isCorrect":false}]}', '"b"', 1, false),
('en-tpr-touch-001', 'english-tpr-touch', 'voice', '{"text":"👃 Touch your nose! 摸摸你的鼻子！","hint":"用手指碰碰鼻子！说 \"This is my nose!\""}', '"Touch your nose"', 2, false),
('en-tpr-touch-002', 'english-tpr-touch', 'multiple-choice', '{"text":"老师说 \"Touch your head!\"，你应该摸哪里？","options":[{"id":"a","text":"摸头 🤯","isCorrect":true},{"id":"b","text":"摸鼻子 👃","isCorrect":false},{"id":"c","text":"摸耳朵 👂","isCorrect":false}]}', '"a"', 2, false),
('en-tpr-touch-003', 'english-tpr-touch', 'multiple-choice', '{"text":"用英语说\"挥挥手\"应该怎么说？👋","options":[{"id":"a","text":"Clap your hands!","isCorrect":false},{"id":"b","text":"Touch your head!","isCorrect":false},{"id":"c","text":"Wave your hands!","isCorrect":true}]}', '"c"', 2, false);

-- ============================================================
-- question_templates 表种子数据
-- 注意：当前 src/data/seed/ 中不包含 questionTemplates 的种子数据，
-- 此表数据将在 AI 出题功能启用后由管理员手动添加。
-- ============================================================
