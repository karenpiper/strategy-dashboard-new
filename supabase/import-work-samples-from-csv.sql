-- Import Work Samples from CSV
-- This script imports all work samples from the provided CSV file
-- Note: author_id and created_by are set to a default user ID (first user in profiles table)
-- You can update these later with specific user IDs if needed

-- Helper function to extract thumbnail URL from Airtable format
-- Format: "filename (https://url)" -> extract URL
CREATE OR REPLACE FUNCTION extract_thumbnail_url(thumbnail_text TEXT)
RETURNS TEXT AS $$
DECLARE
  url_match TEXT;
BEGIN
  IF thumbnail_text IS NULL OR thumbnail_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Extract URL from parentheses: "filename (https://url)" -> "https://url"
  -- Look for pattern: (https://...) and remove the parentheses
  url_match := (regexp_match(thumbnail_text, '\(https?://[^)]+\)'))[1];
  IF url_match IS NOT NULL THEN
    -- Remove the parentheses
    RETURN substring(url_match from 2 for length(url_match) - 2);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get first author from comma-separated list
CREATE OR REPLACE FUNCTION get_first_author(authors_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF authors_text IS NULL OR authors_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Split by comma and get first name, trim whitespace
  RETURN TRIM(SPLIT_PART(authors_text, ',', 1));
END;
$$ LANGUAGE plpgsql;

-- Get a default user ID for created_by and author_id
-- This uses the first user in the profiles table, or you can replace with a specific user ID
DO $$
DECLARE
  default_user_id UUID;
  type_id_map RECORD;
  author_id_map RECORD;
  work_sample_record RECORD;
BEGIN
  -- Get the first user from profiles table
  SELECT id INTO default_user_id FROM public.profiles LIMIT 1;
  
  -- If no users exist, raise an error
  IF default_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in profiles table. Please create a user profile first.';
  END IF;

  -- Insert all work samples
  INSERT INTO public.work_samples (
    project_name,
    description,
    type_id,
    client,
    author_id,
    date,
    created_by,
    thumbnail_url,
    file_url,
    file_name
  ) VALUES
  (
    '5.11 Pitch',
    'Pitch presentation for 5.11 brand transformation',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    '5.11',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Jonny Hawton%' LIMIT 1), default_user_id),
    '2025-07-28'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-07-28 at 6.49.36 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/Yh4yxSAhdaiAvsKrRiTKVw/gyQ_mz0hOm-oXkPDOxE50pZ-o4opa0VSZhR_uD3T1g4cbrH4-mr0mlmCqKPvUmfLkH3H6SEe03B1LL38VhgG7_wlARmIyZKIqkB-Kf33ki6DbVKuHcwSq2GfBoNEQxV9HKZ8qnXWPCd5zLI5HufnbacVUiEPFOVQ_xUV4DQEuXW40FETm1EEbTgyu6zDN7bO/pOeol9FSthxUeB2BH6W1bRRB4kgl5HL_0oY0jrsEuGA)'),
    'https://drive.google.com/file/d/1fs5eJpHH_9qeC2mivYJMfKPucfw8YvPr/view?usp=drive_link',
    'Screenshot 2025-07-28 at 6.49.36 PM.png'
  ),
  (
    'Prompt to Table',
    'A brand action strategy that is simpel but smart to provide an ownable audience insight to play of of for an idea the client wanted to explore',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'Chipotle',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Marcos Alonso%' LIMIT 1), default_user_id),
    '2025-07-28'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-07-28 at 6.50.10 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/YjLP5uA-Ciw7kZ4a4uro3w/szdqz9RcgxOTdmdfrSn8CiVXSfhIMV8X4hB-cLvLoDef7iXYqNL3tCSEf0SgQo-6nXxPK-i4WtBFh1Nt8dxqIKM0SNjPyFsb7v7M3unRq7zF-SDbC6cfzI0BiD7J5PZ5VQIqcaMp9nZwdv9ruamEwRSKx7-nnC7rUSifEQwp3ucyjcq211wuhuMWPnVysaQA/3SMbNN0KyjihZSXDhumsnmYW6jUneD3u9HhGqFbC_Jg)'),
    'https://drive.google.com/file/d/1xHrdVYAsRzrGr7MuhdToQoE4RIx2SE8p/view?usp=drive_link',
    'Screenshot 2025-07-28 at 6.50.10 PM.png'
  ),
  (
    'Win Ohio Campaign',
    'Launching the brand in Ohio as a new market with limited awareness, equity and budget (including AI persona work)',
    (SELECT id FROM public.work_sample_types WHERE name = 'Campaign' LIMIT 1),
    'Tipico',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-07-28'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-07-28 at 6.50.39 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/rdjrLmM8nEdiIDsvEF2__w/GsI-MCKX8uAfl5uRk6lz7hYnC7kY_jIab9WtbVDKHXRzi83e-u0Gb4uYCoPcSFg0_rXv3CmrKj8lcdOcKQQXzk2LDLHDQLxr3M5PXvitssCetqO3_oNr1sEiOR5ZL70wV-JYFk4kcsIEA59ikiQUrfRULE48W9Bzdw_fd-11tXsKXOAA40zS9AeP_qR_Y4TZ/4Y4REpc7WdR0aypsozM1XIxgFrVhUjpJfEZTZL180bk)'),
    'https://drive.google.com/file/d/1IiTMx68IPgsS5Nb0dozk4qL6vhfaF646/view?usp=drive_link',
    'Screenshot 2025-07-28 at 6.50.39 PM.png'
  ),
  (
    'Sixth Street Pitch',
    'Great verticalized brand/product combo...and a winner!',
    (SELECT id FROM public.work_sample_types WHERE name = 'Brand' LIMIT 1),
    'Sixth Street',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-08-26'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-08-28 at 1.07.43 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/VBjnmHML1tW5SZSgnaKEWg/UU0hqGsGrZo2I0952p-nTLJ0nMWMUJ4fi93f0wnRRisv3mFbglHXW_t8-yy3g_1wAK0Y5nlUtrV5V5QWvCLdVguXiFoPzF7PaHHJK5qXnUObnKhhHdFkc_A1mZnfdhvtR9it-7reJpj7wg3xLX8-iTP6o6sW559erhsCnuxOLReA8qx4-k6ItCyStr4ailp3/EskSoQ3vqavFB-t94ASEg1YYPBQtZTQ-4BnFhLpoMnM)'),
    'https://drive.google.com/file/d/1NZuVpx0mgHIp_eOsirm53rCtNVKRde4e/view?usp=drive_link',
    'Screenshot 2025-08-28 at 1.07.43 PM.png'
  ),
  (
    'United Airlines AI Personas',
    'Initial meeting about AI personas -- our approach and perspective and how to get ''er done.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'United Airlines',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-08-28'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-08-28 at 1.05.44 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/k4nJ0AdOErZ7_PVBHgqjbw/lsUYSKKRFZmCt56HonQupKJs521B-gS8YhEJPSFtxd0ZuHZOS65SOGjo52r0RppopDjC06ogtjP-UDDiWlVVVWNCZAV8SgWcm4YhvPDBFDV5crQaMS7y5S8FPQZwWbKHh8pWEMSiQA7p22FTDX8rkvz3rdmmQo_H6SjYQiTvWcgzKusaE5djWrHPnyUmeE4r/C7f_OiJQQGne_2oz-UqUU1XvK83uXRYt-jXnErFiovk)'),
    'https://drive.google.com/file/d/12lRaoRubCagR02c5BHnJcNcxrXMWF02h/view?usp=drive_link',
    'Screenshot 2025-08-28 at 1.05.44 PM.png'
  ),
  (
    'BCG Campaign RFP',
    'BCG is running a brand campaign with their new brand refresh to navigate a wildly homogenous category and define their distinction within it. We had 1 week to develop strategy and 3 concepts.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'BCG',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-09-02'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-02 at 9.27.23 AM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/0AmEizXa40SDmFtoYkgFQw/CN15PfagOFCKxOk-X7j6Cu89dRfYW3jF734JuuGKUR35lpTx1qPyhQx2kW6CtKdK9Uwu4ffboBUXRrCoZ04-7isNRZRQbkt1n1JLDuzyzuGwxDLRS4gxI7agwPaB-5c6a0Leh3M6D_8sknmTQ0nxbfQJfgWI_gBaJ7Gkb374pYWi4KCx4bwGEtPOR0ExPe3E/NxhJ5FWLhlzDLLXNNtPc9x1DlJk-KLU2j6kJhvdWPks)'),
    'https://drive.google.com/file/d/1rDbyed6IIwTI1_bBlaf-YsUkDN0INltK/view?usp=drive_link',
    'Screenshot 2025-09-02 at 9.27.23 AM.png'
  ),
  (
    'Aspen Institute 75th Anniversary',
    'The NGO wanted to celebrate it''s 75th year with a series of activations and a big idea that could contain multitudes. We didn''t end up winning, but no one did. They had a change of leadership after we were deep into refinements, but the work is beautiful.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'Aspen Institude',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2023-05-31'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-04 at 11.36.47 AM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/DkP80sneXeSJOtBm5E5deQ/LxhrXZn8H7AH_FODC0lYAhq2rOoOkW17VHZxfJzzEdkTyHgUwoL1CNXM4R-2DV6CPfvdXyTZ8suVtmFeKt2ZKXCfLCZdm1OEBSkvbKYsoS7iAkB4OzoC-9s7iY90IQeIL4lcyNmbJqWdx8tS8VnJdI34BkVwOyh-yF5bNVef-3UuO1B4P7kKO4boENdlYeHV/MrNZU7KPv0aX68U4O-H9opk0heX38WS7MnYG718ZDlg)'),
    'https://drive.google.com/file/d/1wjraP0Ke3ch8wwKQzIqZTo3YG__EJvpN/view?usp=drive_link',
    'Screenshot 2025-09-04 at 11.36.47 AM.png'
  ),
  (
    'CNBC+ DTC Strategy',
    'Helping CNBC senior leadership 1) figure out the right approach to their subscription product portfolio and 2) how to enhance one of the offerings, CNBC+, from linear on digital to full-fledged digital app worth paying for.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Strategy' LIMIT 1),
    'CNBC',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Arjun Kalyanpur%' LIMIT 1), default_user_id),
    '2025-09-04'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-04 at 12.37.59 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/bGOUWmdmo2yC3hbsvdPXlA/amur5yovCG63HqZ32N2vzaeRtcbhp9Wlf0bEKcqxkzK9qHdB1MMGpcq8gbVWSYtE8eSyTZfQWYePLLyBrGOB3G46R_PUSJDoLptIh4LXjyeL4IxM0_0Er7tg336vxYGtV9Nu92c3hqbNxoy86Y9Cp6oyNc7oyEA6f2cGTsYgelmKxDWnIw7S8dAmHnegO3Fb/kK5N-EEg_BnFaZLRwo8NFQtxHVhJvQ7oPcaK9DNnalI)'),
    'https://drive.google.com/file/d/12h48gnLLBfnKuwV4P62hPA8pSN7SlRk-/view?usp=drive_link',
    'Screenshot 2025-09-04 at 12.37.59 PM.png'
  ),
  (
    'Karma Brand Strategy & Visual Identity',
    'We fast-tracked a brand strategy for Karma, to ground their startup in strong self-concept and to set a path forward for the business. Elements include a walk-up that answers, "why now?" for Karma, a brand strategy incl. positioning, and a brief visual identity with mockups designed by Rima Massasati. This has direct and immediate implications upon building out the rest of the pilot product.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Brand' LIMIT 1),
    'Karma',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Yenteen Hu%' LIMIT 1), default_user_id),
    '2025-09-04'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-04 at 4.03.03 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/WlFmZi2nHiYJ58NAYEpVTw/tvRcp_tv7DpCwB_aUGeyuj39YT8hdPyM6XsDTChZzi0jpwRdsuwJSzmxlLO1_Oyc8-BVpDbEtDF5a_2gcilGmtnDZowTeVZ2Lp9gpXtY8WwWaZdGE7X1ZCqmSfzkMIVcUXiLSgF7lhQt_veFyqbJ5BBI9fvydmUpOdHRLqeabVhL-v6PUrC0VZJ9FTTMF6tj/VhiSiDjKdIyF6SCc1ZhiHyR0vZG1CItrAsdMwSG8ya8)'),
    'https://drive.google.com/file/d/1JV9AkDiYEcK_eHTkgPGP_Geno_2fsXHy/view?usp=drive_link',
    'Screenshot 2025-09-04 at 4.03.03 PM.png'
  ),
  (
    'Discord Ads Brand Positioning',
    'Discord recently launched their Ad platform (Quests) and is looking for a partner to help position it in the market. This initial proposal is for the research and positioning sprint that would lead into a strategy stream, and eventually a go to market.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Brand' LIMIT 1),
    'Discord',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-09-06'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-05 at 7.13.22 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/nFo8Wv5Sw9wvGdovL4MkHw/D4JqRcBoUvL-WzGzcV7ae7xO01X9SXm67iE7PKt5U_wMv8Ew7YIU4o4atxDoPPSwlF0IOzMoIb89H2NJBDWi9_PhlWl7DEHFCmvGI80gGM3WS3-LRi5s9ghdNj_d6LTKTkQrSQSb7wslIfIu_-xcy6DFvtrc-laGC2h02VJLbu7heCZRCiO0OJZY2oXGaRTT/L2A68ID5ETL-p0fWVAsHagKEf1Ntvvuqc7eGCtQPbqE)'),
    'https://drive.google.com/file/d/1Syy5Nze5sInKGiPWMKKuROX8QdAJorUg/view?usp=drive_link',
    'Screenshot 2025-09-05 at 7.13.22 PM.png'
  ),
  (
    'M365 Campaign Brief',
    'Briefing doc for the M365 growth campaign for their agentic tool Researcher',
    (SELECT id FROM public.work_sample_types WHERE name = 'Campaign' LIMIT 1),
    'Microsoft',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Adam Kauder%' LIMIT 1), default_user_id),
    '2025-09-08'::DATE,
    default_user_id,
    extract_thumbnail_url('maxresdefault.jpg (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/cvCgD-GL7aOYrRpUBCSeNw/wG1yoNjss3bLiHK88bmiGKXlfRGmeoCeSVm8YRoD4Ws2jp6NEJEfL4r_O2fMgUBmhORKPc1iAoDQTh5BFWSyyTQG2lnqZtBJYlQ3b_gtJjKosPvbtusWDNdD9mSH8OStpsIVhwSHTsXJC0TYaeHzZLzfc9OzOSkr5PWBpDJTqjg/sr1Tv_IAJyLjXYf3p_wuGEtuMw4tAGdsacvvoJE17FY)'),
    'https://drive.google.com/file/d/1BANEoV-_-f033V8pZasPZcTQZDIl5HSz/view?usp=drivesdk',
    'maxresdefault.jpg'
  ),
  (
    'DoorDash Ads RFP',
    'DoorDash Ads is working to cut out a slide of the RMN landscape with a unique offering -- they asked us for positioning and a campaign.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'DoorDash',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-09-09'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-08 at 7.02.45 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/Ivq9xd83_pe8gKvT91hJZg/C4lm7igK3Ghg0hZWkjRCADf_s95JOvqZN8dyI9t33B4byIpcU-LAUBUMtPgFlnvLilCaLof_AxtegYzpJCWHtgxsTzMya73ZL4xsijOK1vJLxDO1pPP62o7H5ewg0Uf-2Yl8KS5Ldc0Dnp1pHJCfBAhcz9rWCje4rcBmsadNgxJj5IOaBpwkgmrbiEwz3s5H/FoODx9Q_YMiwD2GnpW4sVckMRMGfJQ7CVK9Rf3It1J0)'),
    'https://drive.google.com/file/d/1pOBoS9VVB6HCJgicZpS6DQEKT0QP1CGi/view?usp=drive_link',
    'Screenshot 2025-09-08 at 7.02.45 PM.png'
  ),
  (
    'ICF Pitch',
    'Site redesign for a multinational services provider, under a hard $1m cap.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Product' LIMIT 1),
    'ICF',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Pat McQueen%' LIMIT 1), default_user_id),
    '2025-09-16'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-16 at 4.44.50 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/YiduOIL5-Di5W7zTQycw6Q/UvELCfGLGdV8tTEMnZknccrC5fGYdSdYvADKYa1e5-g2DPdxumB9Obt32rIVMOCSpAyvDQV8CZbhZVBfK9b0BxiZhVUhSoXumbkSh-SMsUKA3u7cUvjg4OVqLHeTm-LrTjVJjKYiouPL8LofNyJulE_wPgEXOgMRV5SzJDQUsNpwkLxL9uJ26GECGW8YEeFg/_cYnOlcjivHNNdQto7Dx1OE3r3YAw133t7kUD21w6og)'),
    'https://drive.google.com/file/d/1pInW7CZ7g8yVtL9C5wQBUKAhc6lc1FHv/view?usp=drive_link',
    'Screenshot 2025-09-16 at 4.44.50 PM.png'
  ),
  (
    'Con Edison Peer Utility and Adjacent Brands Audit',
    'We dug into the competitive landscape, studying peers alongside adjacent brands that shape customer expectations. The findings were twofold: utilities leaned on the same tired playbook, but adjacent brands revealed new ways to create impact through clarity, experience, and advocacy. That contrast showed us the path to cut through with a sharper, more ownable platform.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Brand' LIMIT 1),
    'Con Edison',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Marcos Alonso%' LIMIT 1), default_user_id),
    '2025-09-23'::DATE,
    default_user_id,
    extract_thumbnail_url('ConEd Competitive Audit 2025 (1).png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/-gOw8QS8p2FxEgKKCPAI-w/VszC844mAuJ5K0O6QOQOHdGbvTglo6ghguXUI8-lTZuvfFSt5rMb-05Nz-17Vo5hmnIqyD51UueU2mQCFIa6ikOMS-FSRP85EmZuLmKg8mYqHyW7hGpfkvaUYwMJSDwjLLZ9rNciz4heYeyAN0tW3SbpcCzaJYH2vBec5VyjJUZPUp1tdcjOQunF4ErUCmiQ/O213vWjXnnlyAnrp0zpnMJoeMp0NqaAqBcq0rPhn9I8)'),
    'https://drive.google.com/file/d/1QBgVPUPAma48a7NyHRfFIe1ni8Qf2VqH/view?usp=drive_link',
    'ConEd Competitive Audit 2025 (1).png'
  ),
  (
    'Suntory RFI',
    'an RFI presentation for Suntory Global Spirits',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'Suntory',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-09-26'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-25 at 10.38.06 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/DFcEV6mO72-a7TKbZvo5BQ/yvnDEfe_LvrNu_24CwXIq5_WE9zrWwU1U8LfS5jDEpkM8lHqfdJc92z64hNPSISL-rdr4rBW44vbNnHbSsE_Jr8euFVtCLjmwExwDWkW2crauGH2OPNcPSUdKlY986B5Pbf744kHkFtGSIGZk0regPv2ZeYs7EoGzK_NaYUwTLxD8gl3Vdd9mU-nMYP0FUo-/lTYpBe4IinEGcMTA56xyuXD12tt2Wjgt2zW9xFNCUAE)'),
    'https://drive.google.com/file/d/1X5HE2t1FH1L61Na-0vI2NHZkmO4U-aFr/view?usp=drive_link',
    'Screenshot 2025-09-25 at 10.38.06 PM.png'
  ),
  (
    'Carolina Panthers Research',
    'Research project for Carolina Panthers',
    (SELECT id FROM public.work_sample_types WHERE name = 'Research' LIMIT 1),
    'Carolina Panthers',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Grace Zec%' LIMIT 1), default_user_id),
    '2025-09-29'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-09-29 at 9.10.58 AM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/UqHGqvjNFOQYsZtj4awpJA/IMVtlqREXdDjwsxlySFXJObk-lX8X9byJ1nNnwPy7-LNM27olyInCaybCBjIUHFWiSDZwfV2ZUHMsImiRXH2Tw_nK4llzRFPNYbIXvMYx6CS4G-DisDgRBaOONu6lBXZOj8FApvbz7Yna2OwGkaAm1oyg5OpeR1oH0jJGRgL_PIhxe09nFHzoVEZ1C3EBEuN/UgYITlTDkZM8wOCW83a1DdpWzpkw4qGa0KheDXdFIRw)'),
    'https://drive.google.com/file/d/1ScCoBixQxoSZFi6vhU411JwmZwiz3Mq3/view?usp=drive_link',
    'Screenshot 2025-09-29 at 9.10.58 AM.png'
  ),
  (
    'Amtrak App',
    'Reimaginging the Amtrak App. Trains!',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'Amtrak',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Pat McQueen%' LIMIT 1), default_user_id),
    '2025-10-10'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-10-10 at 11.12.13 AM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/MaPbFUvPS4T3X3jVADyuCw/253_Y8PfdfO3u44G6BRGul7BnheokqwSKAhsqDSFwAohF2ZMUD9sPU1j1aioORLtCPhvK2iNUNUAiSUdahEpx6Fa4I8-bAMZ0lWOwbRdcWlZJU8nZd0dD2oSGcRe54NTrr9duQ0mfAMCoCBO2SR2aepXZ6xfpXofCVnhZupeyBjhsumZ-VmHtVqGL4HbLoRd/Vv8ExdPCu8lnAfE0bxMpawAgUibkwvQ89AcyVb4A3mw)'),
    'https://drive.google.com/file/d/1lhlbsslxazXw9Uzy4AZDx9nGLg7-wAgC/view?usp=drive_link',
    'Screenshot 2025-10-10 at 11.12.13 AM.png'
  ),
  (
    'AT&T Synthesis and Mapping',
    'Our post-workshop readout for strategy and opportunities for the brand as we head into EOY',
    (SELECT id FROM public.work_sample_types WHERE name = 'Strategy' LIMIT 1),
    'AT&T',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Adam Kauder%' LIMIT 1), default_user_id),
    '2025-10-10'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-10-10 at 12.53.39 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/1nEwQFd9lx576b20jht7DA/_7NLWXkXz7t0srIkf7QQQUSZ1DteTHUTP-_57dPq7bzQTVY1GfOGn1oC4hl9TvQ6C_vYJbBxAj08EDRUZF53p7_zhoHgwiaGGeTRJA-wsQQE6_ff3TFC30I4kBm3nX66EfPGyFtOxScdkX6CBX_2OZIdvPAjo9FfFEWtmhxr_jtzMRFbHEdYTl7-ZEtkIIsP/jnZgmlUrtqI-CNveBc7DZT-DaiHmgYd6wGFbGGcJF-w)'),
    'https://drive.google.com/file/d/18iwQ3exRv-yexEMRoNSl-Ko64qCMBMB-/view?usp=drive_link',
    'Screenshot 2025-10-10 at 12.53.39 PM.png'
  ),
  (
    'NY Post Research Readout',
    'An enormous research read out for NY Post after a sprint to understand the brand''s white space and opportunities for the California Post launch, and beyond.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Research' LIMIT 1),
    'NY Post',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Laura Casinelli%' LIMIT 1), default_user_id),
    '2025-10-10'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-10-10 at 12.57.44 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/ApTbr-72QWVGaKbiyQ6KgA/afImzAfRYSuBsx9f0nnIOpHE75Zoc8erQ1optzjewrQFcg1qDevoDUbo_CABtWBHsC-p81CYJNsYzoRJrk3TdbBL2ebYiqHpycuU5uGqvgJGXl1CUx4wlfodFBxK-tvtKXnaC0EjpLoFZ_-QjAF0RIUQ0F6XJqEJt-HZ9E2nqlaMz7xmw1NY3EYrfEI4SEv2/q7RlhrmCpmPg9TvEioYrEHkmOAgyq1IYI2t6Cckq1EM)'),
    'https://drive.google.com/file/d/1f7XnTE0-Oq2vniB7N2acfT5cvpFg4Lob/view?usp=drive_link',
    'Screenshot 2025-10-10 at 12.57.44 PM.png'
  ),
  (
    'Flyers App',
    'A reimagining of the hockey team''s app. And Gritty!',
    (SELECT id FROM public.work_sample_types WHERE name = 'Product' LIMIT 1),
    'Philadelphia Flyers',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%John Beadle%' LIMIT 1), default_user_id),
    '2025-10-16'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-10-16 at 9.38.20 AM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/e8KJGuH4FhfDsvGS9csJGQ/f40oT6cq4n4BbjPhVT7bw-iXujxS9GHWc_DamJx86Kc-DnCYu0QJpBEZky1fgZTKn7BczYO5Dbvf3AFMzlm1-dOoLmJp2FTbsZVh97Jy1POCMAMzLO8uJS9SvrDrEpK7cB1JS-Ke4Iuc2rgMyWbAA9Ri8I5R-dFeYJFLKzgUquxZkMdqnk2xMghd1WQecAS/TwhXha-_OPAQowGQIUTngrTQ51P8Fn-VZPolD5Ce7J0)'),
    'https://drive.google.com/file/d/1p8Oxf08DM3Sr3F3mB16HANGJQP8Z4E9C/view?usp=drive_link',
    'Screenshot 2025-10-16 at 9.38.20 AM.png'
  ),
  (
    'AI Personas / Testing',
    'UBS need AI personas for 8 of their HNWI segments, as well as a platform for creative testing... so we invented one!',
    (SELECT id FROM public.work_sample_types WHERE name = 'Strategy' LIMIT 1),
    'UBS',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Karen Piper%' LIMIT 1), default_user_id),
    '2025-10-16'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-10-16 at 3.54.54 PM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/GvHE6A6uuFZOgfqL-fN5gw/ha7pC4RoeorYndP2yfPJNTabnMRmNLW-R1DnPqfeiREMgtN0c3kgeO-HFIN3GBtpHM0fj-NlY7eogjJu2MDD6-l0QpN5NQ-ug46K5PtpRBgxK63HEs2HQ2MAgyf0ufh_CctgLfsoiDDIYUBMCx-lndl7ELcYf4jHcbOtp7ky2zb-FqaWiNwp5j2KmZ7toZY5/duc3gJ_7mDqMj7FZ29-CsGlwujmz4XbWl64C7sUJIBI)'),
    'https://drive.google.com/file/d/1IDeFM2UcD1_bo0pP0VZNFSAtuHL9lH2y/view?usp=drive_link',
    'Screenshot 2025-10-16 at 3.54.54 PM.png'
  ),
  (
    'CX Transformation',
    'Driver Voter Participation for Retail Shareholders',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'Broadridge',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Jonny Hawton%' LIMIT 1), default_user_id),
    '2025-10-24'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-10-24 at 10.52.40 AM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/0yQzcGb3FDa8HhH34O5uCg/UNjj9-PWA9VKCJJir7LQykcjW5iw3dO-skIbIh5ProQabufsd-KTz44BKwiAmnJNLGFfa_bZm18DfwYJzogZWGZiwd-6rweLv0J1zIjtDNCknU3sCUn2bBvgwsqc8U8rsRfMvPMs5k5yFsWaGHdr8YpFK-ZLnXYukFcN3D009G4CwmvHZgMRrfPKz99PyMIz/1K4oAbrnshWaKQ3gSSN98fVqA-PGa2u1IGMVPLRPpRY)'),
    'https://drive.google.com/file/d/1AFK1jq3QWPY2dpZ9o1hRhLHVbrIGI1nf/view?usp=drive_link',
    'Screenshot 2025-10-24 at 10.52.40 AM.png'
  ),
  (
    'Website and Connected Ecosystem',
    'Reinvent the digital experience to be a best in class industry demonstration of excellence.',
    (SELECT id FROM public.work_sample_types WHERE name = 'Pitch' LIMIT 1),
    'Bloomberg Professional Services',
    COALESCE((SELECT id FROM public.profiles WHERE full_name ILIKE '%Arjun Kalyanpur%' LIMIT 1), default_user_id),
    '2025-10-24'::DATE,
    default_user_id,
    extract_thumbnail_url('Screenshot 2025-10-24 at 10.57.29 AM.png (https://v5.airtableusercontent.com/v3/u/47/47/1763798400000/EPMRIbHnl1qh5pEuXdb02g/y74kEWKsG64tDBfx_kf6ibftZXjN1-vCivDKsoUgmNLYqRtsLhQa4UoQ5Je-YcSW-tb9lsNlsaUfQ9dr89L_OOepgeo8sDD68mQwaGR_Sg9d5oKw9nqgNPRDe0BUgGc3Kd1FxL5RZqHnwRMTf0zK9VDeJcGFJrsSY7h-YgVLZZttoZYKH_8EXgX2CdGK8wnR/N96fZ3gZ9wmBae_Df61YoTARri5Vtp-MZaN-FnY3Odw)'),
    'https://drive.google.com/file/d/1MEoMSjsUdZqOcP4xIwFGhdfrPmJJ-Fzd/view?usp=drive_link',
    'Screenshot 2025-10-24 at 10.57.29 AM.png'
  );

END $$;

-- Clean up helper functions (optional - you can keep them if you want)
-- DROP FUNCTION IF EXISTS extract_thumbnail_url(TEXT);
-- DROP FUNCTION IF EXISTS get_first_author(TEXT);

-- After import, you may want to update author_id and created_by with specific user IDs
-- (Currently all records use the first user from the profiles table as default, or match by name)
-- Example:
-- UPDATE work_samples 
-- SET author_id = (SELECT id FROM profiles WHERE full_name = 'Jonny Hawton' LIMIT 1),
--     created_by = (SELECT id FROM profiles WHERE full_name = 'Jonny Hawton' LIMIT 1)
-- WHERE project_name = '5.11 Pitch';

