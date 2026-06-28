-- Developmental milestones (0-5 years) — a separate reference dataset from
-- the EYLF outcomes table. EYLF outcomes are curriculum DISPOSITIONS with
-- deliberately no expected ages; developmental milestones are AGE-INDEXED
-- physical/language/social/cognitive benchmarks, used here to help educators
-- gauge typical development and target generation at a specific skill - not
-- a diagnostic tool. Seeded (not user-writable), same RLS pattern as
-- eylf_outcomes.
--
-- Sourced and cross-checked from real Australian health-system content:
-- Sydney Children's Hospitals Network "Kids Health Hub" (0-12 months,
-- domain-by-domain), kernhealth.com.au's age-by-age summary (2 months-5
-- years), and cross-referenced against healthdirect.gov.au's milestone red
-- flags. Every source's own caveat applies and is repeated in the app:
-- children develop at their own pace - these are general guides, not a
-- screening/diagnostic tool.
create table public.developmental_milestones (
  id uuid primary key default gen_random_uuid(),
  age_band text not null,
  age_band_order int not null,
  domain text not null check (domain in ('gross_motor','fine_motor','language','social_emotional','cognitive')),
  milestone_text text not null,
  created_at timestamptz not null default now()
);

create index developmental_milestones_age_band_order_idx on public.developmental_milestones (age_band_order);

alter table public.developmental_milestones enable row level security;

create policy "Authenticated users can read developmental milestones"
  on public.developmental_milestones for select
  to authenticated
  using (true);

insert into public.developmental_milestones (age_band, age_band_order, domain, milestone_text) values
-- 0-3 months
('0-3 months', 1, 'gross_motor', 'Turns head side to side when lying on tummy'),
('0-3 months', 1, 'gross_motor', 'Lifts head and chest briefly during tummy time'),
('0-3 months', 1, 'gross_motor', 'Kicks and stretches legs with excitement'),
('0-3 months', 1, 'fine_motor', 'Clenches fists with fingers wrapped around thumb'),
('0-3 months', 1, 'fine_motor', 'Shows a palmar grasp reflex when palm is touched'),
('0-3 months', 1, 'language', 'Coos and gurgles'),
('0-3 months', 1, 'language', 'Recognises familiar voices'),
('0-3 months', 1, 'social_emotional', 'Smiles when recognising familiar faces'),
('0-3 months', 1, 'social_emotional', 'Calms when held or spoken to'),
('0-3 months', 1, 'cognitive', 'Watches faces and follows moving objects with their eyes'),

-- 4-7 months
('4-7 months', 2, 'gross_motor', 'Holds head steady'),
('4-7 months', 2, 'gross_motor', 'Rolls from back to tummy and tummy to back'),
('4-7 months', 2, 'gross_motor', 'Sits with hand support, moving toward sitting without support'),
('4-7 months', 2, 'fine_motor', 'Grasps and handles toys, passing them between hands'),
('4-7 months', 2, 'fine_motor', 'Uses a raking motion to bring objects closer'),
('4-7 months', 2, 'language', 'Babbles (e.g. "muh-muh", "bah-bah") and attempts to imitate sounds'),
('4-7 months', 2, 'language', 'Responds to their own name by looking or babbling'),
('4-7 months', 2, 'social_emotional', 'Smiles and laughs independently'),
('4-7 months', 2, 'social_emotional', 'Makes intentional eye contact to engage caregivers'),
('4-7 months', 2, 'cognitive', 'Finds partially hidden objects; enjoys peekaboo'),

-- 8-12 months
('8-12 months', 3, 'gross_motor', 'Sits independently without support'),
('8-12 months', 3, 'gross_motor', 'Crawls, pulls to stand, and cruises along furniture'),
('8-12 months', 3, 'gross_motor', 'Takes first independent steps'),
('8-12 months', 3, 'fine_motor', 'Develops a pincer grasp using thumb and forefinger'),
('8-12 months', 3, 'fine_motor', 'Points at objects; drops or throws objects purposefully'),
('8-12 months', 3, 'language', 'Says first words such as "mama" or "dada"'),
('8-12 months', 3, 'language', 'Understands simple familiar words (e.g. milk, bye-bye)'),
('8-12 months', 3, 'social_emotional', 'May show shyness or wariness of unfamiliar people'),
('8-12 months', 3, 'social_emotional', 'Responds to their own name; notices when a caregiver leaves the room'),
('8-12 months', 3, 'cognitive', 'Explores cause-and-effect (e.g. drops an object to watch it fall)'),
('8-12 months', 3, 'cognitive', 'Explores latches, hinges, and drawers'),

-- 1-2 years
('1-2 years', 4, 'gross_motor', 'Walks independently, often with a wide stance'),
('1-2 years', 4, 'gross_motor', 'Begins to run and climb'),
('1-2 years', 4, 'fine_motor', 'Drinks from a cup; stacks a couple of blocks'),
('1-2 years', 4, 'fine_motor', 'Scribbles with a crayon'),
('1-2 years', 4, 'language', 'Says around 15 or more words by 18 months'),
('1-2 years', 4, 'language', 'Begins combining two words into short phrases (e.g. "more milk") by age 2'),
('1-2 years', 4, 'social_emotional', 'Engages in parallel play alongside other children'),
('1-2 years', 4, 'social_emotional', 'Enjoys imitating others, especially in language and actions'),
('1-2 years', 4, 'cognitive', 'Identifies their own body parts'),
('1-2 years', 4, 'cognitive', 'Follows simple one-step instructions; begins pretend play'),

-- 2-3 years
('2-3 years', 5, 'gross_motor', 'Runs and jumps with increasing coordination'),
('2-3 years', 5, 'gross_motor', 'Walks, climbs, and kicks a ball'),
('2-3 years', 5, 'fine_motor', 'Turns pages of a book one at a time'),
('2-3 years', 5, 'fine_motor', 'Builds a small tower of blocks'),
('2-3 years', 5, 'language', 'Speaks in 2-3 word sentences'),
('2-3 years', 5, 'language', 'Follows simple two-step instructions'),
('2-3 years', 5, 'social_emotional', 'Shows interest in playing alongside or with other children, though turn-taking is still developing'),
('2-3 years', 5, 'social_emotional', 'Shows a wider range of emotions'),
('2-3 years', 5, 'cognitive', 'Sorts objects by shape or colour'),
('2-3 years', 5, 'cognitive', 'Engages in pretend play with growing detail'),

-- 3-4 years
('3-4 years', 6, 'gross_motor', 'Climbs well; hops on one foot; rides a tricycle'),
('3-4 years', 6, 'gross_motor', 'Walks upstairs alone, alternating feet'),
('3-4 years', 6, 'fine_motor', 'Uses a spoon and fork effectively'),
('3-4 years', 6, 'fine_motor', 'Draws a circle when shown how'),
('3-4 years', 6, 'language', 'Speaks in multi-word sentences and starts asking "what", "where", "why" questions'),
('3-4 years', 6, 'language', 'Tells simple stories'),
('3-4 years', 6, 'social_emotional', 'Plays cooperatively in simple games with other children'),
('3-4 years', 6, 'social_emotional', 'Shows interest in toilet learning'),
('3-4 years', 6, 'cognitive', 'Names some colours'),
('3-4 years', 6, 'cognitive', 'Understands simple counting concepts'),

-- 4-5 years
('4-5 years', 7, 'gross_motor', 'Skips, hops, and catches a ball with both hands'),
('4-5 years', 7, 'gross_motor', 'Walks or runs up and down stairs one foot per step'),
('4-5 years', 7, 'fine_motor', 'Draws a person and basic shapes; starts to write their own name'),
('4-5 years', 7, 'fine_motor', 'Begins dressing independently; learning to use scissors'),
('4-5 years', 7, 'language', 'Uses longer, more complex sentences and recalls/retells recent events'),
('4-5 years', 7, 'language', 'States their full name and basic personal details (e.g. age, address)'),
('4-5 years', 7, 'social_emotional', 'Gets along well with new people and peers; shows empathy'),
('4-5 years', 7, 'social_emotional', 'Engages in cooperative, rule-based play'),
('4-5 years', 7, 'cognitive', 'Names friends and recalls events from the previous day'),
('4-5 years', 7, 'cognitive', 'Begins to understand time concepts like today and tomorrow');
