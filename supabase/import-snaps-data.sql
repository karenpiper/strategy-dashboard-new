-- Import Historical Snaps Data
-- This script imports all historical snaps from the CSV file
-- Run this directly in the Supabase SQL Editor

-- Helper function to find profile ID by name (fuzzy matching)
CREATE OR REPLACE FUNCTION find_profile_by_name(name_text TEXT)
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  IF name_text IS NULL OR TRIM(name_text) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Try exact match (case-insensitive)
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(name_text))
  LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;
  
  -- Try partial match
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE LOWER(full_name) LIKE '%' || LOWER(TRIM(name_text)) || '%'
  LIMIT 1;
  
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;
  
  -- Try matching first name
  IF POSITION(' ' IN TRIM(name_text)) > 0 THEN
    SELECT id INTO profile_id
    FROM public.profiles
    WHERE LOWER(full_name) LIKE LOWER(SPLIT_PART(TRIM(name_text), ' ', 1)) || '%'
    LIMIT 1;
  END IF;
  
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql;

-- Insert all snaps
-- Note: 
--   - from_user_id should match submitted_by (who sent the snap)
--   - to_user_id should match mentioned_user_id (who the snap is for)
--   - message should match snap_content (the snap message content)
-- Since these have NOT NULL constraints, we use COALESCE to ensure they always have values
INSERT INTO public.snaps (date, snap_content, mentioned, mentioned_user_id, submitted_by, from_user_id, to_user_id, message)
SELECT
  date_val,
  content_val,
  mentioned_val,
  mentioned_user_id_val,
  submitted_by_val,
  COALESCE(submitted_by_val, mentioned_user_id_val, (SELECT id FROM public.profiles LIMIT 1)) as from_user_id_val,
  COALESCE(mentioned_user_id_val, submitted_by_val, (SELECT id FROM public.profiles LIMIT 1)) as to_user_id_val,
  content_val as message_val
FROM (
  VALUES
('2011-01-01'::DATE, 'Way to go on the award season sprint', 'Will Leivenberg', find_profile_by_name('Will Leivenberg'), NULL),
('2011-01-01'::DATE, 'Thanks for pulling together an inspiring session today!', 'Will Leivenberg', find_profile_by_name('Will Leivenberg'), NULL),
('2011-01-01'::DATE, 'You saved my life today.', NULL, NULL, NULL),
('2011-08-01'::DATE, 'for the dashboard that you''re about to see, which I won''t have any spoilers about, but she did so much work on her own volition, that''s something that I''m so excited about. That''s really fucking cool. And I know that she''ll be the first to, like, deflect a lot of praise for that to people who helped her and gave her feedback. But like, she did so much on this, just totally a passion project, and we''re all going to have, like, a better time during our day because of that, and that''s really fucking cool.', 'Karen Piper', find_profile_by_name('Karen Piper'), find_profile_by_name('Pat McQueen')),
('2023-01-25'::DATE, 'snaps to karen for an incredible and on time tipico launch, and continued growth opportunities unlocking in their casino biz and product work', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-03-01'::DATE, 'I''d love to give a snap to Karen who jumped into a teams meeting with myriad tech difficulties and still manage to present an entire campaign strat brief to the client in 30 mins!', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-03-01'::DATE, 'Snaps to KP for being the most supportive partner who is always ready to jump in when I’m overloaded', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-03-01'::DATE, 'KP for being the most wholesome guide, and all-seer.', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-03-01'::DATE, 'Karen for taking on more when her days are full, always delivering work that lifts up the strategy practice', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-03-01'::DATE, 'Speaking of "Snaps" (he used to work at Snapchat :sweat_smile:).. Jonny, warmest welcome to you and welcome to your first #notbrandstrategy meeting! I know everyone says this but I''m GENUINELY so excited to work with and exchange ideas with you considering your background rooted in youth culture and pushing the envelope. More importantly than your work history, everything I hear about you sounds like you are often the most interesting human in the room! Wishing you a warm and smooth start to your time here; may you feel welcomed and empowered!', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-04-13'::DATE, 'Snaps and congratulations for Anne, for brilliant unification, pristine thinking and bosslike editorial chops on Blick!', 'Anne Sachs', find_profile_by_name('Anne Sachs'), NULL),
('2023-04-13'::DATE, 'For Jonny for his incredible leadership and astute insights on ConEd.', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-04-13'::DATE, 'Jonny for the solid and steady leadership across Con Edison, clients have never been happier and it''s clear he was the right man for the job.', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-04-13'::DATE, 'Marcos for jumping in head first, asking all the right questions and bringing good vibes to every meeting, so great to have you on the team', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-04-13'::DATE, 'For Marcos for jumping right in on ConEd with fabulous energy and spirit.', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-04-13'::DATE, 'For KP for continuous collaboration, diligent guidance, and quest for us to stay ahead of the curve.', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-05-04'::DATE, 'Jonny for all his guidance and the best ideas on a most complex presentation.', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-05-04'::DATE, 'KP for being an all encompassing, super inspiring, organization mega boss.', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-05-04'::DATE, 'Snaps to Karen for always steering the ship with a positive attitude no matter how much she has going on!', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-05-04'::DATE, 'Snaps to Jonny for steering the Con Ed ship and keeping it so fetch', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-05-04'::DATE, 'Marcos for showing us the light for very complex campaign planning.', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-05-04'::DATE, 'Snaps to Marcos for jumping in and hitting the ground running on Con Ed.', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-05-04'::DATE, 'Snaps to Jonny for fire fits on calls', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-05-04'::DATE, 'Jonny For his infinite wisdom and advice on the ConEd evergreen briefs. I want to be like Jonny when I grow up.', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-05-04'::DATE, 'snaps for Marcos - for not just taking the status quo but instead finding ways for how we can do things better', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-05-04'::DATE, 'SNAPS to Marcos for being an all-star (pun intended) partner on the Rockets RFP!', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-05-04'::DATE, 'Snaps to Karen for going deep into Gen Z''s challenging relationship with sports fandom for a quick-turn pitch to UA. Perhaps not her favorite way to spend a Sunday but she nailed it.', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-05-04'::DATE, 'Anne for her crystal clarity and on all things narrative.', 'Anne Sachs', find_profile_by_name('Anne Sachs'), NULL),
('2023-05-04'::DATE, 'Snaps to Jonny for continuing to make sense of the ConEd madness, who knew newsletters could be such a headache.', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-05-04'::DATE, 'Snaps to Karen for being a pitch queen and for some iconic slacks', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-05-04'::DATE, 'Karen For masterfully chopping up and distilling so so so so many ideas into 3 creative territories for the Rocket pitch due in 48 hours. It was like watching Iron Chef: Strategy edition.', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-05-04'::DATE, 'Snaps to Karen for asking the best end of meeting questions', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-06-01'::DATE, 'Snaps to Karen, for always having great material to share and help give a good point of view and providing me some great thoughts on consumer journey stuff this week', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-06-01'::DATE, 'Snaps to Devorne, Matas, Anne and Kirstyn for the JPMC stuff last week, it was so much having like a nine hour session with the clients and then two days pretty much full of workshops and thinking about workshops.', 'Anne Sachs', find_profile_by_name('Anne Sachs'), NULL),
('2023-06-01'::DATE, 'snaps for Marcos for doing an amazing job. leading the strategy on a whole bunch of Con Ed stuff and doing a really good job working with the creative team, keeping them on the straight and narrow and collaborating with them really well and I''ve heard lots of great things from both production and creative so snaps to Marcos.', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-06-01'::DATE, 'Snaps to Karen for being the woman I want to be when I grow up.', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-06-22'::DATE, 'Snaps to Yenteen for diving right into a pitch on her first week at Code and making it look easy!! Her enthusiasm, collaboration and fast research skills are seen and appreciated.', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-06-22'::DATE, 'Marcos for bringing a business owner mindset to his work and questioning how things have been done before to make them better', NULL, NULL, NULL),
('2023-06-22'::DATE, 'Snaps to Stacy, Sara, Julia, and Yenteen for making the Qualcomm pitch FUN and continuing to push the work forward', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-06-22'::DATE, 'Snaps to Karen for being a playlist queen, keeping it chill and on track on JPMC, and for the flag pole, and team cheerleader', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-07-27'::DATE, 'Snaps to KP for always making space.', NULL, NULL, NULL),
('2023-07-27'::DATE, 'Snaps to KP', NULL, NULL, NULL),
('2023-07-27'::DATE, 'snaps to you KP', NULL, NULL, NULL),
('2023-07-27'::DATE, 'Snaps to Yenteen', NULL, NULL, NULL),
('2023-08-03'::DATE, 'Marcos for always being up for a challenge', NULL, NULL, NULL),
('2023-08-03'::DATE, 'Snaps to Jonny for defending his home against bears.', NULL, NULL, NULL),
('2023-08-03'::DATE, 'snaps to karen for being perfect in every way, the best thought partner, team leader, most supportive and encouraging', NULL, NULL, NULL),
('2023-08-03'::DATE, 'snaps to yenteen for her consistent curiosity and diligence on every workstream shes on', NULL, NULL, NULL),
('2023-08-03'::DATE, 'Yenteen for help barbie teach ConEd how to use the power collaborations', NULL, NULL, NULL),
('2023-08-03'::DATE, 'Snaps to Yenteen for always killing it on ConEd.', NULL, NULL, NULL),
('2023-08-03'::DATE, 'I know I said this as a group last week but I want to snap MARCOS for his work on the shore capital pitch. He pushed outside his comfort zone, and rather than frankensteining a deck together, developed a unique yet succinct narrative while schooling himself on a new space very quickly.', NULL, NULL, NULL),
('2023-08-03'::DATE, '*Snaps to Jonny, Stacy, Stef, Adi for letting me pick their very very very smart brains for the Shore Capital Pitch.', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), NULL),
('2023-08-03'::DATE, 'Snaps to Jonny for being a much needed breath of fresh air in an otherwise hazy week', NULL, NULL, NULL),
('2023-09-21'::DATE, 'Yenteen - Went from intern to fulltime and is outperforming everyone, even myself. She is getting into it, getting on calls with the consultant who used to be a CMO, she gets on calls with so much perspective. You’re just really killing it!', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-09-21'::DATE, 'Snaps to KP and Matas (and Devorne) -- JPMC has gone from feeling like it has some challenges and turned around the vibes in just 48 hours time, and done it while making the work very enjoyable for everyone on it. fun, excited to wake up kind of fun. thank you!', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-09-21'::DATE, 'KP and Matas for steering the jpmc ship!', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-09-21'::DATE, 'Laura - you’ve just come in and you’re a breath of fresh air. So excited to see all that you’re able to do with us!', 'Laura Casinelli', find_profile_by_name('Laura Casinelli'), NULL),
('2023-10-05'::DATE, 'Snaps to Marcos for saving the day and doing a fantastic job on the TCDRS pitch. The clients were mind-blown and we couldn’t have gotten there without him!', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-10-05'::DATE, 'Snaps to Yenteen for presenting her first creative brief to the social pod creatives as well as her commitment to supporting and collaborating with the creatives which ofc leads to better work! and extra snaps for suggesting a fast solve to make the linkedin language more custom for the platform.', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-10-05'::DATE, 'Snaps to Stef Yenteen and Florence for building a smart and thorough research, insights, and territories deck for Lazard Asset Management', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-10-05'::DATE, 'Snaps to Laura for juggling a bunch of competing priorities and helping guide us on the ShowingTime+ pitch', 'Laura Casinelli', find_profile_by_name('Laura Casinelli'), NULL),
('2023-10-12'::DATE, 'snaps to Laura for crushing it on the showingtime+ pitch', 'Laura Casinelli', find_profile_by_name('Laura Casinelli'), NULL),
('2023-10-12'::DATE, 'snaps to yenteen for transitioning onto social pod seamlessly and taking on any challenge headed her way', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-10-12'::DATE, 'snaps to marcos for a super informative and valuable work share last brand meeting', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), NULL),
('2023-10-12'::DATE, 'snaps to JPMC team. great presentation yesterday after months of not so great presentations. Matas kicked ass!', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-10-12'::DATE, 'snaps to the whole LAM team!', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-11-30'::DATE, 'snaps to yenteen for stepping in to help with an urgent inclusive strat need and being so thorough and wonderful to collaborate with!', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-11-30'::DATE, 'Snaps to Yenteen for quickly getting up to speed on ConEd to put a great brief together within an extremely tight timeline.', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-11-30'::DATE, 'Snaps to Karen for surviving her second week of being my manager (kidding) (sort of)', 'Karen Piper', find_profile_by_name('Karen Piper'), NULL),
('2023-11-30'::DATE, 'Snaps to Yenteen and Stef for consistently high-quality work on LAM', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-11-30'::DATE, '@laura.casinelli', NULL, NULL, NULL),
('2023-11-30'::DATE, 'Snaps to Marti, Florence, and Julia for all of the hard work on Prologis research!!', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2023-11-30'::DATE, 'Snaps to Yenteen for her thoughtful work on ETS', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), NULL),
('2024-08-15'::DATE, 'Best birthday twin!', NULL, NULL, find_profile_by_name('Karen Piper')),
('2025-01-01'::DATE, 'The best. The Best. THE BEST.', NULL, NULL, find_profile_by_name('Karen Piper')),
('2025-01-01'::DATE, 'A TRUE PARTNER IN CRIME.', NULL, NULL, find_profile_by_name('Karen Piper')),
('2025-07-09'::DATE, 'Crushing. She was a big part of the workshop and did a great job. I''m really happy to be working with her.', 'Millie Tunnell', find_profile_by_name('Millie Tunnell'), find_profile_by_name('Scott Lindenbaum')),
('2025-07-16'::DATE, 'Laura has been an awesome partner on Stand Together. It''s really early but she''s been so thoughtful and proactive. Loving partnering with her on this.', 'Laura Casinelli', find_profile_by_name('Laura Casinelli'), NULL),
('2025-07-17'::DATE, 'just wanted to shout out Millie -- she''s bringing so much to this tricky JBL project. It''s a first of its kind here at Code and she''s new to boot, so it''s not easy to figure out what insights might add value. But she''s killing it.', 'Millie Tunnell', find_profile_by_name('Millie Tunnell'), find_profile_by_name('Anne Sachs')),
('2025-07-28'::DATE, 'If brilliance were a sandwich, Adam would be the whole deli!', 'Adam Kauder', find_profile_by_name('Adam Kauder'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Anne''s so sharp she could slice bread just by looking at it!', 'Anne Sachs', find_profile_by_name('Anne Sachs'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Arjun doesn’t just think outside the box—he’s turned it into a rocket ship!', 'Arjun Kalyanpur', find_profile_by_name('Arjun Kalyanpur'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'John''s ideas are so bright, they need SPF 50!', 'John Beadle', find_profile_by_name('John Beadle'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Jonny''s got more charm than a wizard’s bracelet!', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Lucy brings more sparkle than a disco ball at noon!', 'Lucy Ye', find_profile_by_name('Lucy Ye'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Matt''s so dependable, even gravity leans on him for support!', 'Matt Stephens', find_profile_by_name('Matt Stephens'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Pat’s got more moves than a caffeinated octopus!', 'Pat McQueen', find_profile_by_name('Pat McQueen'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Seven’s so cool, ice cubes ask them for tips!', 'Seven Harkey', find_profile_by_name('Seven Harkey'), find_profile_by_name('Karen Piper')),
('2025-07-28'::DATE, 'Steven’s mind is like a Swiss Army knife—sharp, handy, and always surprising!', NULL, NULL, find_profile_by_name('Karen Piper')),
('2025-07-29'::DATE, 'There is literally nothing she doesn''t know.', 'Robyn Matza', find_profile_by_name('Robyn Matza'), find_profile_by_name('Karen Piper')),
('2025-08-14'::DATE, 'Jon is the bridge between structure and strategy. Resourceful, insightful, and a joy to work with (and learn from).', 'Jon Novick', find_profile_by_name('Jon Novick'), find_profile_by_name('Seven Harkey')),
('2025-08-14'::DATE, 'The lone content strategist on the T. Rowe Price team, Susannah brings strategic, user-centered thinking, copywriting chops, and constant curiosity. Raising the bar for both the client and the agency.', 'Susannah Green', find_profile_by_name('Susannah Green'), find_profile_by_name('Seven Harkey')),
('2025-08-14'::DATE, 'Anne warms up the room and sharpens the work. When I have meetings or presentations with Anne, I always leave a little smarter.', 'Anne Sachs', find_profile_by_name('Anne Sachs'), find_profile_by_name('Seven Harkey')),
('2025-08-19'::DATE, 'Millie added such smart ideas to our JBL competitive audit, from unexpected examples to formats that helped synthesize a whole lot of info. And the client LOVED the final presentation!', 'Millie Tunnell', find_profile_by_name('Millie Tunnell'), find_profile_by_name('Anne Sachs')),
('2025-08-20'::DATE, 'Grace has been a huge help in digging into tools and process whenever I have questions. I truly appreciate our DMs and all the help you''ve given me from your data and tool expertise!', 'Grace Zec', find_profile_by_name('Grace Zec'), NULL),
('2025-08-20'::DATE, 'making clients fall in love with smart, every. damn. day.', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), find_profile_by_name('Karen Piper')),
('2025-08-21'::DATE, '[Time.com] are eager to see how the redesign of time.com is performing, and Matt has been instrumental to creating those reports. So appreciate your help.', 'Matt Stephens', find_profile_by_name('Matt Stephens'), find_profile_by_name('Tomás Orihuela')),
('2025-08-21'::DATE, 'such a great person to be partnered with on a first project. The gaps he closes for me, the you know, impressive modeling, on the strategy, on managing the clients, all of that stuff has just been such a treat. And I feel so grateful to be set up to succeed in this way. The whole team was amazing also. But Arjun has been a huge,', NULL, NULL, NULL),
('2025-08-21'::DATE, 'just kind of commandeering the whole building in the most Karen Campos of ways, but in a way that gives the client a ton of confidence. And it''s like totally running the show and rolling with the punches, despite us getting into screens two weeks later than we had anticipated. So it''s like a hugely impressive job.', 'Karen Campos', find_profile_by_name('Karen Campos'), find_profile_by_name('Pat McQueen')),
('2025-08-21'::DATE, 'for being fantastic leaders on this project [Karma]', 'Julian Alexander,Jess Volodarsky', find_profile_by_name('Julian Alexander,Jess Volodarsky'), find_profile_by_name('Yenteen Hu')),
('2025-08-21'::DATE, 'for their promotion we celebrated in Slack, but I don''t think in person yet', 'Jess Volodarsky', find_profile_by_name('Jess Volodarsky'), find_profile_by_name('Pat McQueen')),
('2025-08-21'::DATE, 'for their promotion we celebrated in Slack, but I don''t think in person yet', 'Tomás Orihuela', find_profile_by_name('Tomás Orihuela'), find_profile_by_name('Pat McQueen')),
('2025-08-21'::DATE, 'For jumping into the DoorDash RFP and adding a ton of value immediately to a very fast (and super exciting) RFP.', 'Anna Kim', find_profile_by_name('Anna Kim'), find_profile_by_name('Karen Piper')),
('2025-08-21'::DATE, 'For jumping into the DoorDash RFP and adding a ton of value immediately to a very fast (and super exciting) RFP.', 'Yeji Seoung', find_profile_by_name('Yeji Seoung'), find_profile_by_name('Karen Piper')),
('2025-08-21'::DATE, 'It''s been amazing to see you jump into the NYPost work and see the rigor and detail you bring to the table', 'Leann Down', find_profile_by_name('Leann Down'), find_profile_by_name('Karen Piper')),
('2025-08-21'::DATE, 'Tackling the meatiest of pitches for Visa Brand Architecture, and delivering a smart and concise approach on a blisteringly fast timeline', 'Laura Casinelli', find_profile_by_name('Laura Casinelli'), find_profile_by_name('Karen Piper')),
('2025-08-26'::DATE, 'for her commit to swearing (swidt??) and this very vibey and useful dashboard!', 'Karen Piper', find_profile_by_name('Karen Piper'), find_profile_by_name('Rebecca Smith')),
('2025-08-28'::DATE, 'This guy is a hero jumping in to lead Beazer Homes over the finish line!', 'John Beadle', find_profile_by_name('John Beadle'), NULL),
('2025-09-03'::DATE, 'Big shoutout to Guarang for all the ways he''s been stepping up on TIME, owning more and more every day! He''s a great partner, making sprint planning and grooming much smoother, and owning leadership decks too!', 'Gaurang Agarwal', find_profile_by_name('Gaurang Agarwal'), find_profile_by_name('Tomás Orihuela')),
('2025-09-03'::DATE, 'For delivering an awesome brand positioning and vis ID for Karma in *record time*', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), find_profile_by_name('Karen Piper')),
('2025-09-03'::DATE, 'For jumping in to be a (very very useful) second brain on BCG and DoorDash', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), find_profile_by_name('Karen Piper')),
('2025-09-03'::DATE, 'KP for vibe coding this whole dashboard like it''s not a big deal', 'Karen Piper', find_profile_by_name('Karen Piper'), find_profile_by_name('Tomás Orihuela')),
('2025-09-04'::DATE, 'Yenteen gets a HUGE SHOUTOUT for being a complete beast; work ethic, EQ, strategy intuition and collaboration. She''s done nothing but over-deliver at every junction (with a smile on her face and an infectious energy).', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), find_profile_by_name('Julian Alexander')),
('2025-09-05'::DATE, 'shoutout to Yenteen for not only asking about and advocating for the projects I''m interested in, but even STEPPING UP to take on some of the work so I could go focus on said interests. Truly a team player and so grateful she''s here<3', 'Yenteen Hu', find_profile_by_name('Yenteen Hu'), find_profile_by_name('Deedy Chang')),
('2025-09-08'::DATE, 'Millie is stepping up in a major way on Amazon! Taking on a set of new briefs and making our team look good.', 'Millie Tunnell', find_profile_by_name('Millie Tunnell'), find_profile_by_name('Adam Kauder')),
('2025-09-10'::DATE, 'Snaps to Marcos for always being an incredible thought partner on Con Edison, and for smashing the presentation today!', 'Marcos Alonso', find_profile_by_name('Marcos Alonso'), find_profile_by_name('Yenteen Hu')),
('2025-09-10'::DATE, 'Snaps to Deedy for getting such an impressive amount of content into the Con Edison competitive audit, in such a clean, clear, and efficient way. It really demonstrates and captures the rigor of our work, which she has synthesized and presented about beautifully.', 'Deedy Chang', find_profile_by_name('Deedy Chang'), find_profile_by_name('Yenteen Hu')),
('2025-09-26'::DATE, 'Snaps to Laura for leading a thoughtful and productive work sesh with the New York Post team! Love it when a work session ends with everyone -- client included -- feeling like it was time well spent!', 'Laura Casinelli', find_profile_by_name('Laura Casinelli'), find_profile_by_name('Anne Sachs')),
('2025-10-06'::DATE, 'Arthur has been really fantastic on just being a voice of reason, helping out, leaning in when we have a gap, and we''re trying to kind of figure that out. I just really appreciate partnering with you, so thank you.', 'Arthur Alves Martinho', find_profile_by_name('Arthur Alves Martinho'), find_profile_by_name('John Beadle')),
('2025-10-15'::DATE, 'Thank you for jumping in with enthusiasm and understanding to the NYP GWI work while I was feeling frustrated and overwhelmed!', 'Karina Pino', find_profile_by_name('Karina Pino'), find_profile_by_name('Jordan Disick')),
('2025-10-16'::DATE, 'She drove a significant percentage of the work that went into the AT&T deck. she''s been a really valuable provider. So just want to give the snap there because that was not within the expectations of a junior strategist this early.', 'Kaki Joiner', find_profile_by_name('Kaki Joiner'), find_profile_by_name('Adam Kauder')),
('2025-10-16'::DATE, 'you guys have pulled together a really amazing pitch for BPS and so smoothly.', 'Arjun Kalyanpur,Julian Alexander', find_profile_by_name('Arjun Kalyanpur,Julian Alexander'), find_profile_by_name('Karen Piper')),
('2025-10-16'::DATE, 'For Amtrak! but the vibes coming out of, like, these are really thorough. These are really evolved. They all have prototypes. We''ve told the holistic story from brand to product to tech to design is super fucking impressive.', 'Scott Lindenbaum', find_profile_by_name('Scott Lindenbaum'), find_profile_by_name('Pat McQueen')),
('2025-10-16'::DATE, 'For writing a piece that at age published in full in its entirety, which is pretty unheard of', 'Molly McGlew', find_profile_by_name('Molly McGlew'), find_profile_by_name('Karen Piper')),
('2025-10-16'::DATE, 'The CEO presentation is in a couple weeks and team has been working so well together between product and engineering, and it''s been great to see.', 'Adam Rosenberg', find_profile_by_name('Adam Rosenberg'), find_profile_by_name('Robyn Matza')),
('2025-10-16'::DATE, 'We''re wrapping up JPMC signage, and Sreeram has been a pillar in getting the dev team organized. Literally the best experience of not having to be constantly pinging people', 'Sreeram Venkataramani', find_profile_by_name('Sreeram Venkataramani'), find_profile_by_name('Karen Campos')),
('2025-10-16'::DATE, 'keeping the project going smooth, and everyone''s feeling pretty confident that we''re still going to be able to move forward and produce something amazing', 'Rebecca Smith', find_profile_by_name('Rebecca Smith'), NULL),
('2025-10-16'::DATE, 'Great presentation that the client loved and that. We, you know, was really the fruit of collaborations between Strat and Dart', 'Leann Down,Jordan Disick,Lucy Ye,Karina Pino', find_profile_by_name('Leann Down,Jordan Disick,Lucy Ye,Karina Pino'), find_profile_by_name('Laura Casinelli')),
('2025-10-16'::DATE, 'she''s doing so amazing and so well that her manager, who was on iheart like the lead product manager, is not even getting backfilled because Shawna''s just owning the product and she''s doing so amazing.', 'Shanna Fischzang', find_profile_by_name('Shanna Fischzang'), find_profile_by_name('Karen Campos')),
('2025-10-16'::DATE, 'For becoming a father. Coming back. Having a cute kiddo, following in the long lineage of parents on this team who are somehow balancing having a little one at home and doing the controlled chaos that is the job.', 'Jon Novick', find_profile_by_name('Jon Novick'), find_profile_by_name('Pat McQueen')),
('2025-10-16'::DATE, 'For the dashboard for the NY Post. Another great Strategy. And research collaboration and cross pollination.', 'Anne Sachs', find_profile_by_name('Anne Sachs'), find_profile_by_name('Laura Casinelli')),
('2025-10-16'::DATE, 'Having the honor to work with Karen as we work through a lot of stuff, and it''s always a pleasure and wonderful and constantly learning a lot.', 'Karen Campos', find_profile_by_name('Karen Campos'), find_profile_by_name('Jon Novick')),
('2025-10-17'::DATE, 'For being an amazing contributor to every single project she get''s put on—and for pushing the work forward with kind, graceful but intelligent pushes at every turn.', NULL, NULL, NULL),
('2025-10-18'::DATE, 'Killer upfront on Shell.', 'Karen Piper', find_profile_by_name('Karen Piper'), find_profile_by_name('Adam Kauder')),
('2025-10-24'::DATE, 'For contributing such insightful, strategic thinking for the Hornitos pitch', 'Benaelle Benoit', find_profile_by_name('Benaelle Benoit'), find_profile_by_name('Anne Sachs')),
('2025-10-24'::DATE, 'For putting together a beautiful pitch for Empower -- so smart, so smooth, a Jess classic', 'Jess Volodarsky', find_profile_by_name('Jess Volodarsky'), find_profile_by_name('Anne Sachs')),
('2025-10-24'::DATE, 'for putting together an awesome pitch for Broadridge', 'Jonny Hawton', find_profile_by_name('Jonny Hawton'), find_profile_by_name('Karen Piper'))
) AS t(date_val, content_val, mentioned_val, mentioned_user_id_val, submitted_by_val);

-- Verify import
SELECT 
  COUNT(*) as total_snaps,
  COUNT(DISTINCT mentioned_user_id) as unique_mentioned_users,
  COUNT(DISTINCT submitted_by) as unique_submitters,
  COUNT(CASE WHEN submitted_by IS NULL THEN 1 END) as anonymous_snaps
FROM public.snaps;