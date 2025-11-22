-- Import Must Reads from CSV
-- This script imports all must reads from the provided CSV file
-- Note: submitted_by and created_by are set to a default user ID (first user in profiles table)
-- You can update these later with specific user IDs if needed

-- Helper function to calculate week_start_date (Monday of the week)
CREATE OR REPLACE FUNCTION get_week_start_date(input_date DATE)
RETURNS DATE AS $$
DECLARE
  days_to_subtract INTEGER;
BEGIN
  -- Calculate days to subtract to get to Monday
  -- DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
  days_to_subtract := (EXTRACT(DOW FROM input_date)::INTEGER + 6) % 7;
  RETURN input_date - days_to_subtract;
END;
$$ LANGUAGE plpgsql;

-- Helper function to convert comma-separated tags to array
CREATE OR REPLACE FUNCTION tags_to_array(tags_text TEXT)
RETURNS TEXT[] AS $$
BEGIN
  IF tags_text IS NULL OR tags_text = '' THEN
    RETURN ARRAY[]::TEXT[];
  END IF;
  -- Split by comma, trim whitespace, filter empty strings
  RETURN (
    SELECT array_agg(trimmed_tag)
    FROM (
      SELECT TRIM(unnest(string_to_array(tags_text, ','))) AS trimmed_tag
    ) AS tags
    WHERE trimmed_tag != ''
  );
END;
$$ LANGUAGE plpgsql;

-- Get a default user ID for created_by and submitted_by
-- This uses the first user in the profiles table, or you can replace with a specific user ID
DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Get the first user from profiles table
  SELECT id INTO default_user_id FROM public.profiles LIMIT 1;
  
  -- If no users exist, raise an error
  IF default_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table. Please create a user profile first.';
  END IF;

-- Insert all must reads
INSERT INTO public.must_reads (
  article_title,
  title,
  article_url,
  url,
  category,
  source,
  notes,
  summary,
  tags,
  submitted_by,
  created_by,
  week_start_date,
  pinned,
  created_at,
  updated_at
) VALUES
(
  'From Dollar Dominance to the Slop Machine', -- article_title
  'From Dollar Dominance to the Slop Machine', -- title
  'https://kyla.substack.com/p/from-dollar-dominance-to-the-slop?r=ga0zq&utm_medium=ios&triedRedirect=true', -- article_url
  'https://kyla.substack.com/p/from-dollar-dominance-to-the-slop?r=ga0zq&utm_medium=ios&triedRedirect=true', -- url
  'Industry',
  'kyla scanlon',
  NULL,
  'How does the shift from creation to extraction in the U.S. economy, driven by the attention economy and financialization, threaten long-term competitiveness against countries like China?

The article argues that the U.S. has moved from building and creating value (infrastructure, technology, trust) to extracting value (through spectacle, financial engineering, and attention-grabbing content), undermining its own productive capacity and global standing. In contrast, China is investing in infrastructure, energy, and human capital, positioning itself for future dominance, while the U.S. risks eroding its foundations by prioritizing short-term gains and viral narratives over long-term creation and capacity.

This analysis is highly relevant to agency work in Strategy, Content, Brand, and Culture, highlighting the need to prioritize meaningful creation, long-term value, and trust over mere attention and spectacle.',
  tags_to_array('attention economy, extraction vs creation, US-China relations, dollar dominance, financialization, energy policy, clean energy, industrial policy, political spectacle, stablecoins, economic infrastructure, trust, social media, manufacturing competitiveness, public investment'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-18'::DATE),
  false,
  '2025-07-18'::TIMESTAMP,
  NOW()
),
(
  'Who''s Got the Monkey', -- article_title
  'Who''s Got the Monkey', -- title
  'https://www.med.unc.edu/uncaims/wp-content/uploads/sites/764/2014/03/Oncken-_-Wass-Who_s-Got-the-Monkey.pdf', -- article_url
  'https://www.med.unc.edu/uncaims/wp-content/uploads/sites/764/2014/03/Oncken-_-Wass-Who_s-Got-the-Monkey.pdf', -- url
  'Industry',
  'Harvard Business Review',
  NULL,
  'How can managers regain control of their time by effectively delegating responsibilities back to their subordinates? The article uses the "monkey on the back" metaphor to illustrate how managers often end up taking on their subordinates'' problems, leading to a loss of discretionary time and increased bottlenecks. It outlines practical steps for managers to transfer initiative back to their teams, emphasizing the importance of clear delegation, empowerment, and maintaining control over one''s own schedule.

This article directly relates to agency work in areas such as Strategy, CX, and Culture by highlighting the need for effective delegation, empowerment, and time management to foster a more productive, creative, and autonomous team environment.',
  tags_to_array('management, delegation, time management, empowerment, leadership, initiative, subordinates, organizational behavior, decision making, workplace productivity, managerial effectiveness'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-18'::DATE),
  false,
  '2025-07-18'::TIMESTAMP,
  NOW()
),
(
  'On Agency', -- article_title
  'On Agency', -- title
  'https://www.henrikkarlsson.xyz/p/agency?utm_source=post-email-title&publication_id=313411&post_id=167633827&utm_campaign=email-post-title&isFreemail=true&r=13nam&triedRedirect=true&utm_medium=email', -- article_url
  'https://www.henrikkarlsson.xyz/p/agency?utm_source=post-email-title&publication_id=313411&post_id=167633827&utm_campaign=email-post-title&isFreemail=true&r=13nam&triedRedirect=true&utm_medium=email', -- url
  'Culture',
  'Henrik Karlsson',
  NULL,
  'How can individuals cultivate true agency to solve problems and pursue meaningful goals, even when conventional paths seem blocked or unavailable?

The article explores the concept of agency as a blend of autonomy (defining your own goals) and efficacy (the ability to pursue and achieve them), using examples like filmmaker Werner Herzog to illustrate how high agency often means questioning defaults, finding creative solutions, and persisting despite setbacks or lack of external validation. The author argues that most problems are solvable with imagination, clear goals, and a willingness to take unconventional paths, and that agency is less about aggression and more about attunement to reality and values.

This perspective is directly relevant to agency work in Strategy, Content, Products, Brand, CX, creativity and technology, and Culture, as it emphasizes the importance of independent thinking, creative problem-solving, and value-driven action in achieving impactful results.',
  tags_to_array('agency,autonomy,efficacy,problem-solving,creativity,goal-setting,personal development,imagination,overcoming obstacles,authenticity,values,parenting,education,homeschooling,self-reliance,Werner Herzog,biography,decision-making,life lessons'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'Beyond vibe checks: a PM''s complete guide to evals', -- article_title
  'Beyond vibe checks: a PM''s complete guide to evals', -- title
  'https://www.lennysnewsletter.com/p/beyond-vibe-checks-a-pms-complete', -- article_url
  'https://www.lennysnewsletter.com/p/beyond-vibe-checks-a-pms-complete', -- url
  'Industry',
  'Lenny''s Newsletter, Aman Khan',
  NULL,
  'How can product managers move beyond intuition to make more effective, data-driven decisions in their roles?

The article explores the limitations of relying solely on "vibe checks"—gut feelings or informal assessments—in product management, and presents a comprehensive framework for PMs to make better decisions using structured processes, data, and clear communication. It emphasizes the importance of combining qualitative insights with quantitative analysis to drive product success.

This article is highly relevant to agency work in Strategy and Products, as it advocates for a balanced, evidence-based approach to decision-making that enhances product outcomes and client value.',
  tags_to_array('AI product management, evaluations, LLMs, prompt engineering, human feedback, code-based evals, LLM-based evals, AI testing, product quality, AI agents, hallucination, toxicity, correctness, open source tools, Phoenix, Ragas'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'Behind the Streams', -- article_title
  'Behind the Streams', -- title
  'https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40', -- article_url
  'https://netflixtechblog.com/behind-the-streams-live-at-netflix-part-1-d23f917c2f40', -- url
  'Technology',
  'Netflix Technology Blog',
  NULL,
  'How does Netflix manage the complexities of delivering live streaming content at scale?

The article explores the technical challenges and solutions involved in bringing live streaming to Netflix, detailing the architecture, infrastructure, and engineering decisions required to ensure reliability and high-quality experiences for viewers. It highlights the importance of real-time monitoring, adaptive streaming, and cross-team collaboration in overcoming the unique hurdles of live content delivery.

This article relates to agency work in technology, CX, and creativity by showcasing how innovative engineering and strategic problem-solving are essential for delivering seamless, engaging digital experiences at scale.',
  tags_to_array('Netflix, live streaming, video streaming architecture, cloud infrastructure, content delivery network, broadcast engineering, real-time metrics, playback optimization, scalability, reliability, testing, operational excellence, user experience, streaming technology'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'As the browser wars heat up, here are the hottest alternatives to Chrome and Safari in 2025', -- article_title
  'As the browser wars heat up, here are the hottest alternatives to Chrome and Safari in 2025', -- title
  'https://techcrunch.com/2025/07/14/as-the-browser-wars-heat-up-here-are-the-hottest-alternatives-to-chrome-and-safari-in-2025/', -- article_url
  'https://techcrunch.com/2025/07/14/as-the-browser-wars-heat-up-here-are-the-hottest-alternatives-to-chrome-and-safari-in-2025/', -- url
  'Technology',
  'TechCrunch, Lauren Forristal',
  '1. This TechCrunch piece highlights the newest wave of browser challengers, many AI-powered and privacy-forward.
2. It pairs well with this info from Kantar: The Rise of the Agentic Web and New AI Browser Battle – Kantar
3. Together, they paint a picture of a web experience shifting from passive browsing to agent-driven interaction.',
  'How are new browsers challenging Chrome and Safari in 2025, and what innovations are shaping the next era of web browsing?

The article highlights a surge of alternative browsers that are leveraging AI, privacy features, and user well-being tools to compete with Chrome and Safari. Key players include AI-powered browsers like Perplexity’s Comet, The Browser Company’s Dia, and Opera’s Neon, as well as privacy-focused options like Brave, DuckDuckGo, and Ladybird, and niche browsers such as Opera Air and SigmaOS that emphasize mindfulness and productivity.

This article is relevant to agency work in Strategy, Products, CX, and Technology, as it underscores the importance of innovation, user-centric design, and differentiation in a competitive digital landscape.',
  tags_to_array('web browsers, browser alternatives, AI-powered browsers, privacy, productivity, Chrome alternatives, Safari alternatives, open source, startups, mindful browsers, customization, ad blocking, generative AI, tech trends 2025'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'Trump Plans to Give A.I. Developers a Free Hand – NYT', -- article_title
  'Trump Plans to Give A.I. Developers a Free Hand – NYT', -- title
  'https://www.nytimes.com/2025/07/23/technology/trump-ai-executive-orders.html', -- article_url
  'https://www.nytimes.com/2025/07/23/technology/trump-ai-executive-orders.html', -- url
  'Technology',
  'The New York Times',
  '1. The White House has released its AI Action Plan — a proposal to loosen federal constraints on AI development and give private companies greater autonomy.
2. I can’t find a good critical analysis of this plan (just a lot from think tanks). The long-tail implications on innovation, data use, and AI ethics could be significant.
3. (Also: the White House’s site runs on WordPress to host that PDF - a reminder that open-source mandates still extend to the highest levels of government, even for domains that arguably need the most security.)',
  'How is the U.S. government under Trump seeking to regulate and shape the development and use of artificial intelligence through executive orders?

The article discusses a series of executive orders signed by President Trump aimed at increasing oversight, transparency, and national security measures around artificial intelligence technologies. These orders focus on setting new standards for AI development, requiring federal agencies to assess risks, and mandating disclosures from companies working with advanced AI systems.

This article highlights the growing importance of regulatory strategy and technological governance for agencies working at the intersection of technology, policy, and innovation.',
  tags_to_array('Donald Trump, executive orders, artificial intelligence, AI policy, technology regulation, US politics, tech industry, data centers, ideological bias, China, generative AI, export policy, deregulation, freedom of speech, American competitiveness, environmental regulation, workforce training'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'Can The Washington Post''s TikTok Guy Make It Without The Post?', -- article_title
  'Can The Washington Post''s TikTok Guy Make It Without The Post?', -- title
  'https://www.nytimes.com/2025/07/22/business/media/dave-jorgenson-video-washington-post.html', -- article_url
  'https://www.nytimes.com/2025/07/22/business/media/dave-jorgenson-video-washington-post.html', -- url
  'Industry',
  'The New York Times',
  '1. This has been interesting to follow. It’s not just about one guy - it reflects a broader media shift: the rise of individual creators with traditional credentials stepping away from institutions to build their own platforms. It echoes what we saw with Bon Appétit and BuzzFeed talent becoming stars in their own right back in 2018 - 2020 but now it’s happening with hard news + weather.
2. Pairs well this with piece about TikTok and Instagram continuing to replace traditional channels as go-to news sources: Instagram as a News Site – NYT
3. It also made me think of local journalism’s collapse and how that void is being filled by trusted “newsfluencers” (whether it be Mo News former CBS producer mentioned in that article, or weather (like I look to my local weather guys like Nor’Easter Nick / NorCast Media or Joe Martucci / Cup of Joe Weather who have built up Facebook reach after legacy publisher/broadcaster layoffs). This is part of a growing trend, as laid out in these two reports:
4. “Severe” shortage of local journalists in the U.S. – Nieman Lab
5. The Rise of Alternative Voices and News Influencers – Reuters Institute
6. It’s all super messy, and plays to the continued decade-long question on trust, authority & information on the web…',
  'How can a media organization leverage digital video and personality-driven content to engage younger audiences and redefine its brand identity?

The article discusses Dave Jorgenson’s impact at The Washington Post, where his creative and humorous TikTok videos have helped the legacy news outlet connect with Gen Z and younger viewers. It highlights how Jorgenson’s approach blends journalistic credibility with a playful, authentic tone, making news more accessible and shareable.

This demonstrates how agencies can use creativity and technology to enhance brand relevance and audience engagement, particularly through innovative content strategies.',
  tags_to_array('Dave Jorgenson, Washington Post, TikTok, YouTube, personal branding, digital media, journalism, social media, video content, news satire, media entrepreneurship, career transition'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'New Foods for 2025', -- article_title
  'New Foods for 2025', -- title
  'https://www.mnstatefair.org/new/food/', -- article_url
  'https://www.mnstatefair.org/new/food/', -- url
  'Fun',
  'Minnesota State Fair',
  NULL,
  'How does the Minnesota State Fair showcase innovation and diversity in food offerings for 2025?

The article highlights the new foods debuting at the 2025 Minnesota State Fair, featuring a wide array of creative dishes from diverse culinary traditions, including vegan, vegetarian, and globally inspired options, as well as inventive desserts and beverages. The list also introduces several new vendors, reflecting a commitment to culinary innovation and inclusivity.

This article relates to agency work in areas such as Content, Brand, CX, creativity and technology, and Culture by demonstrating how fresh ideas, diverse perspectives, and experiential offerings can enhance engagement and strengthen a brand’s connection with its audience.',
  tags_to_array('Minnesota State Fair, new foods, food trends, 2025, fair food, local vendors, international cuisine, desserts, beverages, vegan options, vegetarian options, gluten-free options, new vendors, cultural foods, specialty drinks, food innovation'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'The Search Rumor Swirling around Meta', -- article_title
  'The Search Rumor Swirling around Meta', -- title
  'https://digiday.com/marketing/the-search-rumour-swirling-around-meta/', -- article_url
  'https://digiday.com/marketing/the-search-rumour-swirling-around-meta/', -- url
  'Technology',
  'Digiday, Krystal Scanlon',
  NULL,
  'Is Meta preparing to make a major move into search advertising, and what could this mean for marketers and agencies? Meta is reportedly developing new search capabilities, with agency executives confirming the company is working on a search ad product likely powered by AI, though details and timelines remain unclear; improvements in Instagram and Facebook search, as well as Meta’s broader AI strategy, suggest a significant shift is coming, possibly with early tests before the 2025 holiday season.

This development is highly relevant for agencies focused on Strategy, Content, Brand, and Technology, as it signals new opportunities and challenges in search marketing and AI-driven advertising.',
  tags_to_array('Meta, search advertising, artificial intelligence, Instagram, Facebook, large language models, marketing, digital advertising, generative AI, social media platforms, ad innovation'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'How Trans Prisoners are Dealing with the Trump Administration Attacks', -- article_title
  'How Trans Prisoners are Dealing with the Trump Administration Attacks', -- title
  'https://defector.com/how-trans-prisoners-are-dealing-with-the-trump-administrations-attacks', -- article_url
  'https://defector.com/how-trans-prisoners-are-dealing-with-the-trump-administrations-attacks', -- url
  'Culture',
  'Defector, Hallie Lieberman',
  'Defector is my favorite site on the internet, arose from the ashes of Deadspin for those unfamiliar, and (besides sports) has some of the best politics and media coverage out there. Their championing of trans and inmates'' rights, in particular, is important and deep.',
  'How are transgender prisoners coping with the Trump administration''s policies that undermine their rights and safety?

The article explores the challenges faced by transgender prisoners in the U.S. as the Trump administration rolled back protections, making it harder for them to access appropriate housing and healthcare. It highlights the resilience and advocacy efforts of trans inmates and their allies in the face of increased discrimination and institutional barriers.

This article underscores the importance of strategy, advocacy, and inclusive culture in addressing systemic inequities and supporting marginalized communities.',
  tags_to_array('transgender rights, prison reform, Trump administration, gender-affirming care, LGBTQ, executive orders, discrimination, mental health, legal challenges, incarceration, human rights, sexual assault, advocacy'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'Norman Foster Profile', -- article_title
  'Norman Foster Profile', -- title
  'https://www.newyorker.com/magazine/2025/01/27/norman-foster-profile', -- article_url
  'https://www.newyorker.com/magazine/2025/01/27/norman-foster-profile', -- url
  'Culture',
  'The New Yorker, Ian Parker',
  'I don''t think I remember another recent profile where the answer to is this guy an artist or a sell-out and is this guy good or bad was so definitively both?',
  'How has Norman Foster shaped the global landscape of architecture and design through his relentless pursuit of innovation and control?

This article profiles Norman Foster, exploring his rise from modest beginnings to becoming one of the world’s most influential architects, known for iconic projects like Apple Park and the Reichstag dome. It details how Foster built Foster + Partners into a global powerhouse by blending boutique design quality with industrial-scale output, maintaining rigorous personal oversight, and cultivating a culture of continuous creative iteration, while also navigating the ethical and sustainability challenges of working with powerful clients and ambitious projects.

Foster’s approach exemplifies how strategy, brand, creativity, and technology can be integrated at scale, offering agencies a model for balancing visionary leadership with collaborative execution and operational excellence in complex, high-stakes environments.',
  tags_to_array('Norman Foster, architecture, design, modernism, engineering, urban development, sustainability, celebrity architects, Foster + Partners, skyscrapers, public buildings, corporate culture, innovation, art, global projects, luxury, image management, technology, urban planning, real estate, biography'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'How to Dig for Music Without Spotify', -- article_title
  'How to Dig for Music Without Spotify', -- title
  'https://pitchfork.com/thepitch/how-to-dig-for-music-without-spotify/', -- article_url
  'https://pitchfork.com/thepitch/how-to-dig-for-music-without-spotify/', -- url
  'Fun',
  'Pitchfork',
  'Spotify is (has been) part of the evil empire now and also the sound quality is awful',
  'How can music lovers discover new music without relying on Spotify and other major streaming platforms?

The article explores alternative methods for finding music, such as using independent blogs, online radio, Bandcamp, SoundCloud, and community-driven forums, emphasizing the value of curation and personal discovery over algorithm-driven recommendations. It highlights the richness and diversity of music that can be uncovered through more intentional and engaged listening practices.

This article underscores the importance of creativity, curation, and authentic content discovery in building unique brand experiences and fostering a vibrant culture.',
  tags_to_array('music discovery, streaming alternatives, Spotify criticism, digital culture, music algorithms, social media, Bandcamp, SoundCloud, TikTok, niche music communities, influencer critics, online music digging, microgenres, music platforms, music curation'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'AI Accelerators', -- article_title
  'AI Accelerators', -- title
  'https://drive.google.com/file/d/1ivaxUp2tyxXajb63NKQZWu9d_CfPhIUA/view?usp=drive_link', -- article_url
  'https://drive.google.com/file/d/1ivaxUp2tyxXajb63NKQZWu9d_CfPhIUA/view?usp=drive_link', -- url
  'Technology',
  'Code and Theory',
  NULL,
  'The provided link requires sign-in access and cannot be read directly. Please provide a publicly accessible link or attachment to proceed with the summary.',
  tags_to_array('Unable to access the content of the provided Google Drive link due to sign-in restrictions. Please provide a publicly accessible link or the article text for analysis.'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'Word Up: Inclusive Language Guide', -- article_title
  'Word Up: Inclusive Language Guide', -- title
  'https://www.figma.com/file/ddp4vQMk0CuI0Oz5Xh9XmK/Inclusive-Writing-Guide?type=design&node-id=0-1', -- article_url
  'https://www.figma.com/file/ddp4vQMk0CuI0Oz5Xh9XmK/Inclusive-Writing-Guide?type=design&node-id=0-1', -- url
  'Culture',
  'Code and Theory',
  NULL,
  'How can agencies use language to foster greater inclusion and representation in their work?

Language is a powerful tool for honoring differences, fostering authentic conversations, and cultivating diversity. Agencies should follow individuals'' self-identification, use person-first language, avoid stereotypes and outdated terms, and prioritize ongoing learning to ensure communications and creative outputs are inclusive and respectful.

This approach directly supports agency work by embedding inclusivity into strategy, content, brand, and culture, ensuring all outputs reflect and respect audience diversity.',
  tags_to_array('inclusive language, diversity, equity, ability, disability, addiction, age, appearance, gender, nationality, ethnicity, race, religion, sexuality, socioeconomic status, representation, stereotypes, person-first language, intersectionality, advertising, communication, identity, terminology, antiracism, body positivity, LGBTQIA+, cultural sensitivity, language evolution, bias, inclusion'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'The Click Is Dying, And It''s Taking Your Brand With It', -- article_title
  'The Click Is Dying, And It''s Taking Your Brand With It', -- title
  'https://www.forbes.com/sites/dangardner-1/2025/07/29/the-click-is-dying-and-its-taking-your-brand-with-it/', -- article_url
  'https://www.forbes.com/sites/dangardner-1/2025/07/29/the-click-is-dying-and-its-taking-your-brand-with-it/', -- url
  'Technology',
  'Forbes',
  NULL,
  'How should brands adapt as the traditional "click" becomes obsolete in the age of AI-driven, conversational interfaces?

The article argues that as AI transforms digital experiences from click-based navigation to conversational, agent-driven interactions, brands must shift their focus from optimizing for clicks to building emotional resonance and meaningful customer relationships. Success in this new landscape requires a strategic pivot toward AI-native experiences that prioritize tone, fluency, and genuine connection, rather than just efficiency or transactional functionality.

This shift is directly relevant to agency work in Strategy, CX, Brand, and Creativity, demanding a new mindset that balances technology with emotional impact to ensure brands remain relevant and resonant.',
  tags_to_array('AI, customer experience, digital marketing, brand strategy, conversational interfaces, automation, consumer behavior, emotional resonance, business transformation, marketing innovation'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-07-31'::DATE),
  false,
  '2025-07-31'::TIMESTAMP,
  NOW()
),
(
  'Want AI to mention your brand? Here''s how.', -- article_title
  'Want AI to mention your brand? Here''s how.', -- title
  'https://vincentorleck.substack.com/p/want-ai-to-mention-your-brand-heres', -- article_url
  'https://vincentorleck.substack.com/p/want-ai-to-mention-your-brand-heres', -- url
  'Industry',
  'Vincent Orleck',
  NULL,
  'How can brands ensure they are mentioned in AI-generated answers, and what platforms matter most for AI visibility today?

The article explains that as AI chatbots and search engines increasingly provide answers sourced from the web, the four most-cited platforms by AI are Reddit, Quora, YouTube, and Wikipedia. It details actionable strategies for brands to build authentic, high-quality content and engagement on these platforms, emphasizing that mentions—rather than just links—are now the key to being surfaced by AI, and that each platform requires a tailored, value-driven approach to participation.

This article is highly relevant to agency work in Strategy, Content, Brand, and CX, as it outlines how agencies must adapt their digital and content strategies to optimize for AI-driven discovery and ensure their clients’ brands are visible and credible in the evolving landscape of search and information retrieval.',
  tags_to_array('AI, brand visibility, SEO, answer engine optimization, large language models, Reddit, Quora, YouTube, Wikipedia, content strategy, digital marketing, community engagement, AI citations, marketing best practices, online reputation, knowledge sharing'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-08-23'::DATE),
  false,
  '2025-08-23'::TIMESTAMP,
  NOW()
),
(
  'Why Did a $10 Billion Startup Let Me Vibe-Code for Them—and Why Did I Love It?', -- article_title
  'Why Did a $10 Billion Startup Let Me Vibe-Code for Them—and Why Did I Love It?', -- title
  'https://www.wired.com/story/why-did-a-10-billion-dollar-startup-let-me-vibe-code-for-them-and-why-did-i-love-it/', -- article_url
  'https://www.wired.com/story/why-did-a-10-billion-dollar-startup-let-me-vibe-code-for-them-and-why-did-i-love-it/', -- url
  'Fun',
  'WIRED',
  NULL,
  'How is the rise of AI-assisted "vibe coding" transforming the nature of software development and the roles of human engineers at leading tech startups?

The article follows a journalist''s two-day immersion at Notion, a $10 billion startup, where she participates in "vibe coding"—using AI tools to write and debug code alongside human engineers. It explores how AI is rapidly accelerating feature development, changing workflows, and raising questions about productivity, job security, and the evolving definition of technical expertise, while highlighting both the excitement and anxiety this shift brings to the workplace.

This article is highly relevant to agency work in Strategy, Products, CX, creativity and technology, and Culture, as it illustrates how AI is reshaping collaboration, skill requirements, and the pace of innovation in digital product development.',
  tags_to_array('artificial intelligence, AI coding, vibe coding, startups, Notion, software development, pair programming, workplace culture, generative AI, productivity tools, job automation, tech industry, coding education, future of work'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-08-28'::DATE),
  false,
  '2025-08-28'::TIMESTAMP,
  NOW()
),
(
  '''KPop Demon Hunters'' slayed summer. Here''s what you need to know about them', -- article_title
  '''KPop Demon Hunters'' slayed summer. Here''s what you need to know about them', -- title
  'https://www.cnn.com/2025/08/20/entertainment/kpop-demon-hunters-explainer-movie', -- article_url
  'https://www.cnn.com/2025/08/20/entertainment/kpop-demon-hunters-explainer-movie', -- url
  'Fun',
  'CNN',
  NULL,
  'How did "KPop Demon Hunters" become a cultural phenomenon by blending music, animation, and supernatural storytelling?

The article explains how Netflix’s animated film “KPop Demon Hunters” became a massive hit by merging the global appeal of K-pop with supernatural adventure, featuring an all-girl group who fight demons while topping music charts. The film’s success is amplified by real-life celebrity voice talent, a chart-topping soundtrack, and a unique cross-genre approach that has led to both streaming and theatrical sing-along events.

This article highlights the importance of creative cross-genre storytelling and multimedia integration for agencies working in content, brand, and culture.',
  tags_to_array('K-pop,animated film,Netflix,movie soundtrack,supernatural,demons,girl group,streaming,celebrity voice cast,pop culture,box office,global music,teen audience'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-08-28'::DATE),
  false,
  '2025-08-28'::TIMESTAMP,
  NOW()
),
(
  'The Strategist''s Playbook', -- article_title
  'The Strategist''s Playbook', -- title
  'https://open.substack.com/pub/conceptbureau/p/the-strategists-playbook?r=ga0zq&utm_medium=ios', -- article_url
  'https://open.substack.com/pub/conceptbureau/p/the-strategists-playbook?r=ga0zq&utm_medium=ios', -- url
  'Industry',
  'Jasmine Bina, Concept Bureau',
  NULL,
  'How can strategists effectively navigate the complexities of modern agency work to deliver impactful results?

The article "The Strategist’s Playbook" outlines the essential skills, mindsets, and approaches that strategists need to succeed in today’s fast-evolving agency landscape. It emphasizes adaptability, curiosity, and the ability to synthesize diverse information into actionable insights, while also highlighting the importance of collaboration and continuous learning.

This article directly informs agency work in Strategy by providing a practical framework for developing strategic thinking, fostering creativity, and enhancing the agency’s ability to deliver value across content, brand, and client experience.',
  tags_to_array('strategy, mental models, business, culture, innovation, decision-making, branding, market analysis, organizational behavior, leadership, creativity, persuasion, systems thinking, competitive advantage, AI'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-09-02'::DATE),
  false,
  '2025-09-02'::TIMESTAMP,
  NOW()
),
(
  'AI is polytheistic, not monotheistic', -- article_title
  'AI is polytheistic, not monotheistic', -- title
  'https://balajis.com/p/ai-is-polytheistic-not-monotheistic', -- article_url
  'https://balajis.com/p/ai-is-polytheistic-not-monotheistic', -- url
  'Technology',
  'Balaji',
  'Ten thoughts on AI from a gifted, if not maybe slightly controversial, critical thinker.',
  'Is artificial intelligence best understood as a single, unified entity or as a collection of diverse, specialized systems?

The article argues that AI should be viewed as polytheistic—composed of many different models and systems with unique purposes—rather than monotheistic, as a single all-powerful intelligence. It explores how this perspective better reflects the current and future landscape of AI development, where multiple AIs coexist, compete, and collaborate.

This perspective encourages agencies to approach strategy, content, and technology with a mindset that leverages diverse AI tools and models, fostering creativity and adaptability in their work.',
  tags_to_array('artificial intelligence, polytheism, AGI, decentralization, AI constraints, prompting, verification, amplified intelligence, job automation, AI models, crypto, determinism, drones, open source, human-AI collaboration, technology trends'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-09-04'::DATE),
  false,
  '2025-09-04'::TIMESTAMP,
  NOW()
),
(
  'Why Kindness Isn''t a Nice to Have', -- article_title
  'Why Kindness Isn''t a Nice to Have', -- title
  'https://hbr.org/2025/07/why-kindness-isnt-a-nice-to-have', -- article_url
  'https://hbr.org/2025/07/why-kindness-isnt-a-nice-to-have', -- url
  'Culture',
  'Harvard Business Review',
  'HBR''s data-driven take on kindness (not to be confused with ''niceness'') as a business imperative is a good one',
  'How does a lack of kindness impact organizational performance and culture? The article argues that kindness is not just a "nice to have" but a critical factor in organizational success; when kindness is absent, trust erodes, communication breaks down, employee turnover increases, and customers ultimately feel the negative effects.

This insight underscores the importance of fostering a kind culture within agencies to strengthen team collaboration, enhance client relationships, and drive better outcomes in areas like Strategy, Brand, CX, and overall organizational health.',
  tags_to_array('organizational culture, kindness, leadership, workplace well-being, employee retention, team communication, trust, interpersonal skills, management'),
  default_user_id,
  default_user_id,
  get_week_start_date('2025-09-10'::DATE),
  false,
  '2025-09-10'::TIMESTAMP,
  NOW()
);

END $$;

-- Clean up helper functions (optional - you can keep them if you want)
-- DROP FUNCTION IF EXISTS get_week_start_date(DATE);
-- DROP FUNCTION IF EXISTS tags_to_array(TEXT);

-- After import, you may want to update submitted_by and created_by with specific user IDs
-- (Currently all records use the first user from the profiles table as default)
-- Example:
-- UPDATE must_reads 
-- SET submitted_by = (SELECT id FROM profiles WHERE full_name = 'Jonny Hawton' LIMIT 1),
--     created_by = (SELECT id FROM profiles WHERE full_name = 'Jonny Hawton' LIMIT 1)
-- WHERE article_title = 'From Dollar Dominance to the Slop Machine';
