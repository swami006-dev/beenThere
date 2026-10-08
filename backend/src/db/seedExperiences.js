const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');
const { supabase: defaultSupabase } = require('./supabase');

const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : defaultSupabase;

const DEMO_EXPERIENCES = [
  // ACADEMIC (8)
  {
    title: "Overcoming Coding Exam Paralysis",
    category: "Academic",
    excerpt: "I kept studying for coding exams but froze when solving problems.",
    what_happened: "Whenever I opened an online compiler during timed tests, my mind would go completely blank despite studying daily.",
    what_helped: ["Stopped trying to solve huge problems immediately", "Practiced one small algorithm pattern at a time", "Built confidence with short 15-minute coding challenges"],
    what_changed: "I stopped panicking when seeing unfamiliar syntax or test cases.",
    where_i_am_now: "I feel much more comfortable tackling coding exam questions step by step.",
    tags: ["Coding", "Exams", "Fear of Failure", "Academic Stress"],
    status: "approved"
  },
  {
    title: "Dealing with Low Test Scores and Class Comparison",
    category: "Academic",
    excerpt: "I got a low score and felt like everyone in my class was ahead.",
    what_happened: "After getting back my midterms, seeing high class averages made me question if I belonged in this major.",
    what_helped: ["Compared my current score only with my own previous attempts", "Attended office hours to understand my mistakes", "Formed a small study group for mutual support"],
    what_changed: "Shifted focus from peer comparison to personal progress.",
    where_i_am_now: "My confidence is restored and my grades have steadily improved.",
    tags: ["Grades", "Comparison", "Academic Pressure"],
    status: "approved"
  },
  {
    title: "Overcoming Assignment Procrastination",
    category: "Academic",
    excerpt: "I kept postponing assignments until the deadline.",
    what_happened: "I would leave 10-page reports and coding assignments until 2 hours before midnight, causing extreme stress.",
    what_helped: ["Started spending 25 minutes on the assignment immediately after class", "Broke assignments into micro-tasks", "Used the Pomodoro technique"],
    what_changed: "Eliminated late-night crunch hours.",
    where_i_am_now: "I regularly submit assignments a day in advance.",
    tags: ["Procrastination", "Assignments", "Time Management"],
    status: "approved"
  },
  {
    title: "Mastering Data Structures Without Feeling Dumb",
    category: "Academic",
    excerpt: "I couldn't understand data structures even after watching tutorials.",
    what_happened: "Pointers and trees felt impossible to visualize no matter how many video lessons I watched.",
    what_helped: ["Started implementing one structure myself in code instead of watching more videos", "Drew memory diagrams on paper", "Built small practice projects"],
    what_changed: "Hands-on coding made abstract concepts click.",
    where_i_am_now: "I can comfortably implement linked lists, trees, and graphs.",
    tags: ["DSA", "Coding", "Learning", "Academic Stress"],
    status: "approved"
  },
  {
    title: "Asking Questions in Class Without Fear of Judgment",
    category: "Academic",
    excerpt: "I was afraid to ask questions in class because I thought others would judge me.",
    what_happened: "I would stay confused for weeks because I worried my questions were too basic.",
    what_helped: ["Started writing questions down first", "Asked one question after class or during lab hours", "Realized other students usually had the same question"],
    what_changed: "Lost the fear of speaking up during lectures.",
    where_i_am_now: "I actively participate in class discussions.",
    tags: ["Classroom", "Confidence", "Communication"],
    status: "approved"
  },
  {
    title: "Recovering From a Failed Technical Assessment",
    category: "Academic",
    excerpt: "I failed a coding assessment and thought I wasn't good enough.",
    what_happened: "Failing a major core course test made me feel like I wasn't cut out for computer science.",
    what_helped: ["Reviewed every wrong answer instead of only looking at the total score", "Spoke with the professor about retake opportunities", "Focused on fundamental concepts"],
    what_changed: "Understood that one test score does not define technical capability.",
    where_i_am_now: "Passed the retake and developed stronger problem-solving habits.",
    tags: ["Coding", "Failure", "Exams"],
    status: "approved"
  },
  {
    title: "Balancing Multiple Exam Subjects Efficiently",
    category: "Academic",
    excerpt: "I struggled to balance multiple subjects before exams.",
    what_happened: "Trying to revise 4 heavy subjects in one evening led to burnout and confusion.",
    what_helped: ["Divided subjects into dedicated daily blocks instead of studying everything at once", "Created a realistic revision schedule", "Took structured breaks"],
    what_changed: "Studying felt organized rather than chaotic.",
    where_i_am_now: "Felt well-prepared and calm throughout finals week.",
    tags: ["Exams", "Planning", "Time Management"],
    status: "approved"
  },
  {
    title: "Overcoming Guilt When Taking Study Breaks",
    category: "Academic",
    excerpt: "I felt guilty whenever I took breaks while studying.",
    what_happened: "Even when eating or resting, I felt anxiety that I should be reading textbooks.",
    what_helped: ["Scheduled breaks into my calendar as mandatory rest time", "Went for short walks away from my desk", "Separated study space from relaxation space"],
    what_changed: "Resting actually improved my focus and retention during study hours.",
    where_i_am_now: "I maintain a healthy balance between intense study and necessary downtime.",
    tags: ["Study Stress", "Burnout", "Exams"],
    status: "approved"
  },

  // CAREER (6)
  {
    title: "Finding Direction in Tech Stack Selection",
    category: "Career",
    excerpt: "I had no idea which technology to learn for placements.",
    what_happened: "Overwhelmed by choices between web dev, mobile, AI, and cloud, I ended up learning nothing deeply.",
    what_helped: ["Chose one foundation stack and built two complete small projects", "Focused on fundamentals before jumping to new frameworks", "Sought advice from seniors"],
    what_changed: "Built a solid project portfolio.",
    where_i_am_now: "Confidently applying for full-stack developer roles.",
    tags: ["Career", "Placements", "Skills", "Career Choice"],
    status: "approved"
  },
  {
    title: "Conquering First Technical Interview Anxiety",
    category: "Career",
    excerpt: "I was scared of my first technical interview.",
    what_happened: "My voice shook during mock interviews and I couldn't explain my own projects clearly.",
    what_helped: ["Practiced explaining my projects aloud to friends", "Did mock interviews on peer platforms", "Prepared concise summaries for core technical decisions"],
    what_changed: "Interviewing felt like a natural technical conversation.",
    where_i_am_now: "Cleared multiple technical rounds comfortably.",
    tags: ["Interview", "Placements", "Confidence"],
    status: "approved"
  },
  {
    title: "Turning Internship Rejection into Growth",
    category: "Career",
    excerpt: "I got rejected from my first internship.",
    what_happened: "Receiving a rejection email after three rounds of interviews felt discouraging.",
    what_helped: ["Treated the rejection as feedback to improve my resume and project explanation", "Asked for feedback on technical weaknesses", "Continued applying consistently"],
    what_changed: "Refined my technical prep and resume narrative.",
    where_i_am_now: "Secured a great summer internship.",
    tags: ["Internship", "Rejection", "Career"],
    status: "approved"
  },
  {
    title: "Overcoming Placement Timeline Comparison",
    category: "Career",
    excerpt: "Everyone seemed to have internships except me.",
    what_happened: "Seeing LinkedIn posts from classmates getting offers made me feel left behind.",
    what_helped: ["Stopped comparing timelines and muted distracting social feeds", "Focused on applying consistently to 3 roles per day", "Worked on refining key skills"],
    what_changed: "Regained focus on my own career trajectory.",
    where_i_am_now: "Landed an internship offer suited to my interests.",
    tags: ["Internship", "Comparison", "Career Anxiety"],
    status: "approved"
  },
  {
    title: "Crafting an Impactful Developer Resume",
    category: "Career",
    excerpt: "I didn't know how to write a good resume.",
    what_happened: "My resume was filled with generic buzzwords and listed 20 different technologies without proof.",
    what_helped: ["Described what I actually built and the metrics achieved", "Included direct GitHub and live demo links", "Tailored bullet points for target roles"],
    what_changed: "Response rate from recruiters increased significantly.",
    where_i_am_now: "Getting regular interview calls for junior developer positions.",
    tags: ["Resume", "Internship", "Career"],
    status: "approved"
  },
  {
    title: "Navigating Career Path Confusion",
    category: "Career",
    excerpt: "I was confused between software development and other career paths.",
    what_happened: "Unsure whether to pursue software engineering, product management, or data analytics.",
    what_helped: ["Tried small hands-on projects in both areas over two weekends", "Spoke to alumni in both fields", "Evaluated what day-to-day work I enjoyed most"],
    what_changed: "Gained clarity on my preferred domain.",
    where_i_am_now: "Focused on building expertise in backend engineering.",
    tags: ["Career Choice", "Confusion", "Skills"],
    status: "approved"
  },

  // COLLEGE LIFE (5)
  {
    title: "Overcoming Hostel Loneliness",
    category: "College life",
    excerpt: "I felt lonely after moving into the hostel.",
    what_happened: "Living away from home in a new city left me feeling isolated in my hostel room.",
    what_helped: ["Started joining small group activities in the common room", "Participated in hostel sports tournaments", "Kept my door open when studying"],
    what_changed: "Made close friends in the hostel.",
    where_i_am_now: "Feel at home in campus housing.",
    tags: ["Hostel", "Loneliness", "College", "Friends"],
    status: "approved"
  },
  {
    title: "Establishing a Sustainable College Routine",
    category: "College life",
    excerpt: "I struggled to adjust to college life.",
    what_happened: "Irregular sleep, skipped meals, and disorganized schedules left me perpetually tired.",
    what_helped: ["Created a simple daily routine for classes, study, and free time", "Fixed my sleep schedule", "Prepared meals/snacks ahead of time"],
    what_changed: "Energy levels and academic focus improved.",
    where_i_am_now: "Balancing academics and personal life smoothly.",
    tags: ["College", "Adjustment", "Routine"],
    status: "approved"
  },
  {
    title: "Managing First-Semester Homesickness",
    category: "College life",
    excerpt: "I was homesick during my first semester.",
    what_happened: "Missing my family and hometown food made it hard to focus during lectures.",
    what_helped: ["Set regular scheduled calls with family", "Joined campus clubs to meet like-minded peers", "Explored the local campus city with friends"],
    what_changed: "Building local connections eased the transition.",
    where_i_am_now: "Enthusiastic about my campus journey.",
    tags: ["Homesickness", "Hostel", "College"],
    status: "approved"
  },
  {
    title: "Breaking the Ice with Classmates",
    category: "College life",
    excerpt: "I didn't know how to approach classmates.",
    what_happened: "Sitting in large lecture halls surrounded by strangers felt intimidating.",
    what_helped: ["Started with simple conversations about assignments and lab work", "Shared notes with lab partners", "Joined study groups"],
    what_changed: "Formed a reliable circle of college friends.",
    where_i_am_now: "Enjoying collaborative learning with peers.",
    tags: ["Friends", "Communication", "College"],
    status: "approved"
  },
  {
    title: "Navigating Social Dynamics in Group Activities",
    category: "College life",
    excerpt: "I felt left out when groups formed without me.",
    what_happened: "When project teams were chosen, I felt anxious about finding group members.",
    what_helped: ["Started participating in smaller club activities", "Reached out proactively to lab partners", "Offered specific technical skills to teams"],
    what_changed: "Found a supportive group for academic projects.",
    where_i_am_now: "Confidently collaborating in student organizations.",
    tags: ["Friends", "Social Pressure", "College"],
    status: "approved"
  },

  // SOCIAL / COMMUNICATION (5)
  {
    title: "Conquering Public Speaking Anxiety",
    category: "Social / Communication",
    excerpt: "I get nervous whenever I have to speak in front of the class.",
    what_happened: "Standing at the podium caused heart racing and shaky hands during seminars.",
    what_helped: ["Practiced the first two sentences repeatedly until automatic", "Focused on speaking slowly", "Used cue cards with key bullet points"],
    what_changed: "Overcame presentation panic.",
    where_i_am_now: "Comfortably deliver class presentations.",
    tags: ["Public Speaking", "Presentation", "Confidence", "Communication"],
    status: "approved"
  },
  {
    title: "Preventing Presentation Brain-Freeze",
    category: "Social / Communication",
    excerpt: "I forget what I want to say during presentations.",
    what_happened: "Memorizing entire scripts word-for-word caused me to freeze if I missed a single sentence.",
    what_helped: ["Used short bullet points instead of full scripts", "Practiced speaking naturally around key themes", "Maintained eye contact with friendly faces"],
    what_changed: "Presentations became flexible and conversational.",
    where_i_am_now: "Deliver clear presentations without memorizing word-for-word.",
    tags: ["Presentations", "Communication", "Anxiety"],
    status: "approved"
  },
  {
    title: "Stopping Post-Conversation Overthinking",
    category: "Social / Communication",
    excerpt: "I overthink conversations after they happen.",
    what_happened: "I spent hours replaying casual chats, worrying if I sounded strange or awkward.",
    what_helped: ["Stopped replaying conversations repeatedly", "Reminded myself that people focus on their own lives", "Engaged in immersive activities after social events"],
    what_changed: "Drastically reduced post-social anxiety.",
    where_i_am_now: "Interact freely without dwelling on minor social interactions.",
    tags: ["Overthinking", "Social Anxiety", "Confidence"],
    status: "approved"
  },
  {
    title: "Learning to Set Healthy Personal Boundaries",
    category: "Social / Communication",
    excerpt: "I find it difficult to say no to people.",
    what_happened: "Agreeing to every request left me overworked with no time for my own studies.",
    what_helped: ["Started giving myself time before agreeing to requests", "Used polite but clear refusal phrases", "Prioritized personal commitments"],
    what_changed: "Protected my study schedule and personal well-being.",
    where_i_am_now: "Maintain healthy, respectful boundaries with peers.",
    tags: ["Boundaries", "Communication", "Confidence"],
    status: "approved"
  },
  {
    title: "Contributing Confidently in Team Discussions",
    category: "Social / Communication",
    excerpt: "I was afraid people would judge my ideas during team discussions.",
    what_happened: "In project meetings, I stayed silent even when I had good technical solutions.",
    what_helped: ["Started sharing one small idea in every meeting", "Wrote down key points before the meeting started", "Supported teammate ideas first"],
    what_changed: "Teammates valued my contributions and encouraged my input.",
    where_i_am_now: "Actively contribute ideas during group projects.",
    tags: ["Teamwork", "Communication", "Confidence"],
    status: "approved"
  },

  // RELATIONSHIPS (4)
  {
    title: "Resolving Misunderstandings with Close Friends",
    category: "Relationships",
    excerpt: "My close friend and I had a misunderstanding.",
    what_happened: "Misinterpreted text messages created tension and distance between us.",
    what_helped: ["Talked directly in person instead of trying to solve issues through text", "Listened actively to their perspective", "Acknowledged miscommunications calmly"],
    what_changed: "Cleared the air and strengthened the friendship.",
    where_i_am_now: "Communicate openly whenever friction arises.",
    tags: ["Friendship", "Communication", "Conflict"],
    status: "approved"
  },
  {
    title: "Handling Emotional Distance in Relationships",
    category: "Relationships",
    excerpt: "I felt ignored by someone I was close to.",
    what_happened: "Unanswered messages and canceled plans made me feel anxious and undervalued.",
    what_helped: ["Communicated how I felt calmly without accusation", "Accepted that I couldn't control another person's response", "Invested energy into self-care and other friendships"],
    what_changed: "Gained emotional independence and self-worth.",
    where_i_am_now: "Focus on balanced, mutually supportive relationships.",
    tags: ["Relationships", "Communication", "Boundaries"],
    status: "approved"
  },
  {
    title: "Adapting to Changing College Friendships",
    category: "Relationships",
    excerpt: "A friendship changed after we joined different colleges.",
    what_happened: "Different schedules and distance made my high school best friend feel distant.",
    what_helped: ["Stopped expecting daily contact to stay identical", "Scheduled meaningful weekend catch-ups", "Appreciated new growth while honoring past memories"],
    what_changed: "Maintained a strong long-distance friendship without pressure.",
    where_i_am_now: "Value quality connection over constant messaging.",
    tags: ["Friendship", "Change", "College"],
    status: "approved"
  },
  {
    title: "Moving On After a Difficult Breakup",
    category: "Relationships",
    excerpt: "I kept thinking about a relationship after it ended.",
    what_happened: "Constantly checking old photos and social profiles disrupted my studies and sleep.",
    what_helped: ["Focused on daily routines and spending time with supportive friends", "Muted old chat histories", "Took up a new hobby (running)"],
    what_changed: "Gradually regained emotional peace and clarity.",
    where_i_am_now: "Moving forward with positivity and renewed self-focus.",
    tags: ["Breakup", "Moving On", "Relationships"],
    status: "approved"
  },

  // MENTAL WELLBEING (5)
  {
    title: "Managing College Overwhelm and Stress",
    category: "Mental wellbeing",
    excerpt: "I felt overwhelmed by everything happening at college.",
    what_happened: "Simultaneous midterms, lab reports, and placement prep caused intense feeling of panic.",
    what_helped: ["Wrote down the three critical tasks needing attention each day", "Took 10-minute mindful breathing breaks", "Sought guidance at student counseling center"],
    what_changed: "Felt in control of workload rather than drowning in it.",
    where_i_am_now: "Manage peak academic periods with structured daily priorities.",
    tags: ["Stress", "Overwhelm", "College"],
    status: "approved"
  },
  {
    title: "Breaking the Cycle of Endless Self-Doubt",
    category: "Mental wellbeing",
    excerpt: "I kept overthinking whether I was doing enough.",
    what_happened: "Constantly feeling that I was lagging behind despite working 10 hours a day.",
    what_helped: ["Started tracking completed tasks instead of constantly judging myself", "Celebrated small wins daily", "Set hard stop times for evening work"],
    what_changed: "Shifted mindset from perfectionism to sustainable effort.",
    where_i_am_now: "Work productively without chronic self-doubt.",
    tags: ["Overthinking", "Productivity", "Stress"],
    status: "approved"
  },
  {
    title: "Rebuilding Confidence After Academic Setbacks",
    category: "Mental wellbeing",
    excerpt: "I lost confidence after several small failures.",
    what_happened: "Failing two quizzes in a row made me feel incompetent and unmotivated.",
    what_helped: ["Kept track of small daily improvements", "Reminded myself of past challenges I successfully overcame", "Focused on process over outcome"],
    what_changed: "Restored self-efficacy and resilience.",
    where_i_am_now: "Approach challenges with a growth mindset.",
    tags: ["Confidence", "Failure", "Motivation"],
    status: "approved"
  },
  {
    title: "Preventing and Recovering from Student Burnout",
    category: "Mental wellbeing",
    excerpt: "I felt exhausted from trying to keep up with everything.",
    what_happened: "Working without rest for weeks resulted in complete physical and mental exhaustion.",
    what_helped: ["Reduced unnecessary commitments and set realistic daily goals", "Prioritized 8 hours of sleep", "Re-engaged with creative hobbies"],
    what_changed: "Recovered energy and enthusiasm for learning.",
    where_i_am_now: "Maintain sustainable study habits without burning out.",
    tags: ["Burnout", "Stress", "Time Management"],
    status: "approved"
  },
  {
    title: "Managing Pre-Event Anxiety",
    category: "Mental wellbeing",
    excerpt: "I felt anxious before important college events.",
    what_happened: "Nervousness before hackathons and major events caused stomach upset and sleepless nights.",
    what_helped: ["Prepared what I could control beforehand (slides, code setups, logistics)", "Practiced grounding techniques", "Accepted butterflies as normal excitement"],
    what_changed: "Channelized anxiety into positive performance energy.",
    where_i_am_now: "Perform comfortably in high-stakes college events.",
    tags: ["Anxiety", "College", "Preparation"],
    status: "approved"
  },

  // OTHER (3)
  {
    title: "Budgeting and Financial Independence for Students",
    category: "Other",
    excerpt: "I struggled to manage college expenses and personal spending.",
    what_happened: "Running out of pocket money halfway through the month caused stress and borrowing.",
    what_helped: ["Started tracking essential expenses separately from optional spending", "Used a simple expense tracking app", "Cooked meals with roommates"],
    what_changed: "Gained full control over monthly finances.",
    where_i_am_now: "Successfully save a small percentage of my monthly allowance.",
    tags: ["Money", "College", "Planning"],
    status: "approved"
  },
  {
    title: "Navigating Family Career Expectations",
    category: "Other",
    excerpt: "My family expected me to choose a career I wasn't sure about.",
    what_happened: "Pressure from parents to prepare for traditional exams conflicted with my passion for software design.",
    what_helped: ["Prepared objective information about career paths I was considering", "Discussed my roadmap calmly with parents", "Demonstrated progress through completed projects"],
    what_changed: "Gained parental support for my chosen career path.",
    where_i_am_now: "Pursuing my passion with family encouragement.",
    tags: ["Family", "Career", "Expectations"],
    status: "approved"
  },
  {
    title: "Adapting to Remote Collaboration Tools",
    category: "Other",
    excerpt: "I found online team projects disorganized and confusing.",
    what_happened: "Scattered chat messages and lost files caused missed task deadlines in group work.",
    what_helped: ["Set up a shared project board and repository", "Held brief 10-minute weekly sync calls", "Maintained clear task ownership"],
    what_changed: "Team productivity and clarity improved dramatically.",
    where_i_am_now: "Lead organized hybrid student project teams.",
    tags: ["Teamwork", "Organization", "Planning"],
    status: "approved"
  }
];

async function seedExperiences() {
  console.log(`🌱 Seeding Demo Experience Cards to Supabase... Total candidates: ${DEMO_EXPERIENCES.length}`);

  let embeddings = {};
  try {
    embeddings = require('./experience_embeddings.json');
  } catch (e) {}

  let upsertedCount = 0;
  let errorsCount = 0;

  for (let idx = 0; idx < DEMO_EXPERIENCES.length; idx++) {
    const exp = DEMO_EXPERIENCES[idx];
    const cardIndex = idx + 1;
    const deterministicId = `00000000-0000-4000-a000-${cardIndex.toString(16).padStart(12, '0')}`;
    const fullSituationText = `Title: ${exp.title}. Excerpt: ${exp.excerpt}. Situation: ${exp.what_happened}`.trim();
    const whatHelpedText = Array.isArray(exp.what_helped) ? exp.what_helped.join('; ') : (exp.what_helped || '');
    const embedding = embeddings[`seed-exp-${cardIndex}`] || null;

    const cardPayload = {
      id: deterministicId,
      category: exp.category,
      situation: fullSituationText,
      what_helped: whatHelpedText,
      tags: exp.tags || [],
      source_post_id: null,
      ...(embedding && embedding.length === 384 ? { embedding } : {}),
      updated_at: new Date().toISOString()
    };

    const { data: upsertData, error: upsertErr } = await dbClient
      .from('experience_cards')
      .upsert(cardPayload, { onConflict: 'id' })
      .select('id');

    if (upsertErr) {
      console.warn(`Failed to upsert demo card "${exp.title}":`, upsertErr.message);
      errorsCount++;
    } else {
      upsertedCount++;
    }
  }

  console.log(`=========================================`);
  console.log(`✅ Seed Complete!`);
  console.log(`   Upserted (Idempotent): ${upsertedCount}`);
  console.log(`   Errors: ${errorsCount}`);
  console.log(`   Total cards in seed set: ${DEMO_EXPERIENCES.length}`);
  console.log(`=========================================`);

  try {
    const EmbeddingService = require('../services/embedding.service');
    const embeddedCount = await EmbeddingService.seedExperienceEmbeddings(DEMO_EXPERIENCES);
    console.log(`=========================================`);
    console.log(`🧠 384D Text Embedding Status:`);
    console.log(`   ${embeddedCount}/${DEMO_EXPERIENCES.length} Experience Cards have embeddings.`);
    console.log(`=========================================`);
  } catch (e) {
    console.warn('Embedding seed warning:', e.message);
  }
}

if (require.main === module) {
  seedExperiences()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed script failed:', err);
      process.exit(1);
    });
}

module.exports = { seedExperiences, DEMO_EXPERIENCES };

