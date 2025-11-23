-- Import Pipeline Projects from CSV
-- This script imports data from Pipeline-Updates.csv into the pipeline_projects table
-- Note: You may need to adjust the created_by UUID to match an actual user in your profiles table

-- First, get a user ID to use as created_by (using the first user in profiles)
-- If you want to use a specific user, replace the subquery with their UUID
DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Get the first user from profiles table, or use a default if none exists
  SELECT id INTO default_user_id FROM public.profiles LIMIT 1;
  
  -- If no users exist, you'll need to manually set created_by for each insert
  IF default_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table. Please ensure at least one user exists.';
  END IF;

  -- Insert pipeline projects
  INSERT INTO public.pipeline_projects (name, type, description, due_date, lead, notes, status, team, url, tier, created_by)
  VALUES
    ('Abbott', NULL, NULL, '2025-08-29', 'Zack Botos', 'RFI submitted 8/29, awaiting next steps', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('Air Force', NULL, NULL, '2025-07-01', 'Zack Botos', 'awaiting next steps post-RFI submission', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('Al-Nasr', 'Platform Work', 'Digital fan engagement platform', '2025-07-01', 'Arjun Kalyanpur', 'awaiting next steps', 'Long Lead', 'Josh Currie,Carlos Matias', NULL, 2, default_user_id),
    ('Amtrak', NULL, NULL, '2025-10-03', 'Pat McQueen', '''- Beautiful 154-slide deck submitted today
- Setting new bar for proposal quality
- Includes technical appendix (80-147 pages)', 'Pending Decision', NULL, NULL, 1, default_user_id),
    ('Baileys', 'Brand and Campaign', NULL, '2025-10-13', 'Craig Elimeliah', 'Creative brief in design (Scott working on infographic version)', 'In Progress', NULL, NULL, 3, default_user_id),
    ('Baltimore Sun', 'Digital Transformation', 'Website + app redesign and redevelopment', '2025-09-24', NULL, 'Proposal submitted, notification of shortlisted agencies expected by Friday, October 24th.', 'In Progress', NULL, NULL, 2, default_user_id),
    ('Belk', 'Platform Work', 'Ecom - Prepping site and app audit ', '2025-08-01', NULL, 'pending next steps following audit submission', 'Long Lead', NULL, NULL, 0, default_user_id),
    ('Blackstone', 'Brand Strategy and Campaign Platform', 'Intro meeting focus on scaling mid-funnel content', '2025-10-31', 'Karen Piper', NULL, 'In Progress', NULL, NULL, 2, default_user_id),
    ('CACI', NULL, NULL, '2025-07-01', 'Zack Botos', 'in holding pattern with DOD ', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('Capital One', 'Staff Augmentation', 'Engineering and Product staff aug ', '2025-08-01', NULL, 'sent creds, awaiting MSA', 'Long Lead', NULL, NULL, 0, default_user_id),
    ('Citadel Research', 'Citadel', NULL, '2025-08-10', 'Pat McQueen,Lucy Ye', 'Establishing a research framework to bring Citadel closer to their target employees', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('CNN', 'Design', 'social design system ', '2025-10-24', 'Craig Elimeliah', 'Regrouping with the client on Friday 10/24 to discuss approach', 'In Progress', NULL, NULL, 2, default_user_id),
    ('CSIS', 'Digital Transformation', 'AI Solutions implementation', '2025-10-08', 'Torie Baker', 'Proposal submitted on Wednesday,October 8th. Awaiting next steps', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('DCT Abu Dhabi', 'Brand and Campaign', NULL, '2025-05-31', 'Karen Piper', 'BAFO resent, awaiting next steps', 'Pending Decision', 'Craig Elimeliah,David Drayer,John Figlestaler,Zack Botos', NULL, 3, default_user_id),
    ('Edward Jones', 'Digital Transformation', 'Online Access Transformation', '2025-10-13', 'Pat McQueen', 'RFI submitted last week Monday, October 13th. Next steps expected within the coming weeks', 'In Progress', NULL, NULL, 2, default_user_id),
    ('Elastic', NULL, NULL, NULL, 'Harris Baum', 'pending next steps', 'Pending Decision', NULL, NULL, 3, default_user_id),
    ('eMed', 'Consulting', NULL, NULL, 'Christine Clark', 'Retained Product/Marketing Team', 'Long Lead', NULL, NULL, 2, default_user_id),
    ('Empower Pharmacy', 'Platform Work', 'Website redesign', '2025-10-24', 'Jess Volodarsky', 'Submission today with refined, more efficient approach', 'In Progress', NULL, NULL, 2, default_user_id),
    ('Federal Data Usage', 'Platform Work', NULL, '2025-07-10', NULL, 'awaiting next steps, still in evaluation as of 8/1', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('FINRA', 'Platform Work', 'App', '2025-07-10', 'Pat McQueen', 'Pending next steps via Pat', 'Pending Decision', 'Alex Marmosky,David Dodson', NULL, 2, default_user_id),
    ('Goat Foods', 'Platform Work', NULL, '2025-09-12', 'Pat McQueen', 'Meeting with client last week Friday, September 12th, awaiting more clarity on budget ', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('Hanes Brands', 'Innovation', 'AI Enabled Content/Image Generation', '2025-07-23', 'Peter Steiner', 'Final presentations took place on Thursday July 31st, Team regrouping today to work on proactive follow ups', 'Pending Decision', 'David Dicamillo,Ava Council,Saul Kohn,Josh Wolf,Erin Henry,Paul Curry,Fukkushi Sato,Mackenzie Keck', NULL, 2, default_user_id),
    ('HHS', 'Platform Work', 'Website', '2025-07-01', 'Zack Botos', 'Pricing submitted for Fors Marsh bid, exploring owning development in Stagwell bid', 'Pending Decision', NULL, NULL, 0, default_user_id),
    ('Kargo', NULL, NULL, '2025-05-09', 'Harris Baum', 'RFP submitted 5/9, awaiting next steps following submission ', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('KNOWiNK', NULL, 'UX design for Election platform', NULL, 'Kenton Jacobsen', 'Clients to regroup internally and to follow up with a preference of where to start', 'In Progress', NULL, NULL, 2, default_user_id),
    ('LIV', 'Consulting', NULL, '2025-09-18', NULL, 'proposal delivered yesterday, 9/18, , awaiting  next steps', 'Pending Decision', NULL, NULL, 3, default_user_id),
    ('Mazda', NULL, NULL, NULL, NULL, 'pending next steps', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('MLS', 'Platform Work', 'Taxonomy and Meta to select a DAM, then into phase 2/3', '2025-10-07', NULL, 'submitted, Pending next steps', 'Pending Decision', NULL, NULL, 3, default_user_id),
    ('Modelez', 'Innovation', 'Agentic Commerce / Ecom', '2025-08-12', 'Craig Elimeliah', 'Client regroup at 9am EST on Thursday 10/23', 'Long Lead', 'Karen Piper,David Dicamillo,Julian Alexander', NULL, 2, default_user_id),
    ('National Review', 'Platform Work', 'website design and development', '2025-10-24', 'Arjun Kalyanpur', 'Proposal going out today, budget approved', 'In Progress', NULL, NULL, 2, default_user_id),
    ('Newsweek', NULL, NULL, '2025-07-01', NULL, 'pending next steps', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('Novo Nordisk', 'EXT', NULL, '2025-09-30', 'Adriana Rubio', 'Pending reschedule ', 'In Progress', NULL, NULL, 2, default_user_id),
    ('NY State Student Aid', 'Platform Work', 'Student Aid Portal redesign and redevelopment', '2025-09-13', 'Alex Marmosky', 'Proposal due date pushed back to 9/10, questions to be returned on 8/13', 'In Progress', 'Torie Baker', NULL, 2, default_user_id),
    ('Opry Entertainment Group', 'Digital Transformation', 'Define/roadmapping', '2025-10-15', 'Karen Piper', 'Proposal delivered 10/17, awaiting next steps', 'Pending Decision', 'Karen Piper,Christine Clark', NULL, 3, default_user_id),
    ('OTC', NULL, NULL, '2025-07-01', NULL, 'Currently on hold pending move to Shopify', 'Pending Decision', NULL, NULL, 3, default_user_id),
    ('Pepsico', 'EXT', NULL, '2025-10-31', 'Adriana Rubio', '- Fully active and racing
  - Fully active and racing
  - Rana brought valuable SaaS negotiation expertise
  - Potential to show value through better vendor deal negotiations
  - May engage Gartner contacts for negotiation specialists
-', 'In Progress', NULL, NULL, 2, default_user_id),
    ('PwC', 'Platform Work', 'Microsite Support', NULL, 'Pat McQueen', 'TBD/Pending', 'Long Lead', 'Hannah Dow,Karen Piper,Brent Buntin', NULL, 2, default_user_id),
    ('Recreation.gov', 'Platform Work', 'Website redesign and redevelopment', NULL, 'Pat McQueen', 'Movement expected next week', 'Pending Decision', NULL, NULL, 1, default_user_id),
    ('Scout Motors', 'Digital Transformation', 'Full app refresh, design system, websites etc.', NULL, NULL, 'Harris meeting this week', 'Long Lead', NULL, NULL, 2, default_user_id),
    ('SGS (Suntory Global Spirits)', NULL, NULL, '2025-09-28', 'Karen Piper', 'Tissue session tentatively scheduled for Monday, November 3rd. Final RFP presentation to take place Monday, November 17th in Chicago.', 'In Progress', NULL, NULL, 3, default_user_id),
    ('Shell', 'Digital Transformation', NULL, '2025-10-14', 'Karen Piper', 'Presentation on 10/14 around B2B, pending next steps', 'Pending Decision', NULL, NULL, 3, default_user_id),
    ('Space Camp', 'EXT', 'DAM Implementation', '2025-10-01', 'Adriana Rubio', 'Proposal sent 10/1, awaiting next steps', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('Statecraft', 'Digital Transformation', 'Tech and data strategy, branding', '2025-10-13', 'Zack Botos', '- Budget approved by Christine, submitting today', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('Target', 'EXT', NULL, NULL, NULL, 'RFP expected Monday, going direct to EXT', 'In Progress', NULL, NULL, 2, default_user_id),
    ('UBS', 'Brand', 'AI Personas and Testing', '2025-10-15', 'Karen Piper', '- $200K project bypassing procurement
- AI Personas + testing platform needed
- Zack has existing Apple demo platform to leverage
- Proposal in progress, brief pending from Brent', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('United Airlines', 'Platform Work', 'In flight entertainment UX design', '2025-07-01', NULL, 'pending advancement following RFI submission', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('United Airlines', 'Brand Strategy and Campaign Platform', 'Building AI Personas', NULL, 'Karen Piper', 'sent proposal ranges 8/28, Brent setting followup meeting', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('Universal Music Group', 'Platform Work', NULL, NULL, 'Harris Baum', 'Soft verbal confirmation, awaiting procurement/finance confirmation early next week', 'Long Lead', NULL, NULL, 2, default_user_id),
    ('VeraData', 'Platform Work', ' Agentic AI Fundraising Platform', '2025-09-23', 'Arjun Kalyanpur', 'Follow-up questions submitted on 10/16,  Pending next steps', 'Pending Decision', NULL, NULL, 2, default_user_id),
    ('Visa', 'Strategy', 'Reinventing Thought Leadership', '2025-06-18', 'Karen Piper', '2 proposals to be delivered following worksession, pending next steps', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('Visa', 'Innovation', 'Content Supply Chain', '2025-07-01', 'Adriana Rubio', '2 proposals to be delivered following worksession, pending next steps', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('Visa', 'Strategy', 'Journey Mapping and Opportunities', '2025-06-18', 'Karen Piper', '2 proposals to be delivered following worksession, pending next steps', 'Long Lead', NULL, NULL, 3, default_user_id),
    ('Visit California', 'Brand and Campaign', 'IAT pitch to reimagine Visit California''s marketing', '2025-12-16', 'Karen Piper', NULL, 'In Progress', NULL, NULL, 1, default_user_id),
    ('Visit Dubai', NULL, 'Personalization Strategy', '2025-07-01', NULL, 'Dia chasing clients for next steps ', 'Pending Decision', NULL, NULL, 3, default_user_id),
    ('Washington Spirit', 'Brand and Campaign', 'Branding', NULL, 'Karen Piper', 'Pending an RFP from the clients ASAP', 'Long Lead', NULL, NULL, 2, default_user_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Pipeline projects imported successfully';
END $$;


